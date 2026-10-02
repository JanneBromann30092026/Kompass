import { expect, test, type Locator, type Page } from '@playwright/test';
import { enableDevMode, nav, openApp, reloadAndUnlock } from './vault.ts';

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

async function loadDemo(page: Page) {
  await enableDevMode(page);
  await page.goto('./#/dev/ui');
  await page.getByTestId('demo-load').click();
  await expect(page.getByTestId('demo-count')).toHaveText('12');
}

async function openReminders(page: Page) {
  await nav(page)
    .getByRole('link', { name: /^Wiedervorlagen/ })
    .click();
  await expect(page.getByTestId('reminders-page')).toBeVisible();
}

const rows = (scope: Page | Locator) => scope.getByTestId('reminder-row');
const openRow = (page: Page, text: string) =>
  rows(page).filter({ hasText: text }).and(page.locator('[data-done="false"]')).first();

async function dueBadge(page: Page): Promise<number> {
  const badge = nav(page).getByTestId('nav-due-badge');
  if ((await badge.count()) === 0) return 0;
  return Number((await badge.textContent()) ?? '0');
}

test('derived reminders: complete with note and follow-up, undo, badge', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await openApp(page);
  await loadDemo(page);
  await openReminders(page);

  // Groups by due date; every test customer has its annual review.
  await expect(page.getByTestId('bucket-overdue')).toBeVisible();
  await expect(rows(page).filter({ hasText: 'Jahresgespräch' })).toHaveCount(12);
  await expect(rows(page).filter({ hasText: '18. Geburtstag' })).toHaveCount(2);
  const before = await dueBadge(page);
  expect(before).toBeGreaterThan(0);

  // Filter by occasion.
  await page
    .getByRole('group', { name: 'Anlass' })
    .getByRole('button', { name: 'Ausbildungsende' })
    .click();
  await expect(
    page.locator('[data-testid="reminder-row"]:not([data-kind="trainingEnd"])'),
  ).toHaveCount(0);
  await expect(rows(page).first()).toBeVisible();
  await page.getByRole('group', { name: 'Anlass' }).getByRole('button', { name: 'Alle' }).click();

  // Complete with a note and a follow-up task.
  const license = openRow(page, 'Führerschein');
  const overdue = (await license.getByTestId('reminder-due').textContent()) ?? '';
  await license.getByTestId('reminder-complete').click();
  await page.getByTestId('complete-note').fill('Fährt bei den Eltern mit');
  await page.getByRole('switch', { name: 'Folgeaufgabe anlegen' }).click();
  await page.getByRole('button', { name: 'In 1 Woche' }).click();
  await page.getByTestId('complete-confirm').click();
  await expect(page.getByText('Führerschein: erledigt')).toBeVisible();
  await expect(rows(page).filter({ hasText: 'Nachfassen: Führerschein' })).toHaveCount(1);
  await expect(
    page.getByTestId('bucket-next30').getByText('Nachfassen: Führerschein'),
  ).toBeVisible();
  if (overdue.startsWith('vor') || overdue === 'gestern' || overdue === 'heute') {
    await expect.poll(() => dueBadge(page)).toBe(before - 1);
  }

  // Completed ones stay visible on request, with the note.
  await page.getByTestId('reminders-show-done').click();
  const done = page.getByTestId('reminders-done');
  await expect(done.getByText('Fährt bei den Eltern mit')).toBeVisible();

  // Undo from the toast.
  const review = openRow(page, 'Ilka');
  await review.getByTestId('reminder-complete').click();
  await page.getByTestId('annual-follow-up').waitFor();
  await page.getByTestId('complete-confirm').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Jahresgespräch: erledigt' })
    .getByTestId('toast-action')
    .click();
  await expect(page.getByText('Jahresgespräch: wieder offen')).toBeVisible();
  await expect(openRow(page, 'Ilka')).toBeVisible();

  // History of the file: completion with note.
  await openRow(page, 'Nachfassen: Führerschein').getByTestId('reminder-customer').click();
  const history = page.getByTestId('file-history');
  const entry = history.getByTestId('history-entry').filter({ hasText: 'Wiedervorlage geändert' });
  await entry.first().getByRole('button').click();
  await expect(entry.first()).toContainText('Fährt bei den Eltern mit');
  expect(problems).toEqual([]);
});

test('swipe right completes, the next annual review follows', async ({ page }) => {
  await openApp(page);
  await loadDemo(page);
  await openReminders(page);
  const row = openRow(page, 'Ilka');
  const box = await row.boundingBox();
  if (!box) throw new Error('row not visible');
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 80, y);
  await page.mouse.down();
  for (let step = 1; step <= 12; step += 1) await page.mouse.move(box.x + 80 + step * 25, y);
  await page.mouse.up();
  await expect(page.getByText('Jahresgespräch: erledigt')).toBeVisible();

  // Completing the annual review creates the next one automatically (12 months later).
  await expect(
    rows(page).filter({ hasText: 'Ilka' }).and(page.locator('[data-done="false"]')),
  ).toHaveCount(1);
  await expect(openRow(page, 'Ilka').getByTestId('reminder-due')).toHaveText(/in 36\d Tagen/);

  // Survives a reload.
  await reloadAndUnlock(page);
  await expect(openRow(page, 'Ilka').getByTestId('reminder-due')).toHaveText(/in 36\d Tagen/);
});

test('postpone by week, month and date', async ({ page }) => {
  await openApp(page);
  await loadDemo(page);
  await openReminders(page);
  const row = openRow(page, 'Kaya');
  const id = await row.getAttribute('data-reminder-id');
  const byId = page.locator(`[data-reminder-id="${id}"]`);

  await row.getByTestId('reminder-menu').click();
  await page.getByRole('menuitem', { name: 'Verschieben: +1 Woche' }).click();
  await expect(page.getByText(/^Verschoben auf/)).toBeVisible();
  // The row moves to another group (the old one fades out first).
  await expect(byId).toHaveCount(1);
  await expect(byId.getByTestId('reminder-due')).toHaveText('in 7 Tagen');

  await byId.getByTestId('reminder-menu').click();
  await page.getByRole('menuitem', { name: 'Verschieben auf Datum …' }).click();
  await page.getByTestId('date-input').fill('2030-01-15');
  await page.getByTestId('date-confirm').click();
  await expect(
    page.getByTestId('bucket-later').locator(`[data-reminder-id="${id}"]`),
  ).toBeVisible();
  await expect(byId).toHaveCount(1);
  await expect(byId).toContainText('15.01.2030');
  await expect(
    page.getByTestId('bucket-later').locator(`[data-reminder-id="${id}"]`),
  ).toBeVisible();

  // The automatic sync keeps the postponed date.
  await reloadAndUnlock(page);
  await expect(byId).toContainText('15.01.2030');
});

test('facts change the reminders without duplicates; manual reminders', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await openApp(page, '/customers');
  await page.keyboard.press('n');
  await page.getByTestId('field-firstName').fill('Lia');
  for (let step = 0; step < 9; step += 1) await page.getByTestId('wizard-next').click();
  await page.getByTestId('wizard-create').click();
  const section = page.getByTestId('file-reminders');
  await expect(rows(section)).toHaveCount(1);
  await expect(rows(section).first()).toContainText('Jahresgespräch');

  // A life event with a date brings its reminder.
  const year = new Date().getFullYear() + 1;
  await page.getByTestId('add-event').click();
  await page.getByTestId('event-kind').selectOption('marriage');
  await page.getByTestId('event-date').fill(`${year}-08`);
  await page.getByTestId('event-save').click();
  await expect(rows(section).filter({ hasText: 'Heirat' })).toContainText(`01.05.${year}`);

  // Moving the date moves the reminder – no second one.
  const events = page.getByTestId('file-events');
  await events.getByRole('button', { name: 'Ereignis bearbeiten' }).click();
  await page.getByTestId('event-date').fill(`${year}-10`);
  await page.getByTestId('event-save').click();
  await expect(rows(section).filter({ hasText: `01.07.${year}` })).toHaveCount(1);
  await expect(rows(section).filter({ hasText: 'Heirat' })).toHaveCount(1);

  // Removing the event removes its open reminder.
  await events.getByRole('button', { name: 'Ereignis bearbeiten' }).click();
  await page.getByRole('button', { name: 'Ereignis löschen' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Ereignis löschen' }).click();
  await expect(rows(section).filter({ hasText: 'Heirat' })).toHaveCount(0);

  // Manual reminder from the file, edit, delete.
  await page.getByTestId('file-reminder-add').click();
  await page.getByTestId('reminder-title-input').fill('Rückruf wegen Angebot');
  await page.getByTestId('reminder-date').fill(`${year}-01-20`);
  await page.getByTestId('reminder-save').click();
  const manual = rows(section).filter({ hasText: 'Rückruf wegen Angebot' });
  await expect(manual).toContainText(`20.01.${year}`);
  await manual.getByTestId('reminder-menu').click();
  await page.getByRole('menuitem', { name: 'Löschen' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Löschen' }).click();
  await expect(manual).toHaveCount(0);

  // Automatic reminders cannot be deleted (they would come back).
  await rows(section).first().getByTestId('reminder-menu').click();
  await expect(page.getByRole('menuitem', { name: 'Löschen' })).toHaveCount(0);
  await page.keyboard.press('Escape');

  // The customer list shows the next reminder.
  await page.getByTestId('file-back').click();
  await expect(
    page
      .getByTestId('customer-row')
      .filter({ hasText: 'Lia' })
      .getByTestId('customer-next-reminder'),
  ).toContainText(/in \d+ Tagen/);
  expect(problems).toEqual([]);
});

test('calendar export is pseudonymised (.ics)', async ({ page }) => {
  await openApp(page);
  await loadDemo(page);
  await openReminders(page);
  await page.getByTestId('reminders-export').click();
  await expect(page.getByTestId('calendar-preview')).toContainText('K-0006 · Führerschein');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('calendar-download').click(),
  ]);
  expect(download.suggestedFilename()).toBe('kompass-wiedervorlagen.ics');
  const path = await download.path();
  const { readFile } = await import('node:fs/promises');
  const ics = await readFile(path, 'utf8');
  expect(ics).toMatch(/^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\n/);
  expect(ics).toContain('SUMMARY:K-0002 · Ausbildungsende');
  expect(ics).toContain('SUMMARY:K-0001 · Verträge umstellen');
  expect(ics).toContain('TRIGGER:-PT15H');
  expect(ics.match(/BEGIN:VEVENT/g)?.length).toBeGreaterThan(20);
  for (const secret of ['Ben', 'Hartmann', 'Ilka', '+49', 'example.com', 'Geburtstag', 'Kfz']) {
    expect(ics).not.toContain(secret);
  }
});

test('calendar export uses the share sheet when available', async ({ page }) => {
  await page.addInitScript(() => {
    const shared: string[] = [];
    Object.assign(window, { __shared: shared });
    Object.assign(navigator, {
      canShare: (data: { files?: File[] }) => Boolean(data.files?.length),
      share: async (data: { files: File[] }) => {
        shared.push(await data.files[0]!.text());
      },
    });
  });
  await openApp(page);
  await loadDemo(page);
  await openReminders(page);
  const row = openRow(page, 'Führerschein');
  await row.getByTestId('reminder-menu').click();
  await page.getByRole('menuitem', { name: 'In Kalender' }).click();
  await page.getByTestId('calendar-share').click();
  const read = () => page.evaluate(() => (window as unknown as { __shared: string[] }).__shared);
  await expect.poll(async () => (await read()).length).toBe(1);
  const shared = await read();
  expect(shared[0]).toContain('SUMMARY:K-0006 · Führerschein');
  expect(shared[0]?.match(/BEGIN:VEVENT/g)).toHaveLength(1);
});
