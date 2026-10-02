/**
 * Reference data (domain knowledge): product lines, need rules, life phases, life events,
 * topics, question catalogue. Part of the code, not encrypted (no personal data).
 */
import type { SearchDocument } from '@/core/search';
import {
  LIFE_EVENT_KINDS,
  LIFE_PHASES,
  PRODUCT_LINES,
  TOPICS,
  type LifeEventKind,
  type LifePhase,
  type ProductLine,
  type Topic,
} from '../domain';
import { LIFE_EVENT_INFO } from './lifeEvents';
import { LIFE_PHASE_INFO } from './lifePhases';
import { NEED_RULES } from './needRules';
import { PRODUCT_LINE_INFO } from './productLines';
import { TOPIC_INFO } from './topics';

export { BIRTHDAY_GREETINGS, fillGreeting, GREETING_FORMS, type GreetingForm } from './greetings';
export { HOOK_TEMPLATES } from './hooks';
export { LIFE_EVENT_INFO } from './lifeEvents';
export { LIFE_PHASE_INFO } from './lifePhases';
export { NEED_RULES, PRIORITIZATION, RULE_DISCLAIMER } from './needRules';
export { NEED_REASON_TEXTS, reasonText } from './needTexts';
export { PRODUCT_LINE_INFO } from './productLines';
export { QUESTIONNAIRE } from './questionnaire';
export { TOPIC_INFO } from './topics';
export * from './labels';

/** Kinds of knowledge entries (route segment of /knowledge/:kind/:key). */
export const KNOWLEDGE_KINDS = ['product', 'phase', 'event', 'topic'] as const;
export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number];

export type KnowledgeRef =
  | { kind: 'product'; key: ProductLine }
  | { kind: 'phase'; key: LifePhase }
  | { kind: 'event'; key: LifeEventKind }
  | { kind: 'topic'; key: Topic };

const KEYS: Record<KnowledgeKind, readonly string[]> = {
  product: PRODUCT_LINES,
  phase: LIFE_PHASES,
  event: LIFE_EVENT_KINDS,
  topic: TOPICS,
};

/** Validates route parameters; null for unknown entries. */
export function parseKnowledgeRef(
  kind: string | undefined,
  key: string | undefined,
): KnowledgeRef | null {
  if (!kind || !key || !(kind in KEYS)) return null;
  if (!KEYS[kind as KnowledgeKind].includes(key)) return null;
  return { kind, key } as KnowledgeRef;
}

export function knowledgeTitle(ref: KnowledgeRef): string {
  switch (ref.kind) {
    case 'product':
      return PRODUCT_LINE_INFO[ref.key].name;
    case 'phase':
      return LIFE_PHASE_INFO[ref.key].name;
    case 'event':
      return LIFE_EVENT_INFO[ref.key].name;
    case 'topic':
      return TOPIC_INFO[ref.key].name;
  }
}

// --- Reverse lookups --------------------------------------------------------

/** Life phases in which a product line is typical. */
export function phasesForProduct(line: ProductLine): LifePhase[] {
  return LIFE_PHASES.filter((phase) => LIFE_PHASE_INFO[phase].typicalProducts.includes(line));
}

/** Product lines whose need rule is triggered by the event. */
export function productsTriggeredByEvent(event: LifeEventKind): ProductLine[] {
  return PRODUCT_LINES.filter((line) => NEED_RULES[line].triggers.events.includes(event));
}

/** Product lines whose need rule is triggered by entering the phase. */
export function productsTriggeredByPhase(phase: LifePhase): ProductLine[] {
  return PRODUCT_LINES.filter((line) => NEED_RULES[line].triggers.phases.includes(phase));
}

/** Life phases in which the event typically happens. */
export function phasesWithEvent(event: LifeEventKind): LifePhase[] {
  return LIFE_PHASES.filter((phase) => LIFE_PHASE_INFO[phase].typicalEvents.includes(event));
}

/** Product lines ordered by priority (1 first), then in the defined order. */
export function productLinesByPriority(): ProductLine[] {
  return [...PRODUCT_LINES].sort(
    (a, b) => PRODUCT_LINE_INFO[a].priority - PRODUCT_LINE_INFO[b].priority,
  );
}

// --- Search -----------------------------------------------------------------

export type KnowledgeDocument = SearchDocument & { ref: KnowledgeRef };

/** Everything findable in the knowledge view. */
export function knowledgeDocuments(): KnowledgeDocument[] {
  const products = PRODUCT_LINES.map((key): KnowledgeDocument => {
    const info = PRODUCT_LINE_INFO[key];
    const rule = NEED_RULES[key];
    return {
      ref: { kind: 'product', key },
      title: info.name,
      aliases: [info.longName],
      text: [
        info.description,
        ...rule.usefulWhen,
        ...rule.notUsefulWhen,
        rule.triggerNote ?? '',
        ...rule.objections.flatMap((o) => [o.objection, o.answer]),
        ...rule.notes,
      ],
    };
  });
  const phases = LIFE_PHASES.map((key): KnowledgeDocument => {
    const info = LIFE_PHASE_INFO[key];
    return {
      ref: { kind: 'phase', key },
      title: info.name,
      text: [info.description, info.note ?? ''],
    };
  });
  const events = LIFE_EVENT_KINDS.map((key): KnowledgeDocument => {
    const info = LIFE_EVENT_INFO[key];
    return {
      ref: { kind: 'event', key },
      title: info.name,
      aliases: info.aliases,
      text: [info.description, info.reminderText, ...info.talkingPoints],
    };
  });
  const topics = TOPICS.map((key): KnowledgeDocument => ({
    ref: { kind: 'topic', key },
    title: TOPIC_INFO[key].name,
    text: [TOPIC_INFO[key].description],
  }));
  return [...products, ...phases, ...events, ...topics];
}
