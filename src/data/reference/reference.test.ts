import { describe, expect, it } from 'vitest';
import { searchDocuments } from '@/core/search';
import { ANSWER_KEYS, LIFE_EVENT_KINDS, LIFE_PHASES, PRODUCT_LINES, TOPICS } from '../domain';
import { customerSchema } from '../schemas';
import {
  knowledgeDocuments,
  LIFE_EVENT_INFO,
  LIFE_PHASE_INFO,
  NEED_RULES,
  parseKnowledgeRef,
  phasesForProduct,
  PRIORITIZATION,
  PRODUCT_LINE_INFO,
  productLinesByPriority,
  productsTriggeredByEvent,
  QUESTIONNAIRE,
  TOPIC_INFO,
} from './index';
import {
  lifeEventInfoSchema,
  lifePhaseInfoSchema,
  needRuleSchema,
  priorityLevelSchema,
  productLineInfoSchema,
  questionnaireSchema,
  topicInfoSchema,
} from './schemas';

describe('reference data', () => {
  it('is complete and valid against the schemas', () => {
    for (const line of PRODUCT_LINES) {
      expect(productLineInfoSchema.parse(PRODUCT_LINE_INFO[line]).key).toBe(line);
      expect(needRuleSchema.parse(NEED_RULES[line]).productLine).toBe(line);
    }
    for (const phase of LIFE_PHASES) {
      expect(lifePhaseInfoSchema.parse(LIFE_PHASE_INFO[phase]).key).toBe(phase);
    }
    for (const event of LIFE_EVENT_KINDS) {
      expect(lifeEventInfoSchema.parse(LIFE_EVENT_INFO[event]).key).toBe(event);
    }
    for (const topic of TOPICS) {
      expect(topicInfoSchema.parse(TOPIC_INFO[topic]).key).toBe(topic);
    }
    questionnaireSchema.parse(QUESTIONNAIRE);
    PRIORITIZATION.levels.forEach((level) => priorityLevelSchema.parse(level));
  });

  it('maps every question to existing customer fields, each answer key once', () => {
    const fields = Object.keys(customerSchema.shape);
    const consents = ['dataStorage', 'marketing', 'contactChannel'];
    const keys = QUESTIONNAIRE.sections.flatMap((s) => s.questions.map((q) => q.key));
    expect(new Set(keys).size).toBe(keys.length);
    const answers: string[] = [];
    for (const question of QUESTIONNAIRE.sections.flatMap((s) => s.questions)) {
      for (const path of question.fields) {
        const [head = '', tail] = path.split('.');
        expect(fields, path).toContain(head);
        if (head === 'answers') answers.push(tail ?? '');
        if (head === 'consents') expect(consents).toContain(tail);
      }
    }
    expect(answers.sort()).toEqual([...ANSWER_KEYS].sort());
    expect(QUESTIONNAIRE.sections).toHaveLength(9);
  });

  it('keeps the priorities of CLAUDE.md and the need rules in line', () => {
    const byPriority = (p: number) =>
      PRODUCT_LINES.filter((l) => PRODUCT_LINE_INFO[l].priority === p);
    expect(byPriority(1)).toEqual(['bu', 'liability', 'car']);
    expect(byPriority(2)).toEqual([
      'accident',
      'investmentPension',
      'occupationalPension',
      'capitalFormation',
      'fundSavings',
    ]);
    expect(byPriority(3)).toEqual(['household']);
    for (const line of PRODUCT_LINES) {
      expect(NEED_RULES[line].priority).toBe(PRODUCT_LINE_INFO[line].priority);
    }
    expect(productLinesByPriority()[0]).toBe('bu');
    expect(productLinesByPriority().at(-1)).toBe('household');
  });

  it('links product lines and topics in both directions', () => {
    for (const line of PRODUCT_LINES) {
      for (const topic of PRODUCT_LINE_INFO[line].topics) {
        expect(TOPIC_INFO[topic].products as string[]).toContain(line);
      }
    }
    for (const topic of TOPICS) {
      for (const line of TOPIC_INFO[topic].products) {
        expect(PRODUCT_LINE_INFO[line].topics as string[]).toContain(topic);
      }
    }
  });

  it('only references existing events, phases and products', () => {
    const events = new Set<string>(LIFE_EVENT_KINDS);
    const phases = new Set<string>(LIFE_PHASES);
    const products = new Set<string>(PRODUCT_LINES);
    for (const line of PRODUCT_LINES) {
      NEED_RULES[line].triggers.events.forEach((e) => expect(events.has(e)).toBe(true));
      NEED_RULES[line].triggers.phases.forEach((p) => expect(phases.has(p)).toBe(true));
    }
    for (const phase of LIFE_PHASES) {
      const info = LIFE_PHASE_INFO[phase];
      info.typicalProducts.forEach((p) => expect(products.has(p)).toBe(true));
      info.typicalEvents.forEach((e) => expect(events.has(e)).toBe(true));
      info.relatedPhases.forEach((p) => {
        expect(phases.has(p)).toBe(true);
        expect(p).not.toBe(phase);
      });
    }
    // Every event and every product appears somewhere in the network of references.
    for (const event of LIFE_EVENT_KINDS) {
      const used =
        PRODUCT_LINES.some((l) =>
          (NEED_RULES[l].triggers.events as readonly string[]).includes(event),
        ) ||
        LIFE_PHASES.some((p) =>
          (LIFE_PHASE_INFO[p].typicalEvents as readonly string[]).includes(event),
        );
      expect(used, event).toBe(true);
    }
    // Kfz is not typical for a phase, it follows the driving licence.
    expect(PRODUCT_LINES.filter((line) => phasesForProduct(line).length === 0)).toEqual(['car']);
  });

  it('uses the reminder rules of CLAUDE.md', () => {
    expect(LIFE_EVENT_INFO.trainingEnd.reminder).toEqual({
      anchor: 'eventDate',
      offsetMonths: -3,
      firstOfMonth: true,
    });
    expect(LIFE_EVENT_INFO.eighteenthBirthday.reminder).toEqual({ anchor: 'birthday', age: 18 });
    expect(LIFE_EVENT_INFO.annualReview.reminder).toEqual({
      anchor: 'lastConversation',
      offsetMonths: 12,
    });
    expect(productsTriggeredByEvent('driversLicense')).toEqual(['car']);
  });

  it('never stores what the rules forbid', () => {
    const all = JSON.stringify([NEED_RULES, LIFE_EVENT_INFO, LIFE_PHASE_INFO, QUESTIONNAIRE]);
    expect(all).not.toMatch(/Vault/);
    expect(QUESTIONNAIRE.doNotStore.items.join(' ')).toMatch(/Gesundheitsdaten/);
  });

  it('parses knowledge routes and finds entries', () => {
    expect(parseKnowledgeRef('product', 'bu')).toEqual({ kind: 'product', key: 'bu' });
    expect(parseKnowledgeRef('product', 'nope')).toBeNull();
    expect(parseKnowledgeRef('customer', 'bu')).toBeNull();
    const docs = knowledgeDocuments();
    expect(docs).toHaveLength(
      PRODUCT_LINES.length + LIFE_PHASES.length + LIFE_EVENT_KINDS.length + TOPICS.length,
    );
    expect(searchDocuments(docs, 'Volljährigkeit')[0]?.ref).toEqual({
      kind: 'event',
      key: 'eighteenthBirthday',
    });
    expect(searchDocuments(docs, 'Studienende')[0]?.ref).toEqual({
      kind: 'event',
      key: 'trainingEnd',
    });
    expect(searchDocuments(docs, 'nachversicherung').map((d) => d.ref.key)).toContain('bu');
  });
});
