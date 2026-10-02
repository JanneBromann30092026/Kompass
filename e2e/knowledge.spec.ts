import { expect, test, type Page } from '@playwright/test';
import { enableDevMode, nav, openApp, storageDump } from './vault.ts';

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

const heading = (page: Page, name: string) => page.getByRole('heading', { level: 1, name });

test('knowledge: open, browse linked entries, go back', async ({ page }, testInfo) => {
  const problems = collectConsoleProblems(page);
  await openApp(page);
  if (testInfo.project.name === 'ipad-landscape') {
    await page.getByRole('link', { name: 'Wissen' }).click();
  } else {
    // Tab bar layout: the knowledge view is opened from the settings.
    await nav(page).getByRole('link', { name: 'Einstellungen' }).click();
    await page.getByTestId('open-knowledge').click();
  }
  await expect(heading(page, 'Wissen')).toBeVisible();
  for (const section of ['products', 'phases', 'events', 'topics', 'basics']) {
    await expect(page.getByTestId(`knowledge-section-${section}`)).toBeVisible();
  }

  await page.getByTestId('knowledge-card-product-bu').click();
  await expect(heading(page, 'BU')).toBeVisible();
  await expect(page.getByTestId('rule-useful')).toContainText('Eigenes Einkommen');
  await expect(page.getByTestId('rule-objections')).toContainText('Ich bin jung und gesund.');
  await expect(page.getByTestId('knowledge-customers')).toContainText('Kommt in Schritt 4');

  await page.getByTestId('rule-triggers').getByRole('link', { name: 'Ausbildungsende' }).click();
  await expect(heading(page, 'Ausbildungsende')).toBeVisible();
  await expect(page.getByTestId('event-reminder')).toContainText('3 Monate');
  await page.getByTestId('event-triggers').getByRole('link', { name: /bAV/ }).click();
  await expect(heading(page, 'bAV')).toBeVisible();

  await page.getByTestId('knowledge-back').click();
  await expect(heading(page, 'Ausbildungsende')).toBeVisible();
  await page.getByTestId('knowledge-back').click();
  await page.getByTestId('knowledge-back').click();
  await expect(heading(page, 'Wissen')).toBeVisible();

  await page.getByTestId('knowledge-card-questionnaire').click();
  await expect(page.getByTestId('questionnaire-do-not-store')).toContainText('IBAN');
  await page.getByTestId('knowledge-back').click();
  await page.getByTestId('knowledge-card-priorities').click();
  await expect(heading(page, 'Priorisierung')).toBeVisible();
  expect(problems).toEqual([]);
});

test('knowledge: search with umlaut variants and keyboard', async ({ page }) => {
  await openApp(page, '/knowledge');
  const search = page.getByTestId('knowledge-search');
  const results = page.getByTestId('knowledge-result');

  await page.keyboard.press('/');
  await expect(search).toBeFocused();
  await page.keyboard.type('volljahrig');
  await expect(results.first()).toContainText('18. Geburtstag');

  await search.fill('nachvers');
  await expect(results.first()).toContainText('BU');
  await expect(page.getByTestId('knowledge-results')).toContainText('Treffer');

  await search.fill('gibtesnicht');
  await expect(page.getByText('Nichts gefunden')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(search).toHaveValue('');
  await expect(page.getByTestId('knowledge-section-products')).toBeVisible();

  // The query survives opening a result and coming back.
  await search.fill('studienende');
  await results.first().click();
  await expect(heading(page, 'Ausbildungsende')).toBeVisible();
  await page.getByTestId('knowledge-back').click();
  await expect(search).toHaveValue('studienende');
});

test('knowledge: unknown entries show a hint', async ({ page }) => {
  await openApp(page, '/knowledge/product/gibtesnicht');
  await expect(page.getByText('Eintrag nicht gefunden').first()).toBeVisible();
  await page.getByRole('button', { name: 'Zur Übersicht' }).click();
  await expect(heading(page, 'Wissen')).toBeVisible();
});

test('demo data: load idempotently, stored encrypted, remove', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await openApp(page);
  await enableDevMode(page);
  await page.goto('./#/dev/ui');
  const section = page.getByTestId('dev-section-demo');
  const load = section.getByTestId('demo-load');

  await load.click();
  await expect(section.getByTestId('demo-count')).toHaveText('12');
  await expect(section.getByTestId('demo-result')).toHaveText('12 Demo-Kunden geladen');
  await load.click();
  await expect(section.getByTestId('demo-result')).toHaveText('Demo-Daten sind schon geladen');
  await expect(section.getByTestId('demo-total')).toHaveText('12');

  const dump = await storageDump(page);
  for (const plaintext of ['Leon', 'Hartmann', '+49 000', 'example.com', 'Jahresgespr', 'K-00']) {
    expect(dump.indexedDb).not.toContain(plaintext);
    expect(dump.localStorage).not.toContain(plaintext);
  }

  await section.getByTestId('demo-measure').click();
  await expect(section.getByTestId('demo-result')).toContainText('Datensätze in');

  await section.getByTestId('demo-remove').click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Entfernen' }).click();
  await expect(section.getByTestId('demo-count')).toHaveText('0');
  await expect(section.getByTestId('demo-result')).toHaveText('12 Demo-Kunden entfernt');
  expect(problems).toEqual([]);
});

test('synthetic data: 500 customers are created and removed', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page);
  await enableDevMode(page);
  await page.goto('./#/dev/ui');
  const section = page.getByTestId('dev-section-demo');
  await section.getByTestId('demo-synthetic-add').click();
  await expect(section.getByTestId('demo-synthetic')).toHaveText('500', { timeout: 90_000 });
  await expect(section.getByTestId('demo-result')).toContainText('500 Kunden in');
  await section.getByTestId('demo-synthetic-remove').click();
  await expect(section.getByTestId('demo-synthetic')).toHaveText('0', { timeout: 60_000 });
});
