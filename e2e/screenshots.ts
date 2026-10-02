/**
 * Creates iPad screenshots of the production build (vite preview).
 * Usage: npm run screenshots  →  screenshots/*.png (SHOTS=settings for one group)
 */
import { mkdirSync } from 'node:fs';
import { chromium, type BrowserContextOptions, type Page } from '@playwright/test';
import { preview } from 'vite';
import { IPAD_LANDSCAPE, IPAD_PORTRAIT, PREVIEW_URL, TEST_PASSWORD } from './ipad.ts';

interface Shot {
  /** Hash route, e.g. "/customers". */
  route: string;
  name: string;
  /** Optional interaction before the screenshot (e.g. opening a dialog). */
  prepare?: (page: Page) => Promise<void>;
  /** Additionally screenshot the rest of the scrolling page in viewport-sized steps. */
  scroll?: boolean;
  /** Only in the wide layout (sidebar). */
  wideOnly?: boolean;
  /** Also in Split View (otherwise only the first six shots). */
  split?: boolean;
}

/** Unlocks after a reload (every reload locks the app). */
async function unlockIfLocked(page: Page) {
  const field = page.getByTestId('unlock-password');
  if (!(await field.isVisible())) return;
  await field.fill(TEST_PASSWORD);
  await page.getByTestId('unlock-submit').click();
  await page.getByTestId('lock-screen').waitFor({ state: 'detached' });
}

/** Height of the iPad on-screen keyboard per orientation (approx., without the shortcut bar). */
const KEYBOARD_HEIGHT = { landscape: 400, portrait: 330 };

/**
 * Chromium has no on-screen keyboard: a fake visualViewport lets the app lay out as with the
 * iPad keyboard (height via window.__setKeyboard), a grey block shows where the keyboard sits.
 */
function simulatedKeyboardScript() {
  const events = new EventTarget();
  let keyboard = 0;
  const viewport = {
    get width() {
      return window.innerWidth;
    },
    get height() {
      return window.innerHeight - keyboard;
    },
    offsetTop: 0,
    offsetLeft: 0,
    pageTop: 0,
    pageLeft: 0,
    scale: 1,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  Object.defineProperty(window, 'visualViewport', { get: () => viewport });
  Object.assign(window, {
    __setKeyboard: (height: number) => {
      keyboard = height;
      events.dispatchEvent(new Event('resize'));
      document.getElementById('e2e-keyboard')?.remove();
      if (!height) return;
      const block = document.createElement('div');
      block.id = 'e2e-keyboard';
      block.textContent = 'Bildschirmtastatur (simuliert)';
      Object.assign(block.style, {
        position: 'fixed',
        left: '0',
        right: '0',
        bottom: '0',
        height: `${height}px`,
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: '500 15px system-ui',
        color: '#6b7280',
        background: 'repeating-linear-gradient(0deg, #d1d5db 0 1px, #e5e7eb 1px 58px)',
        pointerEvents: 'none',
      });
      document.body.append(block);
    },
  });
}

async function setKeyboard(page: Page, on: boolean) {
  const landscape = (page.viewportSize()?.width ?? 0) > (page.viewportSize()?.height ?? 0);
  const height = on ? KEYBOARD_HEIGHT[landscape ? 'landscape' : 'portrait'] : 0;
  await page.evaluate(
    (h) => (window as unknown as { __setKeyboard: (n: number) => void }).__setKeyboard(h),
    height,
  );
  await page.waitForTimeout(300);
}

/** First start: empty setup, a mismatch error with the strength meter, the keyboard. */
async function captureSetup(page: Page, variant: string) {
  await page.goto(PREVIEW_URL, { waitUntil: 'networkidle' });
  await page.getByTestId('setup-password').waitFor();
  await page.waitForTimeout(700);
  await capture(page, `lock-setup-${variant}`);

  await page.getByTestId('setup-password').fill(TEST_PASSWORD);
  await page.getByTestId('setup-repeat').fill('Kompass-Test');
  await page.getByTestId('setup-submit').click();
  await page.getByText('Die Passwörter stimmen nicht überein.').waitFor();
  await page.waitForTimeout(600);
  await capture(page, `lock-setup-error-${variant}`);

  await page.getByTestId('setup-repeat').fill(TEST_PASSWORD);
  await page.getByTestId('setup-repeat').focus();
  await setKeyboard(page, true);
  await capture(page, `lock-setup-keyboard-${variant}`);
  await setKeyboard(page, false);

  await page.getByRole('switch', { name: /Verstanden/ }).click();
  await page.getByTestId('setup-submit').click();
  await page.getByTestId('lock-screen').waitFor({ state: 'detached' });
}

/** Locked: unlock screen, the unlock moment, a wrong password and the wait. */
async function captureUnlock(page: Page, variant: string) {
  await page.goto(`${PREVIEW_URL}#/settings`);
  // Reload: no dialog or overlay from the previous shot.
  await page.reload({ waitUntil: 'networkidle' });
  await unlockIfLocked(page);
  await page.getByTestId('lock-now').click();
  const field = page.getByTestId('unlock-password');
  await field.waitFor();
  await page.waitForTimeout(700);
  await capture(page, `lock-unlock-${variant}`);

  await field.fill(TEST_PASSWORD);
  await page.getByTestId('unlock-submit').click();
  await page.locator('[data-state="success"]').waitFor();
  await page.waitForTimeout(450);
  await capture(page, `lock-opening-${variant}`);
  await page.getByTestId('lock-screen').waitFor({ state: 'detached' });

  await page.getByTestId('sidebar-lock').or(page.getByTestId('lock-now')).first().click();
  for (const attempt of [1, 2, 3]) {
    await field.fill(`falsch-${attempt}`);
    await page.getByTestId('unlock-submit').click();
    await page
      .getByText(attempt < 3 ? 'Das Passwort stimmt nicht.' : /Zu viele Versuche/)
      .waitFor();
    await page.waitForTimeout(700);
    if (attempt === 1) await capture(page, `lock-unlock-error-${variant}`);
  }
  await capture(page, `lock-unlock-wait-${variant}`);
}

async function settingsSecurity(page: Page) {
  await page.getByTestId('settings-security').evaluate((element) => {
    element.scrollIntoView({ block: 'start' });
  });
}

async function changePassword(page: Page) {
  await page.getByRole('button', { name: 'Passwort ändern' }).click();
  const dialog = page.getByRole('dialog', { name: 'Passwort ändern' });
  await dialog.getByLabel('Aktuelles Passwort').fill(TEST_PASSWORD);
  await dialog.getByLabel('Neues Passwort', { exact: true }).fill('Sonnenblume Fahrrad Wolke');
}

async function devVault(page: Page) {
  const section = page.getByTestId('dev-section-vault');
  for (let i = 0; i < 3; i += 1) {
    await section.getByRole('button', { name: 'Testkunden anlegen' }).click();
    await section
      .getByTestId('vault-customer-count')
      .filter({ hasText: String(i + 1) })
      .waitFor();
  }
  await section.getByRole('button', { name: 'Letzten ändern' }).click();
  await section.getByTestId('vault-history-count').filter({ hasText: '4' }).waitFor();
  await page.waitForTimeout(3200); // let the toasts disappear
}

async function devDemo(page: Page) {
  const section = page.getByTestId('dev-section-demo');
  await section.getByRole('button', { name: 'Demo-Daten laden' }).click();
  await section
    .getByTestId('demo-count')
    .filter({ hasText: /^1[2-9]$/ })
    .waitFor();
  await page.waitForTimeout(3200); // let the toast disappear
}

/** Demo data for the customer shots (also in a filtered run). */
async function ensureDemo(page: Page) {
  // Split View runs only some shots: the developer mode may still be off.
  await enableDevMode(page);
  const section = page.getByTestId('dev-section-demo');
  await section.waitFor();
  if ((await section.getByTestId('demo-count').textContent()) === '0') {
    await section.getByRole('button', { name: 'Demo-Daten laden' }).click();
    await section
      .getByTestId('demo-count')
      .filter({ hasText: /^1[2-9]$/ })
      .waitFor();
  }
  await page.goto(`${PREVIEW_URL}#/customers`);
  await page.getByTestId('customer-row').first().waitFor();
  await page.waitForTimeout(3200); // let the toast disappear
}

async function openCustomer(page: Page, name: string) {
  await ensureDemo(page);
  await page.getByTestId('customer-row').filter({ hasText: name }).first().click();
  await page.getByTestId('customer-file').waitFor();
}

const customersList = ensureDemo;

async function customersFilter(page: Page) {
  await ensureDemo(page);
  await page.getByTestId('open-filters').click();
  await page.getByTestId('filter-panel').waitFor();
  await page.getByRole('button', { name: 'Ausbildung', exact: true }).click();
}

async function customersSearch(page: Page) {
  await ensureDemo(page);
  await page.getByTestId('customer-search').fill('azubi');
}

const customerFile = (page: Page) => openCustomer(page, 'Ben');

async function customerEdit(page: Page) {
  await openCustomer(page, 'Ben');
  await page
    .getByTestId('file-contact')
    .getByRole('button', { name: /bearbeiten/ })
    .click();
  await page.getByTestId('section-editor').waitFor();
  await page.getByTestId('field-phone').focus();
  await setKeyboard(page, true);
}

async function customerContract(page: Page) {
  await openCustomer(page, 'Leon');
  await page.getByTestId('contract-chip-accident').click();
  await page.getByRole('menu').waitFor();
}

async function customerHistory(page: Page) {
  await openCustomer(page, 'Leon');
  const history = page.getByTestId('file-history');
  await history.getByTestId('history-entry').first().getByRole('button').click();
  await history.evaluate((element) => element.scrollIntoView({ block: 'start' }));
}

async function scrollToTestId(page: Page, testId: string, block: 'start' | 'center' = 'start') {
  await page
    .getByTestId(testId)
    .first()
    .evaluate((element, position) => element.scrollIntoView({ block: position }), block);
}

async function customerNeeds(page: Page) {
  await openCustomer(page, 'Ben');
  await scrollToTestId(page, 'file-needs');
}

async function customerNeedObjections(page: Page) {
  await openCustomer(page, 'Ben');
  await page.getByTestId('need-card-bu').getByTestId('need-objections').click();
  await scrollToTestId(page, 'need-card-bu');
}

async function customerNeedAccept(page: Page) {
  await openCustomer(page, 'Ben');
  const card = page.getByTestId('need-card-accident');
  await scrollToTestId(page, 'need-card-accident', 'center');
  await card.getByTestId('need-accept').click();
  await card.and(page.locator('[data-state="accepted"]')).waitFor();
}

async function customerNeedEdit(page: Page) {
  await openCustomer(page, 'Ben');
  await page.getByTestId('need-card-fundSavings').getByTestId('need-adjust').click();
  await page.getByTestId('need-editor').waitFor();
  await page.getByRole('radio', { name: 'Später', exact: true }).click();
  await page.getByTestId('need-reason').fill('Erst nach der Übernahme im Januar besprechen');
}

async function customerNeedRecheck(page: Page) {
  await openCustomer(page, 'Ben');
  const card = page.getByTestId('need-card-capitalFormation');
  await card.getByTestId('need-accept').click();
  await card.and(page.locator('[data-state="accepted"]')).waitFor();
  await page
    .getByTestId('file-situation')
    .getByRole('button', { name: /bearbeiten/ })
    .click();
  await page
    .getByRole('radiogroup', { name: 'Arbeitgeber zahlt VL' })
    .getByRole('radio', { name: 'nein', exact: true })
    .click();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await card.getByTestId('need-recheck').waitFor();
  await scrollToTestId(page, 'need-card-capitalFormation', 'center');
  await page.waitForTimeout(2500); // let the toasts disappear
}

async function customerHooks(page: Page) {
  await openCustomer(page, 'Ben');
  await scrollToTestId(page, 'file-hooks', 'center');
}

/** Starts the question catalogue without the draft of the previous shot. */
async function freshWizard(page: Page) {
  await page.getByTestId('wizard').waitFor();
  await page.getByTestId('wizard-cancel').click();
  const discard = page.getByRole('button', { name: 'Verwerfen' });
  if (await discard.isVisible()) await discard.click();
  await page.getByTestId('wizard').waitFor({ state: 'detached' });
  await page.goto(`${PREVIEW_URL}#/customers/new`);
  await page.getByTestId('field-firstName').waitFor();
  await page.waitForTimeout(3200); // let the toast disappear
}

async function wizardStart(page: Page) {
  await freshWizard(page);
  await page.getByTestId('field-firstName').fill('Mila');
  await page.getByTestId('field-phone').focus();
  await setKeyboard(page, true);
}

async function wizardJob(page: Page) {
  await freshWizard(page);
  await page.getByTestId('field-firstName').fill('Mila');
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('wizard-title').filter({ hasText: 'Beruf' }).waitFor();
  await page.getByLabel('Lebensphase').first().selectOption('training');
  await page.getByTestId('field-occupation').fill('Azubi Industriekauffrau');
}

async function wizardSummary(page: Page) {
  await freshWizard(page);
  await page.getByTestId('field-firstName').fill('Mila');
  for (let step = 0; step < 9; step += 1) await page.getByTestId('wizard-next').click();
  await page.getByTestId('wizard-summary').waitFor();
}

async function knowledgeSearch(page: Page) {
  await page.getByTestId('knowledge-search').fill('nachvers');
  await page.getByTestId('knowledge-result').first().waitFor();
}

async function enableDevMode(page: Page) {
  await page.goto(`${PREVIEW_URL}#/settings`);
  const toggle = page.getByRole('switch', { name: 'Entwicklermodus' });
  if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click();
  await page.goto(`${PREVIEW_URL}#/dev/ui`);
  await page.getByTestId('dev-section-buttons').waitFor();
}

const click = (name: string) => async (page: Page) => {
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForTimeout(500);
};

async function focusMode(page: Page) {
  await page.getByTestId('dev-section-focus').scrollIntoViewIfNeeded();
  await click('Fokusmodus testen')(page);
}

async function shortcuts(page: Page) {
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  await page.keyboard.press('Shift+?');
  await page.getByTestId('shortcuts').waitFor();
}

async function collapsedSidebar(page: Page) {
  await click('Seitenleiste einklappen')(page);
  await page.waitForTimeout(400);
}

async function expandSidebar(page: Page) {
  const expand = page.getByRole('button', { name: 'Seitenleiste ausklappen' });
  if (await expand.count()) await expand.click();
}

const SHOTS: Shot[] = [
  { route: '/dashboard', name: 'dashboard' },
  { route: '/customers', name: 'customers' },
  { route: '/reminders', name: 'reminders' },
  { route: '/campaigns', name: 'campaigns' },
  { route: '/network', name: 'network' },
  { route: '/settings', name: 'settings', scroll: true },
  { route: '/settings', name: 'settings-security', prepare: settingsSecurity },
  { route: '/settings', name: 'settings-password', prepare: changePassword },
  { route: '/dev/ui', name: 'dev-ui', prepare: enableDevMode, scroll: true },
  { route: '/dev/ui', name: 'dev-vault', prepare: devVault },
  { route: '/dev/ui', name: 'dev-demo', prepare: devDemo },
  {
    route: '/customers',
    name: 'customers-list',
    prepare: customersList,
    scroll: true,
    split: true,
  },
  { route: '/customers', name: 'customers-filter', prepare: customersFilter },
  { route: '/customers', name: 'customers-search', prepare: customersSearch },
  { route: '/customers', name: 'customers-file', prepare: customerFile, scroll: true, split: true },
  { route: '/customers', name: 'customers-edit', prepare: customerEdit },
  { route: '/customers', name: 'customers-contract', prepare: customerContract },
  { route: '/customers', name: 'customers-history', prepare: customerHistory },
  { route: '/customers', name: 'customers-needs', prepare: customerNeeds, split: true },
  { route: '/customers', name: 'customers-need-objections', prepare: customerNeedObjections },
  { route: '/customers', name: 'customers-need-accept', prepare: customerNeedAccept },
  { route: '/customers', name: 'customers-need-edit', prepare: customerNeedEdit },
  { route: '/customers', name: 'customers-need-recheck', prepare: customerNeedRecheck },
  { route: '/customers', name: 'customers-hooks', prepare: customerHooks, split: true },
  { route: '/customers/new', name: 'customers-new', prepare: wizardStart, split: true },
  { route: '/customers/new', name: 'customers-new-job', prepare: wizardJob },
  { route: '/customers/new', name: 'customers-new-summary', prepare: wizardSummary, scroll: true },
  { route: '/dev/ui', name: 'dev-modal', prepare: click('Modal öffnen') },
  { route: '/dev/ui', name: 'dev-sheet', prepare: click('Bottom Sheet öffnen') },
  { route: '/dev/ui', name: 'dev-focus', prepare: focusMode },
  { route: '/dashboard', name: 'shortcuts', prepare: shortcuts },
  { route: '/knowledge', name: 'knowledge', scroll: true, split: true },
  { route: '/knowledge', name: 'knowledge-search', prepare: knowledgeSearch },
  { route: '/knowledge/product/bu', name: 'knowledge-product', scroll: true, split: true },
  { route: '/knowledge/phase/training', name: 'knowledge-phase', scroll: true },
  { route: '/knowledge/event/trainingEnd', name: 'knowledge-event', scroll: true },
  { route: '/knowledge/topic/wealthBuilding', name: 'knowledge-topic' },
  { route: '/knowledge/priorities', name: 'knowledge-priorities', scroll: true },
  { route: '/knowledge/questionnaire', name: 'knowledge-questionnaire', scroll: true },
  { route: '/customers', name: 'sidebar-collapsed', prepare: collapsedSidebar, wideOnly: true },
];

const VARIANTS: { name: string; options: BrowserContextOptions }[] = [
  { name: 'landscape-dark', options: { ...IPAD_LANDSCAPE, colorScheme: 'dark' } },
  { name: 'landscape-light', options: { ...IPAD_LANDSCAPE, colorScheme: 'light' } },
  { name: 'portrait-dark', options: { ...IPAD_PORTRAIT, colorScheme: 'dark' } },
  { name: 'portrait-light', options: { ...IPAD_PORTRAIT, colorScheme: 'light' } },
  // Split View: half of a landscape iPad Air (narrowest supported width ≈ 500 px).
  {
    name: 'split-dark',
    options: { ...IPAD_PORTRAIT, viewport: { width: 500, height: 820 }, colorScheme: 'dark' },
  },
];

/** Optional name prefix, e.g. SHOTS=dev npm run screenshots. */
const ONLY = process.env.SHOTS;

const outDir = new URL('../screenshots/', import.meta.url);
mkdirSync(outDir, { recursive: true });

async function capture(page: Page, name: string) {
  const file = new URL(`${name}.png`, outDir).pathname;
  await page.screenshot({ path: file });
  console.log(`✓ ${file}`);
}

/** Icon preview: home screen icon, maskable icon in a circle, tab icon and startup images. */
async function captureIconPreview() {
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();
  const icon = (file: string) => `${PREVIEW_URL}icons/${file}`;
  const splash = (file: string) => `${PREVIEW_URL}splash/${file}`;
  const panel = (theme: 'dark' | 'light') => {
    const fg = theme === 'dark' ? '#e6eef1' : '#0e161b';
    const muted = theme === 'dark' ? '#9aa8b2' : '#4d5b65';
    const bg = theme === 'dark' ? '#0a1014' : '#f3f6f7';
    return `
      <section style="background:${bg};color:${fg};padding:28px 32px;display:flex;gap:40px;align-items:flex-end">
        <figure><img src="${icon('apple-touch-icon-180x180.png')}" width="120" height="120" style="border-radius:27px"><figcaption>Kompass</figcaption><small style="color:${muted}">iPad-Homescreen</small></figure>
        <figure><img src="${icon('maskable-icon-512x512.png')}" width="120" height="120" style="border-radius:50%"><figcaption>maskable</figcaption><small style="color:${muted}">Kreismaske</small></figure>
        <figure><img src="${icon('pwa-512x512.png')}" width="120" height="120"><figcaption>pwa-512</figcaption><small style="color:${muted}">transparent</small></figure>
        <figure><span style="display:flex;gap:12px;align-items:center;height:120px"><img src="${icon('favicon.svg')}" width="32" height="32"><img src="${icon('favicon.svg')}" width="16" height="16"></span><figcaption>Favicon</figcaption><small style="color:${muted}">32 / 16 px</small></figure>
        <figure><img src="${splash(`splash-1640x2360-${theme}.png`)}" height="200" style="border-radius:12px;border:1px solid ${muted}55"><figcaption>Startbild</figcaption><small style="color:${muted}">${theme === 'dark' ? 'dunkel' : 'hell'}</small></figure>
      </section>`;
  };
  await page.setContent(`<!doctype html><html><body style="margin:0;font:500 15px system-ui">
    <style>figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:6px}</style>
    ${panel('dark')}${panel('light')}</body></html>`);
  await page.waitForLoadState('networkidle');
  const size = await page.evaluate(() => ({
    width: document.body.scrollWidth,
    height: document.body.scrollHeight,
  }));
  await page.setViewportSize(size);
  await capture(page, 'icon-preview');
  await context.close();
}

const server = await preview();
const browser = await chromium.launch();
try {
  if (!ONLY || 'icon-preview'.startsWith(ONLY)) await captureIconPreview();
  for (const variant of VARIANTS) {
    const context = await browser.newContext({
      ...variant.options,
      // Keep screenshots free of the "offline ready" toast.
      serviceWorkers: 'block',
    });
    await context.addInitScript(simulatedKeyboardScript);
    const page = await context.newPage();
    const wide = (variant.options.viewport?.width ?? 0) >= 900;
    const split = variant.name.startsWith('split');
    if (!ONLY || 'lock'.startsWith(ONLY) || ONLY.startsWith('lock')) {
      await captureSetup(page, variant.name);
    } else {
      await page.goto(PREVIEW_URL, { waitUntil: 'networkidle' });
      await page.getByTestId('setup-password').fill(TEST_PASSWORD);
      await page.getByTestId('setup-repeat').fill(TEST_PASSWORD);
      await page.getByRole('switch', { name: /Verstanden/ }).click();
      await page.getByTestId('setup-submit').click();
      await page.getByTestId('lock-screen').waitFor({ state: 'detached' });
    }
    // A filtered run still needs the developer mode (normally enabled by the dev-ui shot).
    if (ONLY) await enableDevMode(page);
    const shots = SHOTS.filter((s) => !ONLY || s.name.startsWith(ONLY));
    for (const shot of split ? shots.filter((s, index) => index < 6 || s.split) : shots) {
      if (shot.wideOnly && !wide) continue;
      await page.goto(`${PREVIEW_URL}#${shot.route}`, { waitUntil: 'networkidle' });
      // Same hash = no navigation; reload so dialogs from the previous shot are gone.
      await page.reload({ waitUntil: 'networkidle' });
      await unlockIfLocked(page);
      await page.waitForTimeout(400);
      await shot.prepare?.(page);
      const container = page.locator('[data-scroll-container]');
      if (shot.scroll) {
        await container.evaluate((element) => {
          element.scrollTop = 0;
        });
      }
      await page.waitForTimeout(700);
      await capture(page, `${shot.name}-${variant.name}`);
      if (shot.name === 'sidebar-collapsed') await expandSidebar(page);
      if (!shot.scroll) continue;
      for (let part = 2; part <= 8; part += 1) {
        const moved = await container.evaluate((element) => {
          const before = element.scrollTop;
          element.scrollTop += element.clientHeight - 80;
          return element.scrollTop !== before;
        });
        if (!moved) break;
        await page.waitForTimeout(300);
        await capture(page, `${shot.name}-${part}-${variant.name}`);
      }
    }
    if (!split && (!ONLY || ONLY.startsWith('lock'))) await captureUnlock(page, variant.name);
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}
