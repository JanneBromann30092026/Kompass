import { describe, expect, it } from 'vitest';
import {
  LIFE_EVENT_KINDS,
  PRODUCT_LINES,
  type ContractStatus,
  type ProductLine,
} from '@/data/domain';
import { buildDemoCustomer } from '@/data/demo/buildDemo';
import { DEMO_CUSTOMERS, DEMO_REFERENCE_DATE } from '@/data/demo/demoCustomers';
import { HOOK_TEMPLATES, LIFE_EVENT_INFO, NEED_REASON_TEXTS, reasonText } from '@/data/reference';
import type { Need } from '@/data/schemas';
import { groupViews, latestDecisions, needViews } from './decisions';
import { assessNeeds } from './engine';
import { needFacts, type NeedFacts } from './facts';
import { selectHooks } from './hooks';
import { REASON_CODES } from './types';

const TODAY = '2026-10-01';
const EVENT_NAMES = Object.fromEntries(
  LIFE_EVENT_KINDS.map((kind) => [kind, LIFE_EVENT_INFO[kind].name]),
) as Record<(typeof LIFE_EVENT_KINDS)[number], string>;

function facts(
  patch: Partial<NeedFacts> = {},
  contracts: Partial<Record<ProductLine, ContractStatus>> = {},
): NeedFacts {
  return {
    today: TODAY,
    age: 24,
    minor: 'no',
    children: 0,
    events: [],
    lifePhase: 'careerStart',
    housing: 'rent',
    ...patch,
    contracts: {
      ...(Object.fromEntries(PRODUCT_LINES.map((line) => [line, 'open'])) as Record<
        ProductLine,
        ContractStatus
      >),
      ...contracts,
    },
  };
}

let counter = 0;
function need(patch: Partial<Need>): Need {
  counter += 1;
  return {
    id: crypto.randomUUID(),
    customerId: crypto.randomUUID(),
    productLine: 'bu',
    timing: 'now',
    priority: 1,
    status: 'accepted',
    source: 'rule',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: `2026-09-${String(counter).padStart(2, '0')}T10:00:00.000Z`,
    ...patch,
  };
}

describe('decisions', () => {
  const assessments = assessNeeds(facts({ employerBav: true }));
  const bu = assessments.find((a) => a.line === 'bu')!;

  it('shows suggestions without decisions', () => {
    const views = needViews(assessments, []);
    expect(views.every((v) => v.state === 'suggested' && !v.recheck)).toBe(true);
    expect(groupViews(views).now.map((v) => v.line)).toContain('bu');
  });

  it('keeps accepted, dismissed and adjusted decisions', () => {
    const views = needViews(assessments, [
      need({ productLine: 'bu', basis: bu.basis }),
      need({ productLine: 'household', status: 'dismissed', basis: 'x' }),
      need({
        productLine: 'accident',
        timing: 'now',
        priority: 1,
        source: 'manual',
        reason: 'Kletterhalle',
      }),
    ]);
    const byLine = Object.fromEntries(views.map((v) => [v.line, v]));
    expect(byLine.bu).toMatchObject({ state: 'accepted', group: 'now', recheck: false });
    expect(byLine.household).toMatchObject({
      state: 'dismissed',
      group: 'dismissed',
      recheck: true,
    });
    // Manual change: own timing and priority (accident is "later" by the rules).
    expect(byLine.accident).toMatchObject({ state: 'adjusted', group: 'now', priority: 1 });
  });

  it('flags a decision when the facts change the suggestion', () => {
    const decision = need({
      productLine: 'occupationalPension',
      basis: assessments.find((a) => a.line === 'occupationalPension')!.basis,
    });
    const changed = assessNeeds(facts({ employerBav: false }));
    const view = needViews(changed, [decision]).find((v) => v.line === 'occupationalPension');
    expect(view?.recheck).toBe(true);
    // A concluded contract settles everything: no hint.
    const concluded = assessNeeds(
      facts({ employerBav: false }, { occupationalPension: 'concluded' }),
    );
    expect(
      needViews(concluded, [decision]).find((v) => v.line === 'occupationalPension'),
    ).toMatchObject({
      group: 'covered',
      recheck: false,
    });
  });

  it('uses the latest decision per line and ignores open records', () => {
    const older = need({
      productLine: 'bu',
      status: 'dismissed',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const newer = need({
      productLine: 'bu',
      status: 'accepted',
      updatedAt: '2026-02-01T00:00:00.000Z',
    });
    const open = need({ productLine: 'car', status: 'open' });
    const latest = latestDecisions([newer, older, open]);
    expect(latest.get('bu')?.id).toBe(newer.id);
    expect(latest.has('car')).toBe(false);
  });
});

describe('reason texts and hook templates', () => {
  it('have a text for every reason code, without unfilled placeholders', () => {
    for (const code of REASON_CODES) {
      const text = NEED_REASON_TEXTS[code]({ code, event: 'trainingEnd', date: '2027-01' });
      expect(text.length, code).toBeGreaterThan(5);
      expect(text).not.toMatch(/undefined|\{/);
      expect(reasonText({ code })).not.toMatch(/undefined/);
    }
  });

  it('templates use known placeholders and unique ids', () => {
    const ids = HOOK_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of HOOK_TEMPLATES) {
      for (const [, key] of template.text.matchAll(/\{(\w+)\}/g)) {
        expect(['month', 'months', 'age', 'event'], template.id).toContain(key);
      }
    }
    expect(HOOK_TEMPLATES.filter((t) => t.when.type === 'fallback').length).toBeGreaterThanOrEqual(
      3,
    );
  });
});

describe('hook selection', () => {
  it('fills placeholders and prefers urgent needs', () => {
    const f = facts(
      { age: 27, events: [{ kind: 'salaryIncrease', date: '2026-05' }] },
      { bu: 'concluded' },
    );
    const views = needViews(assessNeeds(f), []);
    const hooks = selectHooks(f, views, HOOK_TEMPLATES, { eventNames: EVENT_NAMES });
    expect(hooks[0]?.text).toBe(
      'Neues Gehalt seit Mai – deine BU deckt noch das alte Niveau. Die Erhöhung geht ohne Gesundheitsfragen, aber nur befristet.',
    );
    expect(hooks.length).toBeGreaterThanOrEqual(3);
    expect(hooks.length).toBeLessThanOrEqual(5);
    expect(hooks.every((h) => !/\{|undefined/.test(h.text))).toBe(true);
  });

  it('skips dismissed needs and fills up with general hooks', () => {
    const f = facts(
      { lifePhase: undefined, housing: undefined },
      Object.fromEntries(PRODUCT_LINES.map((l) => [l, 'concluded'])),
    );
    const hooks = selectHooks(f, needViews(assessNeeds(f), []), HOOK_TEMPLATES, {
      eventNames: EVENT_NAMES,
    });
    expect(hooks.map((h) => h.id)).toEqual(['fallback-changes', 'fallback-sums', 'fallback-plans']);

    const g = facts({ employerVl: true });
    const assessments = assessNeeds(g);
    const dismissed = need({ productLine: 'capitalFormation', status: 'dismissed' });
    const hooks2 = selectHooks(g, needViews(assessments, [dismissed]), HOOK_TEMPLATES, {
      eventNames: EVENT_NAMES,
    });
    expect(hooks2.some((h) => h.line === 'capitalFormation')).toBe(false);
  });

  it('gives every test customer 3–5 hooks', () => {
    for (const source of DEMO_CUSTOMERS) {
      const build = buildDemoCustomer(source, {
        today: DEMO_REFERENCE_DATE,
        now: `${DEMO_REFERENCE_DATE}T12:00:00.000Z`,
        number: 'K-0001',
      });
      const f = needFacts(build.customer, build.lifeEvents, DEMO_REFERENCE_DATE);
      const hooks = selectHooks(f, needViews(assessNeeds(f), []), HOOK_TEMPLATES, {
        eventNames: EVENT_NAMES,
      });
      expect(hooks.length, source.key).toBeGreaterThanOrEqual(3);
      expect(hooks.length, source.key).toBeLessThanOrEqual(5);
    }
  });
});
