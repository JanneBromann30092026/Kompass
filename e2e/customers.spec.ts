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

const next = (page: Page) => page.getByTestId('wizard-next').click();
const title = (page: Page) => page.getByTestId('wizard-title');
const choose = (page: Page, group: string, option: string) =>
  page
    .getByRole('radiogroup', { name: group })
    .getByRole('radio', { name: option, exact: true })
    .click();

/** Opens the question catalogue with the keyboard shortcut "n". */
async function startWizard(page: Page) {
  await page.keyboard.press('n');
  await expect(page.getByTestId('wizard')).toBeVisible();
  await expect(title(page)).toHaveText('Person');
}

/** Name only, every other question skipped. */
async function quickCustomer(page: Page, firstName: string) {
  await startWizard(page);
  await page.getByTestId('field-firstName').fill(firstName);
  for (let step = 0; step < 9; step += 1) await next(page);
  await page.getByTestId('wizard-create').click();
  await expect(page.getByTestId('customer-file')).toBeVisible();
}

async function loadDemo(page: Page) {
  await enableDevMode(page);
  await page.goto('./#/dev/ui');
  await page.getByTestId('demo-load').click();
  await expect(page.getByTestId('demo-count')).toHaveText('12');
  await nav(page).getByRole('link', { name: 'Kunden' }).click();
  await expect(page.getByTestId('customer-row')).toHaveCount(12);
}

test('question catalogue completely answered', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await openApp(page, '/customers');
  await expect(page.getByText('Noch keine Kunden')).toBeVisible();
  await startWizard(page);

  // Person: name, birth, family, housing and optional contact data.
  await page.getByTestId('field-firstName').fill('Mila');
  await page.getByTestId('field-lastName').fill('Muster');
  await page.getByLabel('Geburtsdatum', { exact: true }).fill('2001-04-12');
  await page.getByLabel('Familienstand').selectOption('single');
  await page.getByLabel('Kinder').fill('0');
  await page.getByLabel(/^Wohnsituation/).selectOption('rent');
  await page.getByTestId('field-phone').fill('0151 2345678');
  await page.getByTestId('field-email').fill('mila@example.com');
  await next(page);

  await expect(title(page)).toHaveText('Beruf');
  await page.getByLabel('Lebensphase').selectOption('careerStart');
  await page.getByTestId('field-occupation').fill('Industriekauffrau');
  // Only asked during training or studies.
  await expect(page.getByText('Übernahme?')).toHaveCount(0);
  await choose(page, 'Arbeitgeber zahlt VL', 'ja');
  await choose(page, 'Arbeitgeber zahlt bAV', 'nein');
  await next(page);

  await expect(title(page)).toHaveText('Finanzen');
  await page.getByLabel('Netto-Einkommen').fill('2100');
  await page.getByLabel('Feste Ausgaben').fill('900');
  await page.getByLabel('Monatlich frei verfügbar').fill('400');
  await page.getByTestId('field-answers-reserves').fill('ja, ca. 3.000 €');
  await next(page);

  await expect(title(page)).toHaveText('Ziele');
  await page.getByTestId('field-answers-goalsShort').fill('Auto');
  await page.getByTestId('field-answers-goalsMid').fill('Weiterbildung');
  await page.getByTestId('field-answers-goalsLong').fill('Eigentum');
  await next(page);

  await expect(title(page)).toHaveText('Bestehende Verträge');
  await page.getByTestId('contract-liability').selectOption('concluded');
  await page.getByTestId('contract-bu').selectOption('offered');
  await next(page);

  await expect(title(page)).toHaveText('Risiken & Hobbys');
  for (const key of ['sport', 'vehicles', 'pets', 'travel']) {
    await page.getByTestId(`field-answers-${key}`).fill('keine');
  }
  await next(page);

  await expect(title(page)).toHaveText('Anlage');
  await page.getByTestId('field-answers-experience').fill('ETF seit 2024');
  await page.getByLabel('Risikobereitschaft').selectOption('balanced');
  await page.getByTestId('field-answers-horizon').fill('10 Jahre');
  await next(page);

  for (const key of ['planMove', 'planJob', 'planPartner', 'planEducation']) {
    await page.getByTestId(`field-answers-${key}`).fill('nein');
  }
  await next(page);

  await expect(title(page)).toHaveText('Kommunikation');
  await page.getByLabel('Bevorzugter Kontaktkanal').selectOption('whatsapp');
  await page.getByTestId('field-answers-bestTime').fill('abends');
  await choose(page, 'Einwilligung Datenspeicherung', 'erteilt');
  await choose(page, 'Werbung / Seminar-Einladung', 'erteilt');
  await next(page);

  await expect(page.getByTestId('wizard-summary')).toContainText('Alle Fragen beantwortet.');
  await page.getByTestId('wizard-create').click();

  const file = page.getByTestId('customer-file');
  await expect(heading(page)).toHaveText('Mila Muster');
  await expect(page.getByTestId('file-hero')).toContainText('K-0001');
  await expect(page.getByTestId('file-contact')).toContainText('+49 151 2345678');
  await expect(page.getByTestId('contact-whatsapp')).toHaveAttribute(
    'href',
    'https://wa.me/491512345678',
  );
  await expect(page.getByTestId('contact-whatsapp')).toHaveAttribute('data-preferred', 'true');
  await expect(page.getByTestId('contact-call')).toHaveAttribute('href', 'tel:+491512345678');
  await expect(page.getByTestId('contract-chip-liability')).toHaveAttribute(
    'data-status',
    'concluded',
  );
  await expect(page.getByTestId('file-open-points')).toContainText('Keine offenen Punkte.');
  await expect(file.getByTestId('file-answers')).toContainText('ETF seit 2024');
  // Automatic reminders (annual review) may follow in the history.
  await expect(page.getByTestId('history-entry').filter({ hasText: 'Akte angelegt' })).toHaveCount(
    1,
  );

  // Nothing readable in the database, the draft is gone.
  const dump = await storageDump(page);
  for (const plaintext of ['Mila', 'Muster', '2345678', 'example.com', 'Industriekauffrau']) {
    expect(dump.indexedDb).not.toContain(plaintext);
  }
  expect(problems).toEqual([]);
});

const heading = (page: Page) => page.getByRole('heading', { level: 1 });

test('skipped questions become open points and settle when answered', async ({ page }) => {
  await openApp(page, '/customers');
  await startWizard(page);
  // The first name is the only required field.
  await next(page);
  await expect(page.getByText('Bitte ausfüllen.')).toBeVisible();
  await page.getByTestId('field-firstName').fill('Ole');
  await next(page);
  await expect(page.getByTestId('wizard-next')).toHaveText('Überspringen');
  for (let step = 1; step < 9; step += 1) await next(page);
  const points = page.getByTestId('wizard-open-points');
  await expect(points).toContainText('Person: Kinder');
  await expect(points).toContainText('Kommunikation: Bevorzugter Kanal und beste Zeit');
  await page.getByTestId('wizard-create').click();

  const openPoints = page.getByTestId('open-points');
  await expect(openPoints).toContainText('Person: Kinder');
  await page.getByTestId('edit-person').click();
  await page.getByTestId('section-editor').getByLabel('Kinder').fill('2');
  await page.getByTestId('section-save').click();
  await expect(page.getByTestId('section-editor')).toHaveCount(0);
  await expect(openPoints).not.toContainText('Person: Kinder');
  await expect(page.getByTestId('file-person')).toContainText('2');

  // The history shows the change (old → new).
  const latest = page.getByTestId('history-entry').filter({ hasText: 'Akte geändert' }).first();
  await expect(latest).toBeVisible();
  await latest.getByRole('button').click();
  await expect(latest).toContainText(/Kinder:\s*– → 2/);
  await expect(latest).toContainText(/Offene Punkte:\s*− Person: Kinder/);

  // Own open points can be added and ticked off.
  await page.getByTestId('open-point-input').fill('Eltern zum Termin einladen');
  await page.getByTestId('open-point-input').press('Enter');
  await expect(openPoints).toContainText('Eltern zum Termin einladen');
  await page.getByRole('button', { name: '„Eltern zum Termin einladen“ erledigt' }).click();
  await expect(openPoints).not.toContainText('Eltern zum Termin einladen');
});

test('the draft survives reloading (encrypted)', async ({ page }) => {
  await openApp(page, '/customers');
  await startWizard(page);
  await page.getByTestId('field-firstName').fill('Entwurfine');
  await next(page);
  await page.getByTestId('field-occupation').fill('Studentin');
  await expect(title(page)).toHaveText('Beruf');
  // Give the encrypted draft a moment to be written.
  await page.waitForTimeout(500);
  const dump = await storageDump(page);
  expect(dump.indexedDb).not.toContain('Entwurfine');

  await reloadAndUnlock(page);
  await expect(page.getByTestId('wizard')).toBeVisible();
  await expect(title(page)).toHaveText('Beruf');
  await expect(page.getByTestId('field-occupation')).toHaveValue('Studentin');
  await page.getByTestId('wizard-back').click();
  await expect(page.getByTestId('field-firstName')).toHaveValue('Entwurfine');

  await page.getByTestId('wizard-cancel').click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Verwerfen' }).click();
  await expect(page.getByText('Noch keine Kunden')).toBeVisible();
  await startWizard(page);
  await expect(page.getByTestId('field-firstName')).toHaveValue('');
});

test('minors need the parents for marketing', async ({ page }) => {
  await openApp(page, '/customers');
  await startWizard(page);
  await page.getByTestId('field-firstName').fill('Jule');
  await page.getByLabel('Geburtsdatum', { exact: true }).fill('2012-06-01');
  for (let step = 0; step < 8; step += 1) await next(page);
  await expect(title(page)).toHaveText('Kommunikation');
  await choose(page, 'Werbung / Seminar-Einladung', 'erteilt');
  await expect(page.getByRole('radiogroup', { name: 'Zustimmung der Eltern' })).toBeVisible();
  await next(page);
  await page.getByTestId('wizard-create').click();
  await expect(title(page)).toHaveText('Kommunikation');
  await expect(page.getByText('Für Werbung braucht es die Zustimmung der Eltern.')).toBeVisible();
  await choose(page, 'Zustimmung der Eltern', 'erteilt');
  await next(page);
  await page.getByTestId('wizard-create').click();
  await expect(page.getByTestId('file-hero')).toContainText('minderjährig');
});

test('search, filters and sorting with the demo customers', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await openApp(page);
  await loadDemo(page);
  const rows = page.getByTestId('customer-row');
  const search = page.getByTestId('customer-search');

  await page.keyboard.press('/');
  await expect(search).toBeFocused();
  await page.keyboard.type('hartm');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Ben Hartmann');
  await search.fill('0000 5550102');
  await expect(rows).toHaveCount(1);
  await search.fill('k-0003');
  await expect(rows.first()).toContainText('K-0003');
  await search.fill('gibtesnicht');
  await expect(page.getByText('Keine Treffer')).toBeVisible();
  await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
  await expect(rows).toHaveCount(12);

  await page.getByTestId('open-filters').click();
  await page.getByRole('switch', { name: 'Nur Minderjährige' }).click();
  await page.getByTestId('filter-done').click();
  await expect(rows).toHaveCount(2);
  await expect(page.getByTestId('customer-count')).toHaveText('2 von 12 Kunden');
  await page.getByRole('button', { name: 'Filter „Nur Minderjährige“ entfernen' }).click();
  await expect(rows).toHaveCount(12);

  await page.getByTestId('open-filters').click();
  await page.getByTestId('filter-product').selectOption('bu');
  await page.getByTestId('filter-sort').selectOption('name');
  await page.getByTestId('filter-done').click();
  await expect(page.getByTestId('active-filters')).toContainText('BU: abgeschlossen');
  const names = await rows.allTextContents();
  expect(names.length).toBeGreaterThan(0);
  expect([...names].sort((a, b) => a.localeCompare(b, 'de'))).toEqual(names);
  expect(problems).toEqual([]);
});

test('contract status, editing with validation, archive and delete', async ({ page }) => {
  await openApp(page);
  await loadDemo(page);
  await page.getByTestId('customer-row').filter({ hasText: 'Ben Hartmann' }).click();
  await expect(heading(page)).toHaveText('Ben Hartmann');

  // Contract chips change the status in one tap (recorded in the history).
  await page.getByTestId('contract-chip-bu').click();
  await page.getByRole('menuitem', { name: 'abgeschlossen' }).click();
  await expect(page.getByTestId('contract-chip-bu')).toHaveAttribute('data-status', 'concluded');
  const latest = page.getByTestId('history-entry').filter({ hasText: 'Vertrag BU' }).first();
  await expect(latest).toBeVisible();
  await latest.getByRole('button').click();
  await expect(latest).toContainText(/Vertrag BU:\s*angeboten → abgeschlossen/);

  // Contact: invalid e-mail is refused, the phone number is normalised.
  await page
    .getByTestId('file-contact')
    .getByRole('button', { name: /bearbeiten/ })
    .click();
  await page.getByTestId('field-email').fill('kein-mail');
  await page.getByTestId('section-save').click();
  await expect(page.getByText('Bitte prüfen – das Format stimmt nicht.')).toBeVisible();
  await page.getByTestId('field-email').fill('ben@example.com');
  await page.getByTestId('field-phone').fill('+49 (0)000/555-0199');
  await page.getByTestId('section-save').click();
  await expect(page.getByTestId('file-contact')).toContainText('+49 000 555 0199');
  await expect(page.getByTestId('contact-email')).toHaveAttribute('href', 'mailto:ben@example.com');

  // Archive instead of delete: hidden from the list, kept in the archive.
  await page.getByRole('button', { name: 'Aktionen', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Archivieren' }).click();
  await expect(page.getByTestId('archived-banner')).toBeVisible();
  await page.getByTestId('file-back').click();
  await expect(page.getByTestId('customer-row')).toHaveCount(11);
  await expect(page.getByTestId('customer-count')).toContainText('1 im Archiv');

  await page.getByTestId('open-filters').click();
  await page.getByRole('switch', { name: 'Archiv anzeigen' }).click();
  await page.getByTestId('filter-done').click();
  await page.getByTestId('customer-row').filter({ hasText: 'Ben Hartmann' }).click();

  // Deleting removes the file with everything that belongs to it.
  await page.getByRole('button', { name: 'Aktionen', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Endgültig löschen' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Endgültig löschen' }).click();
  await expect(page.getByTestId('customers-page')).toBeVisible();
  await expect(page.getByText('Das Archiv ist leer.')).toBeVisible();
});

test('life events can be added, changed and removed', async ({ page }) => {
  await openApp(page, '/customers');
  await quickCustomer(page, 'Lia');
  const events = page.getByTestId('file-events');
  await page.getByTestId('add-event').click();
  await page.getByTestId('event-kind').selectOption('driversLicense');
  await page.getByTestId('event-date').fill('2027-05');
  await page.getByTestId('event-save').click();
  await expect(events).toContainText('Führerschein');
  await expect(events).toContainText('05/2027');

  await events.getByRole('button', { name: 'Ereignis bearbeiten' }).click();
  await page.getByTestId('event-kind').selectOption('move');
  await page.getByTestId('event-save').click();
  await expect(events).toContainText('Umzug');

  await events.getByRole('button', { name: 'Ereignis bearbeiten' }).click();
  await page.getByRole('button', { name: 'Ereignis löschen' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Ereignis löschen' }).click();
  await expect(events).toContainText('Noch keine Lebensereignisse.');
  // Automatic reminders of the event may follow in the history.
  await expect(
    page.getByTestId('history-entry').filter({ hasText: 'Ereignis gelöscht' }),
  ).toHaveCount(1);
});
