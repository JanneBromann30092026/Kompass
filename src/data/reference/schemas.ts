/**
 * zod schemas of the reference data (domain knowledge shipped with the app, not
 * encrypted – it contains no personal data). Validated in reference.test.ts.
 */
import { z } from 'zod';
import { LIFE_EVENT_KINDS, LIFE_PHASES, PRODUCT_LINES, TOPICS } from '../domain';

const text = z.string().trim().min(1);
const texts = z.array(text);
const priority = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const productLineInfoSchema = z.object({
  key: z.enum(PRODUCT_LINES),
  /** Short name as used in conversation, e.g. "BU", "bAV". */
  name: text,
  longName: text,
  priority,
  topics: z.array(z.enum(TOPICS)).min(1),
  description: text,
});

export const objectionSchema = z.object({ objection: text, answer: text });

export const needRuleSchema = z.object({
  productLine: z.enum(PRODUCT_LINES),
  priority,
  usefulWhen: texts.min(1),
  notUsefulWhen: texts.min(1),
  /** Events and phases that typically raise the need. */
  triggers: z.object({
    events: z.array(z.enum(LIFE_EVENT_KINDS)),
    phases: z.array(z.enum(LIFE_PHASES)),
  }),
  triggerNote: text.optional(),
  objections: z.array(objectionSchema),
  notes: texts,
});

export const lifePhaseInfoSchema = z.object({
  key: z.enum(LIFE_PHASES),
  name: text,
  description: text,
  note: text.optional(),
  typicalProducts: z.array(z.enum(PRODUCT_LINES)).min(1),
  typicalEvents: z.array(z.enum(LIFE_EVENT_KINDS)),
  /** Phases that often follow or overlap (e.g. "Auszug" during the training). */
  relatedPhases: z.array(z.enum(LIFE_PHASES)),
});

/**
 * When the reminder for an event is due (evaluated in step 6):
 * - eventDate: offset in months to the event date (negative = before), optionally on the 1st
 * - birthday: on the 18th birthday (only the year known → 1 January, "Datum prüfen")
 * - lastConversation: months after the last conversation
 * - immediately: as soon as the event is known
 */
export const reminderRuleSchema = z.discriminatedUnion('anchor', [
  z.object({
    anchor: z.literal('eventDate'),
    offsetMonths: z.int().min(-24).max(24),
    firstOfMonth: z.boolean(),
  }),
  z.object({ anchor: z.literal('birthday'), age: z.int().min(1).max(120) }),
  z.object({ anchor: z.literal('lastConversation'), offsetMonths: z.int().min(1).max(36) }),
  z.object({ anchor: z.literal('immediately') }),
]);

export const lifeEventInfoSchema = z.object({
  key: z.enum(LIFE_EVENT_KINDS),
  name: text,
  aliases: texts,
  description: text,
  reminder: reminderRuleSchema,
  /** The reminder rule in words. */
  reminderText: text,
  talkingPoints: texts.min(1),
});

export const topicInfoSchema = z.object({
  key: z.enum(TOPICS),
  name: text,
  description: text,
  products: z.array(z.enum(PRODUCT_LINES)).min(1),
});

/**
 * A question with the customer fields that answer it ("answers.<key>" for free text). It
 * counts as answered when one of them has a value; unanswered questions become open points.
 */
export const questionSchema = z.object({
  key: text,
  text,
  fields: texts.min(1),
  /** Only asked in these life phases (always, while the phase is unknown). */
  onlyFor: z.array(z.enum(LIFE_PHASES)).min(1).optional(),
});

export const questionnaireSchema = z.object({
  title: text,
  sections: z
    .array(z.object({ key: text, title: text, questions: z.array(questionSchema).min(1) }))
    .min(1),
  missingAnswers: text,
  doNotStore: z.object({ title: text, items: texts.min(1), optional: text }),
});

export const priorityLevelSchema = z.object({ level: priority, name: text, description: text });

export type ProductLineInfo = z.output<typeof productLineInfoSchema>;
export type NeedRule = z.output<typeof needRuleSchema>;
export type LifePhaseInfo = z.output<typeof lifePhaseInfoSchema>;
export type LifeEventInfo = z.output<typeof lifeEventInfoSchema>;
export type ReminderRule = z.output<typeof reminderRuleSchema>;
export type TopicInfo = z.output<typeof topicInfoSchema>;
export type Questionnaire = z.output<typeof questionnaireSchema>;
export type Question = z.output<typeof questionSchema>;
export type QuestionnaireSection = Questionnaire['sections'][number];
export type PriorityLevel = z.output<typeof priorityLevelSchema>;
