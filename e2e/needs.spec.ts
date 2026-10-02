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

/** Loads the demo customers and opens the file of one of them. */
async function openDemoCustomer(page: Page, firstName: string) {
  await openApp(page);
  await enableDevMode(page);
  await page.goto('./#/dev/ui');
  await page.getByTestId('demo-load').click();
  await expect(page.getByTestId('demo-count')).toHaveText('12');
  await nav(page).getByRole('link', { name: 'Kunden' }).click();
  await page.getByTestId('customer-row').filter({ hasText: firstName }).first().click();
  await expect(page.getByTestId('file-needs')).toBeVisible();
}

const card = (page: Page, line: string) => page.getByTestId(`need-card-${line}`);

/** Sets "Arbeitgeber zahlt VL" in the situation editor. */
async function setEmployerVl(page: Page, answer: 'ja' | 'nein') {
  await page
    .getByTestId('file-situation')
    .getByRole('button', { name: /bearbeiten/ })
    .click();
  await page
    .getByRole('radiogroup', { name: 'Arbeitgeber zahlt VL' })
    .getByRole('radio', { name: answer, exact: true })
    .click();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByTestId('section-editor')).toHaveCount(0);
}

test('accept, dismiss, change and reset needs', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await openDemoCustomer(page, 'Ben');

  // Suggestions of the engine: now before later, priority shown, reasons as text.
  const now = page.getByTestId('need-group-now');
  await expect(now.locator('[data-testid^="need-card-"]').first()).toHaveAttribute(
    'data-testid',
    'need-card-bu',
  );
  await expect(card(page, 'bu')).toContainText('Prio 1 · existenziell');
  await expect(card(page, 'bu')).toContainText('Angebot liegt vor');
  await expect(card(page, 'liability')).toHaveAttribute('data-group', 'later');
  await expect(page.getByTestId('need-potential')).toContainText(
    'beeinflusst die Reihenfolge nicht',
  );

  // Accept.
  await card(page, 'accident').getByTestId('need-accept').click();
  await expect(card(page, 'accident')).toHaveAttribute('data-state', 'accepted');
  await expect(card(page, 'accident').getByTestId('need-state')).toHaveText('Übernommen');
  await expect(page.getByText('Unfall: Bedarf übernommen')).toBeVisible();

  // Dismiss: the card moves to the collapsed group "Abgelehnt".
  await card(page, 'fundSavings').getByTestId('need-dismiss').click();
  await expect(card(page, 'fundSavings')).toHaveCount(0);
  await page.getByTestId('need-group-toggle-dismissed').click();
  await expect(card(page, 'fundSavings')).toHaveAttribute('data-state', 'dismissed');

  // Own assessment with an own reason.
  await card(page, 'capitalFormation').getByTestId('need-adjust').click();
  await page.getByTestId('need-editor').getByRole('radio', { name: 'Später', exact: true }).click();
  await page
    .getByTestId('need-editor')
    .getByRole('radio', { name: /^Prio 3/ })
    .click();
  await page.getByTestId('need-reason').fill('Erst nach der Übernahme besprechen');
  await page.getByTestId('need-save').click();
  await expect(card(page, 'capitalFormation')).toHaveAttribute('data-group', 'later');
  await expect(card(page, 'capitalFormation')).toHaveAttribute('data-state', 'adjusted');
  await expect(card(page, 'capitalFormation')).toContainText('Prio 3 · optional');
  await expect(card(page, 'capitalFormation')).toContainText('Erst nach der Übernahme besprechen');

  // Typical objections per product line.
  await card(page, 'bu').getByTestId('need-objections').click();
  await expect(card(page, 'bu').getByTestId('need-objection-list')).toContainText('Zu teuer');

  // Decisions survive a reload and are encrypted.
  await reloadAndUnlock(page);
  await expect(card(page, 'accident')).toHaveAttribute('data-state', 'accepted');
  await expect(card(page, 'capitalFormation')).toHaveAttribute('data-state', 'adjusted');
  expect(await storageDump(page)).not.toContain('Erst nach der Übernahme');

  // Recorded in the history of the file.
  await expect(page.getByTestId('file-history').getByTestId('history-entry').first()).toContainText(
    'Bedarf angelegt',
  );

  // Reset: the suggestion is back.
  await card(page, 'accident').getByTestId('need-reset').click();
  await expect(card(page, 'accident')).toHaveAttribute('data-state', 'suggested');
  expect(problems).toEqual([]);
});

test('changed facts ask to recheck a decision', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await openDemoCustomer(page, 'Ben');

  await card(page, 'capitalFormation').getByTestId('need-accept').click();
  await expect(card(page, 'capitalFormation')).toHaveAttribute('data-state', 'accepted');
  await expect(card(page, 'capitalFormation').getByTestId('need-recheck')).toHaveCount(0);

  // The employer pays no VL after all: the suggestion changes, the decision stays.
  await setEmployerVl(page, 'nein');
  const recheck = card(page, 'capitalFormation').getByTestId('need-recheck');
  await expect(recheck).toContainText('Bedarf neu prüfen');
  await expect(recheck).toContainText('Nicht sinnvoll');
  await expect(card(page, 'capitalFormation')).toHaveAttribute('data-state', 'accepted');
  await expect(card(page, 'capitalFormation')).toContainText('Arbeitgeber zahlt keine VL');

  // Keep the decision: the hint disappears.
  await recheck.getByTestId('need-keep').click();
  await expect(recheck).toHaveCount(0);

  // Facts change again; reassess resets the decision to the new suggestion.
  await setEmployerVl(page, 'ja');
  await expect(recheck).toBeVisible();
  await recheck.getByTestId('need-reassess').click();
  await expect(card(page, 'capitalFormation')).toHaveAttribute('data-state', 'suggested');
  await expect(card(page, 'capitalFormation')).toHaveAttribute('data-group', 'now');
  expect(problems).toEqual([]);
});

test('conversation hooks can be copied', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const problems = collectConsoleProblems(page);
  await openDemoCustomer(page, 'Ben');

  const hooks = page.getByTestId('file-hooks');
  const items = hooks.getByTestId('hook-item');
  const count = await items.count();
  expect(count).toBeGreaterThanOrEqual(3);
  expect(count).toBeLessThanOrEqual(5);
  await expect(items.first()).toContainText('BU');

  const first = (await items.first().getByTestId('hook-text').textContent()) ?? '';
  await items.first().getByTestId('hook-copy').click();
  await expect(page.getByText('Kopiert', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(first);

  await hooks.getByTestId('hooks-copy-all').click();
  await expect(page.getByText(`${count} Aufhänger kopiert`)).toBeVisible();
  const all = await page.evaluate(() => navigator.clipboard.readText());
  expect(all.split('\n\n')).toHaveLength(count);

  // A dismissed need gives no more hooks.
  await card(page, 'bu').getByTestId('need-dismiss').click();
  await expect(hooks.getByTestId('hook-text').first()).not.toContainText('BU liegt noch');
  expect(problems).toEqual([]);
});
