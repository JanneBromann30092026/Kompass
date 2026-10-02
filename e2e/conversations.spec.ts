import { expect, test, type Page } from '@playwright/test';
import { enableDevMode, nav, openApp, reloadAndUnlock, storageDump } from './vault.ts';

function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(error.message));
  return problems;
}

async function openDemoCustomer(page: Page, firstName: string) {
  await openApp(page);
  await enableDevMode(page);
  await page.goto('./#/dev/ui');
  await page.getByTestId('demo-load').click();
  await expect(page.getByTestId('demo-count')).toHaveText('12');
  await nav(page).getByRole('link', { name: 'Kunden' }).click();
  await page.getByTestId('customer-row').filter({ hasText: firstName }).first().click();
  await expect(page.getByTestId('customer-file')).toBeVisible();
}

/** Safari's speech recognition, mocked: speaks one interim and one final sentence. */
function mockSpeech() {
  class FakeRecognition {
    lang = '';
    continuous = false;
    interimResults = false;
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    start() {
      (window as unknown as { __recognition: FakeRecognition }).__recognition = this;
      setTimeout(() => {
        const result = (transcript: string, isFinal: boolean) =>
          Object.assign([{ transcript }], { isFinal });
        this.onresult?.({
          resultIndex: 0,
          results: Object.assign([result('Übernahme', false)], { length: 1 }),
        });
        this.onresult?.({
          resultIndex: 0,
          results: Object.assign([result('Übernahme ist zugesagt', true)], { length: 1 }),
        });
      }, 100);
    }
    stop() {
      this.onend?.();
    }
    abort() {}
  }
  Object.assign(window, {
    SpeechRecognition: FakeRecognition,
    webkitSpeechRecognition: FakeRecognition,
  });
}

test('preparation shows everything for the conversation on one page', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await openDemoCustomer(page, 'Ben');
  await page.getByTestId('hero-prepare').click();
  const prep = page.getByTestId('preparation');
  await expect(prep).toBeVisible();
  await expect(page.getByTestId('prep-profile')).toContainText('Ausbildung');
  await expect(page.getByTestId('prep-needs').getByTestId('prep-need').first()).toContainText('BU');
  await expect(page.getByTestId('prep-hooks').getByTestId('prep-hook')).toHaveCount(3);
  await expect(page.getByTestId('prep-objections')).toContainText('„');
  await expect(page.getByTestId('prep-open-points')).toContainText('Übernahme');
  await expect(page.getByTestId('prep-reminders')).toContainText('Ausbildungsende');

  // Full screen hides the navigation.
  await page.getByTestId('prep-fullscreen').click();
  await expect(nav(page)).toHaveCount(0);
  await page.getByTestId('prep-fullscreen').click();
  await expect(nav(page)).toHaveCount(1);

  // From the preparation straight to the note.
  await page.getByTestId('prep-record').click();
  await expect(page.getByTestId('conversation-form')).toBeVisible();
  expect(problems).toEqual([]);
});

test('record a conversation with status change and event → new reminder', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await openDemoCustomer(page, 'Ben');
  const file = page.getByTestId('customer-file');
  const annual = () =>
    file
      .getByTestId('file-reminders')
      .getByTestId('reminder-row')
      .filter({ hasText: 'Jahresgespräch' })
      .getByTestId('reminder-due');
  const annualBefore = await annual().textContent();

  await page.getByTestId('hero-record').click();
  const form = page.getByTestId('conversation-form');
  await expect(form).toBeVisible();

  // Saving needs content.
  await page.getByTestId('conversation-save').click();
  await expect(page.getByTestId('conversation-error')).toBeVisible();

  await page.getByRole('button', { name: 'Beratung', exact: true }).click();
  await page.getByTestId('conversation-participants').fill('Ben');
  await page.getByTestId('conversation-discussed').fill('Übernahme zugesagt, BU besprochen.');
  await page.getByTestId('conversation-results').fill('BU abgeschlossen.');
  await page.getByTestId('conversation-nextSteps').fill('Haftpflicht nach Ausbildungsende.');

  // Quick actions: contract status, life event with date, consent.
  await page.getByTestId('contract-chip-bu').click();
  await page.getByRole('menuitem', { name: 'abgeschlossen' }).click();
  await expect(page.getByTestId('contract-chip-bu')).toHaveAttribute('data-status', 'concluded');
  const year = new Date().getFullYear() + 1;
  await page.getByTestId('add-event').click();
  await page.getByTestId('event-kind').selectOption('move');
  await page.getByTestId('event-date').fill(`${year}-03`);
  await page.getByTestId('event-save').click();
  const quickReminders = form.getByTestId('file-reminders');
  await expect(
    quickReminders.getByTestId('reminder-row').filter({ hasText: 'Umzug' }),
  ).toContainText(`01.03.${year}`);
  const consent = page.getByTestId('consent-marketing');
  const consentBefore = (await consent.textContent()) ?? '';
  await page.getByTestId('consent-marketing-toggle').click();
  await expect(consent).not.toHaveText(consentBefore);
  await expect(consent).toContainText(/(erteilt|entzogen) am/);

  // The draft survives locking/reloading.
  await reloadAndUnlock(page);
  await expect(page.getByTestId('conversation-discussed')).toHaveValue(
    'Übernahme zugesagt, BU besprochen.',
  );
  expect((await storageDump(page)).indexedDb).not.toContain('Übernahme zugesagt');

  await page.getByTestId('conversation-save').click();
  await expect(page.getByText('Gespräch gespeichert')).toBeVisible();
  await expect(file).toBeVisible();

  // History of conversations in the file, newest first and expandable.
  const entries = file.getByTestId('file-conversations').getByTestId('conversation-entry');
  await expect(entries.first()).toContainText('Beratung');
  await entries.first().getByRole('button').first().click();
  await expect(entries.first().getByTestId('conversation-details')).toContainText(
    'BU abgeschlossen.',
  );

  // Saving counts as last conversation: the annual review moves to 12 months from today.
  await expect(annual()).toHaveText(/in 36\d Tagen/);
  expect(await annual().textContent()).not.toBe(annualBefore);
  await expect(
    file.getByTestId('history-entry').filter({ hasText: 'Gespräch angelegt' }),
  ).toHaveCount(1);
  expect(problems).toEqual([]);
});

test('edit and delete a conversation', async ({ page }) => {
  await openDemoCustomer(page, 'Leon');
  const entries = page.getByTestId('file-conversations').getByTestId('conversation-entry');
  await expect(entries).toHaveCount(1);
  await entries.first().getByRole('button').first().click();
  await entries.first().getByTestId('conversation-edit').click();
  await expect(page.getByTestId('conversation-title')).toHaveValue('Erstgespräch');
  await page.getByTestId('conversation-openItems').fill('VL beim Arbeitgeber erfragen.');
  await page.getByTestId('conversation-save').click();
  await entries.first().getByRole('button').first().click();
  await expect(entries.first()).toContainText('VL beim Arbeitgeber erfragen.');
  await entries.first().getByTestId('conversation-delete').click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Löschen' }).click();
  await expect(entries).toHaveCount(0);
});

test('dictation with the Web Speech API (mocked)', async ({ page }) => {
  await page.addInitScript(mockSpeech);
  await openDemoCustomer(page, 'Ben');
  await page.getByTestId('hero-record').click();
  await page.getByTestId('conversation-results').fill('BU besprochen.');
  await page.getByTestId('conversation-results').focus();
  await expect(page.getByTestId('dictation-target')).toContainText('Ergebnisse');

  // First use: the note about Apple.
  await page.getByTestId('dictation-button').click();
  await expect(page.getByText('Diktat über Apple')).toBeVisible();
  await page.getByTestId('dictation-notice-confirm').click();
  await expect(page.getByTestId('conversation-results')).toHaveValue(
    'BU besprochen. Übernahme ist zugesagt',
  );
  await expect(page.getByTestId('dictation-button')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('dictation-button').click();
  await expect(page.getByTestId('dictation-button')).toHaveAttribute('aria-pressed', 'false');

  // The note comes only once; the text stays editable.
  await page.getByTestId('conversation-discussed').focus();
  await page.getByTestId('dictation-button').click();
  await expect(page.getByText('Diktat über Apple')).toHaveCount(0);
  await expect(page.getByTestId('conversation-discussed')).toHaveValue('Übernahme ist zugesagt');
  await page.getByTestId('conversation-discussed').fill('Korrigiert');
  await expect(page.getByTestId('conversation-discussed')).toHaveValue('Korrigiert');
});

test('without speech recognition there is no dictation button', async ({ page }) => {
  // Chromium has its own recognition; Safari in some modes has none.
  await page.addInitScript(() => {
    const scope = window as unknown as Record<string, unknown>;
    delete scope.SpeechRecognition;
    delete scope.webkitSpeechRecognition;
  });
  await openDemoCustomer(page, 'Ben');
  await page.getByTestId('hero-record').click();
  await expect(page.getByTestId('conversation-form')).toBeVisible();
  await expect(page.getByTestId('dictation-button')).toHaveCount(0);
  await expect(page.getByText('Mikrofon auf der iPad-Tastatur')).toBeVisible();
});
