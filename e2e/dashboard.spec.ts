import { expect, test, type Page } from '@playwright/test';
import { enableDevMode, nav, openApp, reloadAndUnlock, START_HEADING } from './vault.ts';

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

/** Demo data straight from the empty start page (developer mode). */
async function loadDemoFromStart(page: Page) {
  await enableDevMode(page);
  await page.goto('./#/dashboard');
  await page.getByTestId('dashboard-demo').click();
  await expect(page.getByTestId('metric-customers-value')).toHaveText('12');
}

const metric = (page: Page, name: string) => page.getByTestId(`metric-${name}-value`);

test('empty start page: greeting, first customer, demo only in developer mode', async ({
  page,
}) => {
  const problems = collectConsoleProblems(page);
  await openApp(page);
  await expect(page.getByRole('heading', { level: 1, name: START_HEADING })).toBeVisible();
  await expect(page.getByTestId('dashboard-date')).toHaveText(
    /^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag), \d{1,2}\. \S+ \d{4}$/,
  );
  await expect(page.getByTestId('dashboard-empty')).toBeVisible();
  await expect(page.getByTestId('dashboard-demo')).toHaveCount(0);
  await page.getByTestId('dashboard-create').click();
  await expect(page).toHaveURL(/#\/customers\/new$/);

  await loadDemoFromStart(page);
  await expect(page.getByTestId('dashboard-empty')).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('key figures and coverage lead to filtered lists', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await openApp(page);
  await loadDemoFromStart(page);

  // Reference values of the test customers (Kunden-Wissensdatenbank).
  await expect(metric(page, 'invitable')).toHaveText('9');
  await expect(metric(page, 'minors')).toHaveText('2');
  await expect(metric(page, 'overdue')).not.toHaveText('0');

  await page.getByTestId('metric-minors').click();
  await expect(page).toHaveURL(/#\/customers$/);
  await expect(page.getByTestId('customer-count')).toHaveText('2 von 12 Kunden');
  await expect(page.getByTestId('active-filters')).toContainText('Minderjährig');

  // Coverage: quote per line, tap → customers of a segment.
  await nav(page).getByRole('link', { name: 'Start' }).click();
  const bu = page.locator('[data-testid="coverage-row"][data-line="bu"]');
  await expect(bu.getByTestId('coverage-quote')).toHaveText('42 %');
  await expect(bu.getByTestId('coverage-need')).toHaveText('5 Bedarf');
  await expect(
    page
      .locator('[data-testid="coverage-row"][data-line="liability"]')
      .getByTestId('coverage-quote'),
  ).toHaveText('100 %');
  await bu.click();
  await page.getByRole('menuitem', { name: 'Bedarf ohne Vertrag (5)' }).click();
  await expect(page.getByTestId('customer-count')).toHaveText('5 von 12 Kunden');
  const chip = page.getByTestId('active-filters').getByRole('button', {
    name: /BU: Bedarf ohne Vertrag/,
  });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page.getByTestId('customer-count')).toHaveText('12 Kunden');

  await nav(page).getByRole('link', { name: 'Start' }).click();
  await page.locator('[data-testid="coverage-row"][data-line="bu"]').click();
  await page.getByRole('menuitem', { name: 'abgeschlossen (5)' }).click();
  await expect(page.getByTestId('customer-count')).toHaveText('5 von 12 Kunden');
  await expect(page.getByTestId('active-filters')).toContainText('BU: abgeschlossen');
  expect(problems).toEqual([]);
});

test('open needs (priority before potential) and pipeline open the file', async ({ page }) => {
  await openApp(page);
  await loadDemoFromStart(page);
  const needs = page.getByTestId('open-need');
  await expect(needs).toHaveCount(10);
  await expect(needs.first()).toContainText('Ben Hartmann');
  await expect(needs.first()).toContainText('Prio 1');
  await expect(needs.nth(1)).toContainText('BU (Anpassung)');
  await expect(page.getByTestId('needs-more')).toHaveText('1 weiterer Kunde mit Bedarf');

  await page.getByTestId('needs-priority-1').click();
  await expect(page.getByTestId('customer-count')).toHaveText('6 von 12 Kunden');

  await nav(page).getByRole('link', { name: 'Start' }).click();
  const pipeline = page.getByTestId('pipeline-entry');
  await expect(pipeline).toHaveCount(9);
  await expect(pipeline.first()).toContainText('Ben Hartmann');
  await expect(pipeline.first()).toContainText('angeboten');
  await pipeline.filter({ hasText: 'Kaya' }).click();
  await expect(page.getByTestId('customer-file')).toBeVisible();
  await expect(page.getByTestId('file-hero')).toContainText('K-0011');
});

test('today: complete a due reminder, birthday greetings only with consent', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await openApp(page);
  await loadDemoFromStart(page);
  const due = page.getByTestId('today-due');
  const overdue = Number(await metric(page, 'overdue').textContent());

  // Ilka's annual review is overdue: complete it right here.
  const review = due.getByTestId('reminder-row').filter({ hasText: 'Ilka' });
  await review.getByTestId('reminder-complete').click();
  await page.getByTestId('complete-confirm').click();
  await expect(due.getByTestId('reminder-row').filter({ hasText: 'Ilka' })).toHaveCount(0);
  await expect(metric(page, 'overdue')).toHaveText(String(overdue - 1));

  // Birthdays in the next 7 days; Emma has no marketing consent.
  const birthdays = page.getByTestId('today-birthdays').getByTestId('birthday-row');
  await expect(birthdays).toHaveCount(3);
  const emma = birthdays.filter({ hasText: 'Emma' });
  await expect(emma.getByTestId('birthday-greet')).toHaveCount(0);
  await expect(emma.getByTestId('birthday-no-consent')).toBeVisible();

  const ben = birthdays.filter({ hasText: 'Ben Hartmann' });
  await expect(ben).toContainText(/wird 19/);
  await ben.getByTestId('birthday-greet').click();
  const dialog = page.getByTestId('greeting-dialog');
  await expect(page.getByTestId('greeting-text')).toHaveValue(/^Hallo Ben,/);
  await expect(page.getByTestId('greeting-whatsapp')).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/49000\d+\?text=Hallo%20Ben%2C/,
  );
  await dialog.getByRole('radio', { name: 'Sie' }).click();
  await expect(page.getByTestId('greeting-text')).toHaveValue(/^Guten Tag Ben Hartmann,/);
  await page.getByTestId('greeting-text').fill('Alles Gute, Ben!');
  await expect(page.getByTestId('greeting-whatsapp')).toHaveAttribute(
    'href',
    /\?text=Alles%20Gute%2C%20Ben!$/,
  );
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  // The completed reminder stays done after a reload.
  await reloadAndUnlock(page);
  await expect(
    page.getByTestId('today-due').getByTestId('reminder-row').filter({ hasText: 'Ilka' }),
  ).toHaveCount(0);
  expect(problems).toEqual([]);
});
