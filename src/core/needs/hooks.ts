/**
 * Conversation hooks: templates (data in src/data/reference/hooks.ts) matched against the
 * needs, life events and the life phase; the 3–5 most fitting ones per customer.
 */
import type { LifeEventKind, LifePhase, ProductLine } from '@/data/domain';
import { monthsUntil, type DatedEvent, type NeedFacts } from './facts';
import type { NeedGroup, NeedView } from './decisions';
import type { NeedKind, ReasonCode } from './types';

export type HookCondition =
  | {
      type: 'need';
      line: ProductLine;
      groups?: NeedGroup[];
      kinds?: NeedKind[];
      reason?: ReasonCode;
      /** Only if the reason refers to this event. */
      reasonEvent?: LifeEventKind;
    }
  | { type: 'event'; event: LifeEventKind; window: 'upcoming' | 'recent' }
  | { type: 'phase'; phase: LifePhase }
  | { type: 'fallback' };

export interface HookTemplate {
  id: string;
  when: HookCondition;
  /** Placeholders: {month} (event month), {months} (months until), {age}, {event}. */
  text: string;
}

export interface Hook {
  id: string;
  text: string;
  line?: ProductLine;
  event?: LifeEventKind;
}

export interface HookOptions {
  max?: number;
  min?: number;
  /** Event names for {event}. */
  eventNames: Readonly<Record<LifeEventKind, string>>;
}

const MONTH_FORMAT = new Intl.DateTimeFormat('de-DE', { month: 'long', timeZone: 'UTC' });

function monthName(date: string, today: string): string {
  const [y = 1970, m = 1] = date.split('-').map(Number);
  const name = MONTH_FORMAT.format(new Date(Date.UTC(y, m - 1, 15)));
  return String(y) === today.slice(0, 4) ? name : `${name} ${y}`;
}

interface Candidate {
  template: HookTemplate;
  score: number;
  event?: DatedEvent;
  line?: ProductLine;
}

function fill(text: string, values: Record<string, string | undefined>): string | null {
  let missing = false;
  const result = text.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined) missing = true;
    return value ?? '';
  });
  return missing ? null : result;
}

function needScore(view: NeedView): number {
  const base = view.group === 'now' ? 100 - (view.priority - 1) * 10 : 50 - (view.priority - 1) * 5;
  const kind = view.assessment.kind;
  return base + (kind === 'adjust' ? 5 : kind === 'pending' ? 3 : 0);
}

function eventScore(months: number, window: 'upcoming' | 'recent'): number {
  const distance = Math.abs(months);
  if (window === 'upcoming')
    return distance <= 3 ? 90 : distance <= 6 ? 75 : distance <= 12 ? 55 : 40;
  return distance <= 3 ? 80 : distance <= 6 ? 65 : 45;
}

function candidates(
  facts: NeedFacts,
  views: readonly NeedView[],
  templates: readonly HookTemplate[],
): Candidate[] {
  const result: Candidate[] = [];
  templates.forEach((template, index) => {
    const when = template.when;
    switch (when.type) {
      case 'need': {
        const view = views.find((v) => v.line === when.line);
        if (!view || view.group === 'dismissed' || view.group === 'covered') return;
        if (view.group === 'notUseful') return;
        if (when.groups && !when.groups.includes(view.group)) return;
        if (when.kinds && !when.kinds.includes(view.assessment.kind)) return;
        const reason = when.reason
          ? view.assessment.reasons.find(
              (r) => r.code === when.reason && (!when.reasonEvent || r.event === when.reasonEvent),
            )
          : view.assessment.reasons.find((r) => r.date);
        if (when.reason && !reason) return;
        const event =
          reason?.event && reason.date ? { kind: reason.event, date: reason.date } : undefined;
        // Specific templates (with a reason) win over generic ones of the same need.
        result.push({
          template,
          score: needScore(view) + (when.reason ? 4 : 0),
          event,
          line: view.line,
        });
        return;
      }
      case 'event': {
        const event = facts.events
          .filter((e) => e.kind === when.event && e.date)
          .map((e) => ({ e, m: monthsUntil(facts.today, e.date ?? '') }))
          .find(({ m }) => (when.window === 'upcoming' ? m > 0 && m <= 18 : m <= 0 && m >= -12));
        if (!event) return;
        result.push({ template, score: eventScore(event.m, when.window), event: event.e });
        return;
      }
      case 'phase':
        if (facts.lifePhase === when.phase) result.push({ template, score: 30 });
        return;
      case 'fallback':
        result.push({ template, score: 10 - index / 1000 });
        return;
    }
  });
  return result.sort((a, b) => b.score - a.score);
}

/** The most fitting hooks (3–5): at most one per product line and per event. */
export function selectHooks(
  facts: NeedFacts,
  views: readonly NeedView[],
  templates: readonly HookTemplate[],
  options: HookOptions,
): Hook[] {
  const max = options.max ?? 5;
  const min = options.min ?? 3;
  const chosen: Hook[] = [];
  const usedLines = new Set<ProductLine>();
  const usedEvents = new Set<LifeEventKind>();
  const all = candidates(facts, views, templates);

  const take = (candidate: Candidate): void => {
    const { template, event, line } = candidate;
    if (chosen.some((hook) => hook.id === template.id)) return;
    if (line && usedLines.has(line)) return;
    if (event && usedEvents.has(event.kind)) return;
    const text = fill(template.text, {
      month: event?.date ? monthName(event.date, facts.today) : undefined,
      months: event?.date
        ? String(Math.max(1, Math.round(monthsUntil(facts.today, event.date))))
        : undefined,
      age: facts.age === undefined ? undefined : String(facts.age),
      event: event ? options.eventNames[event.kind] : undefined,
    });
    if (!text || chosen.some((hook) => hook.text === text)) return;
    chosen.push({ id: template.id, text, line, event: event?.kind });
    if (line) usedLines.add(line);
    if (event) usedEvents.add(event.kind);
  };

  for (const candidate of all) {
    if (chosen.length >= max) break;
    if (candidate.template.when.type !== 'fallback') take(candidate);
  }
  for (const candidate of all) {
    if (chosen.length >= min) break;
    if (candidate.template.when.type === 'fallback') take(candidate);
  }
  return chosen;
}
