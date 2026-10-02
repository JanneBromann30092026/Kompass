import { describe, expect, it } from 'vitest';
import { needViews } from '@/core/needs/decisions';
import { assessNeeds } from '@/core/needs/engine';
import { needFacts } from '@/core/needs/facts';
import { selectHooks } from '@/core/needs/hooks';
import { buildDemoCustomer, noteSections } from '@/data/demo/buildDemo';
import { DEMO_CUSTOMERS, DEMO_REFERENCE_DATE } from '@/data/demo/demoCustomers';
import { LIFE_EVENT_KINDS, type LifeEventKind } from '@/data/domain';
import { HOOK_TEMPLATES, LIFE_EVENT_INFO } from '@/data/reference';
import { buildPreparation, PREPARATION_LIMITS } from './prepare';

const TODAY = DEMO_REFERENCE_DATE;
const EVENT_NAMES = Object.fromEntries(
  LIFE_EVENT_KINDS.map((kind) => [kind, LIFE_EVENT_INFO[kind].name]),
) as Record<LifeEventKind, string>;

function prepare(firstName: string) {
  const index = DEMO_CUSTOMERS.findIndex((c) => c.customer.firstName === firstName);
  const build = buildDemoCustomer(DEMO_CUSTOMERS[index]!, {
    today: TODAY,
    now: `${TODAY}T12:00:00.000Z`,
    number: `K-${String(index + 1).padStart(4, '0')}`,
  });
  const facts = needFacts(build.customer, build.lifeEvents, TODAY);
  const views = needViews(assessNeeds(facts), []);
  const hooks = selectHooks(facts, views, HOOK_TEMPLATES, { eventNames: EVENT_NAMES });
  return {
    build,
    preparation: buildPreparation({
      customer: build.customer,
      views,
      hooks,
      reminders: build.reminders,
      conversations: build.conversations,
      today: TODAY,
    }),
  };
}

describe('buildPreparation', () => {
  it('open needs by group and priority, three hooks, objections of the "now" needs', () => {
    const { preparation } = prepare('Ben');
    expect(preparation.needs.map((v) => `${v.group}:${v.line}`)).toEqual([
      'now:bu',
      'now:accident',
      'now:capitalFormation',
      'now:fundSavings',
      'later:liability',
      'later:car',
    ]);
    expect(preparation.needs).toHaveLength(PREPARATION_LIMITS.needs);
    expect(preparation.hooks).toHaveLength(3);
    expect(preparation.objections.map((g) => g.line)).toEqual([
      'bu',
      'accident',
      'capitalFormation',
    ]);
    for (const group of preparation.objections) {
      expect(group.items.length).toBeGreaterThan(0);
      expect(group.items.length).toBeLessThanOrEqual(PREPARATION_LIMITS.objectionsPerLine);
    }
  });

  it('reminders due within 30 days (overdue included), last conversation, open points', () => {
    const { build, preparation } = prepare('Ben');
    expect(preparation.reminders.map((r) => `${r.title} ${r.dueDate}`)).toEqual([
      'Ausbildungsende 2026-10-01',
    ]);
    expect(preparation.openPoints).toEqual(build.customer.openPoints);
    expect(preparation.lastConversation?.title).toBe('Beratung BU');
  });

  it('nothing open: no needs, no objections, fallback hooks', () => {
    const { preparation } = prepare('Ilka');
    expect(preparation.needs).toEqual([]);
    expect(preparation.objections).toEqual([]);
    expect(preparation.hooks.length).toBeGreaterThanOrEqual(3);
    // Ilka's overdue annual review is due.
    expect(preparation.reminders.map((r) => r.kind)).toEqual(['annualReview']);
  });

  it('reminders of other customers and completed ones are left out', () => {
    const { build } = prepare('Ben');
    const other = prepare('Leon').build;
    const done = build.reminders.map((r) => ({ ...r, done: true }));
    const preparation = buildPreparation({
      customer: build.customer,
      views: [],
      hooks: [],
      reminders: [...done, ...other.reminders],
      conversations: other.conversations,
      today: TODAY,
    });
    expect(preparation.reminders).toEqual([]);
    expect(preparation.lastConversation).toBeUndefined();
  });
});

describe('demo conversation notes', () => {
  it('split into the conversation fields', () => {
    expect(
      noteSections(
        [
          'Besprochen:',
          '- A',
          '',
          'Ergebnisse:',
          '- B',
          '',
          'Offen:',
          '- C',
          '',
          'Nächste Schritte:',
          '- D',
        ].join('\n'),
      ),
    ).toEqual({ discussed: '- A', results: '- B', openItems: '- C', nextSteps: '- D' });
    expect(noteSections('Nur ein Satz.')).toEqual({ discussed: 'Nur ein Satz.' });
    const { build } = prepare('Leon');
    expect(build.conversations[0]).toMatchObject({
      title: 'Erstgespräch',
      participants: 'Leon, Eltern',
      notes: '',
    });
    expect(build.conversations[0]?.results).toContain('BU abgeschlossen');
  });
});
