/**
 * zod schemas of the decrypted records. Everything here is personal data and is only
 * ever stored encrypted (src/data/repositories/rows.ts).
 */
import { z } from 'zod';
import { CUSTOMER_NUMBER_PATTERN } from '@/core/customerNumber';
import {
  ANSWER_KEYS,
  CAMPAIGN_KINDS,
  CONTACT_CHANNELS,
  CONTRACT_STATUSES,
  EMPLOYMENTS,
  HOUSING,
  LIFE_EVENT_KINDS,
  LIFE_PHASES,
  MARITAL_STATUSES,
  NEED_STATUSES,
  NEED_TIMINGS,
  POTENTIALS,
  PRODUCT_LINES,
  REMINDER_KINDS,
  RISK_PROFILES,
  type ProductLine,
} from './domain';

export const LIMITS = {
  settingKey: 100,
  name: 60,
  phone: 40,
  email: 120,
  occupation: 100,
  tag: 40,
  tags: 30,
  openPoint: 300,
  openPoints: 50,
  answer: 1_000,
  title: 120,
  text: 5_000,
  notes: 20_000,
  campaignMembers: 2_000,
} as const;

// --- Building blocks --------------------------------------------------------

const id = z.uuid();
const timestamp = z.iso.datetime();

/** Calendar date "JJJJ-MM-TT" (local time, no time zone). */
export const isoDate = z.iso.date();

/** Month "JJJJ-MM" (e.g. planned end of training). */
export const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

/** Trimmed string; empty strings become undefined (field removed). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value ? value : undefined))
    .optional();

const requiredText = (max: number) => z.string().trim().min(1).max(max);

const textList = (maxItem: number, maxItems: number) =>
  z
    .array(z.string().trim().min(1).max(maxItem))
    .max(maxItems)
    .transform((values) => [...new Set(values)]);

const consent = z.object({ granted: z.boolean(), date: isoDate });

const money = z.number().min(0).max(1_000_000).optional();

/** Free-text answers of the question catalogue; empty answers are removed. */
const answersSchema = z.object(
  Object.fromEntries(ANSWER_KEYS.map((key) => [key, optionalText(LIMITS.answer)])) as Record<
    (typeof ANSWER_KEYS)[number],
    ReturnType<typeof optionalText>
  >,
);

const contractStatus = z.enum(CONTRACT_STATUSES).default('open');

/** Status per product line; lines that were never discussed are "open". */
export const contractsSchema = z.object(
  Object.fromEntries(PRODUCT_LINES.map((line) => [line, contractStatus])) as Record<
    ProductLine,
    typeof contractStatus
  >,
);

// --- Customers -------------------------------------------------------------

const customerFields = {
  firstName: requiredText(LIMITS.name),
  lastName: optionalText(LIMITS.name),
  phone: optionalText(LIMITS.phone).refine((value) => !value || /^[+\d][\d\s/()-]*$/.test(value)),
  email: optionalText(LIMITS.email).refine((value) => !value || z.email().safeParse(value).success),
  /** Exact birth date; if unknown only birthYear is set. */
  birthDate: isoDate.optional(),
  birthYear: z.int().min(1900).max(2100).optional(),
  lifePhase: z.enum(LIFE_PHASES).optional(),
  occupation: optionalText(LIMITS.occupation),
  employment: z.enum(EMPLOYMENTS).optional(),
  trainingStart: yearMonth.optional(),
  trainingEnd: yearMonth.optional(),
  housing: z.enum(HOUSING).optional(),
  maritalStatus: z.enum(MARITAL_STATUSES).optional(),
  children: z.int().min(0).max(20).optional(),
  /** Approximate monthly amounts in euros. */
  netIncome: money,
  fixedCosts: money,
  disposableIncome: money,
  /** Does the employer pay capital-forming benefits (VL) / a company pension (bAV)? */
  employerVl: z.boolean().optional(),
  employerBav: z.boolean().optional(),
  riskProfile: z.enum(RISK_PROFILES).optional(),
  /** Only whether the health check is done – never health data itself. */
  healthCheckDone: z.boolean().optional(),
  consents: z
    .object({
      dataStorage: consent.optional(),
      marketing: consent.optional(),
      contactChannel: z.object({ channel: z.enum(CONTACT_CHANNELS), date: isoDate }).optional(),
    })
    .default({}),
  /** Minors: consent of the parents for advice and contracts. */
  parentalConsent: consent.optional(),
  contracts: contractsSchema.default(() => contractsSchema.parse({})),
  potential: z.enum(POTENTIALS).optional(),
  tags: textList(LIMITS.tag, LIMITS.tags).default([]),
  /** Unknown facts to ask for in the next conversation. */
  openPoints: textList(LIMITS.openPoint, LIMITS.openPoints).default([]),
  answers: answersSchema.default({}),
  /** Archived customers are hidden from lists but kept (instead of deleting). */
  archived: z.boolean().default(false),
  /** Invented demo/test customer (removable in one go). */
  demo: z.boolean().default(false),
};

const birthYearMatchesDate = (value: { birthDate?: string; birthYear?: number }) =>
  !value.birthDate || !value.birthYear || Number(value.birthDate.slice(0, 4)) === value.birthYear;

export const customerInputSchema = z
  .object(customerFields)
  .refine(birthYearMatchesDate, { path: ['birthYear'] });
export type CustomerInput = z.input<typeof customerInputSchema>;

export const customerSchema = z
  .object({
    id,
    number: z.string().regex(CUSTOMER_NUMBER_PATTERN),
    ...customerFields,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .refine(birthYearMatchesDate, { path: ['birthYear'] });
export type Customer = z.output<typeof customerSchema>;

// --- Records belonging to a customer ----------------------------------------

const linkedBase = { id, customerId: id, createdAt: timestamp, updatedAt: timestamp };

const needFields = {
  productLine: z.enum(PRODUCT_LINES),
  timing: z.enum(NEED_TIMINGS),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  reason: optionalText(LIMITS.text),
  status: z.enum(NEED_STATUSES).default('open'),
  source: z.enum(['rule', 'manual']).default('manual'),
  /**
   * Fingerprint of the engine's suggestion when the decision was made; if the facts
   * change the suggestion, the decision is flagged "neu prüfen".
   */
  basis: z.string().max(2_000).optional(),
};
export const needInputSchema = z.object(needFields);
export const needSchema = z.object({ ...linkedBase, ...needFields });
export type Need = z.output<typeof needSchema>;

const reminderFields = {
  dueDate: isoDate,
  kind: z.enum(REMINDER_KINDS),
  title: requiredText(LIMITS.title),
  todo: optionalText(LIMITS.text),
  /** Derived from the birth year only: the exact date still needs checking. */
  dateToCheck: z.boolean().default(false),
  done: z.boolean().default(false),
  doneAt: timestamp.optional(),
};
export const reminderInputSchema = z.object(reminderFields);
export const reminderSchema = z.object({ ...linkedBase, ...reminderFields });
export type Reminder = z.output<typeof reminderSchema>;

const lifeEventFields = {
  kind: z.enum(LIFE_EVENT_KINDS),
  date: z.union([isoDate, yearMonth]).optional(),
  note: optionalText(LIMITS.text),
};
export const lifeEventInputSchema = z.object(lifeEventFields);
export const lifeEventSchema = z.object({ ...linkedBase, ...lifeEventFields });
export type LifeEvent = z.output<typeof lifeEventSchema>;

const conversationFields = {
  date: isoDate,
  title: optionalText(LIMITS.title),
  notes: z.string().trim().max(LIMITS.notes).default(''),
};
export const conversationInputSchema = z.object(conversationFields);
export const conversationSchema = z.object({ ...linkedBase, ...conversationFields });
export type Conversation = z.output<typeof conversationSchema>;

// --- Campaigns --------------------------------------------------------------

const campaignFields = {
  name: requiredText(LIMITS.title),
  kind: z.enum(CAMPAIGN_KINDS),
  date: isoDate.optional(),
  notes: optionalText(LIMITS.text),
  invitedCustomerIds: z.array(id).max(LIMITS.campaignMembers).default([]),
};
export const campaignInputSchema = z.object(campaignFields);
export const campaignSchema = z.object({
  id,
  ...campaignFields,
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type Campaign = z.output<typeof campaignSchema>;

// --- History ----------------------------------------------------------------

export const HISTORY_ENTITIES = [
  'customer',
  'need',
  'reminder',
  'lifeEvent',
  'conversation',
] as const;
export type HistoryEntity = (typeof HISTORY_ENTITIES)[number];

export const historyEntrySchema = z.object({
  id,
  customerId: id,
  /** Time of the change. */
  updatedAt: timestamp,
  entity: z.enum(HISTORY_ENTITIES),
  entityId: id,
  action: z.enum(['created', 'updated', 'deleted']),
  changes: z.array(
    z.object({ path: z.string(), from: z.unknown().optional(), to: z.unknown().optional() }),
  ),
});
export type HistoryEntry = z.output<typeof historyEntrySchema>;

// --- Drafts -----------------------------------------------------------------

export const DRAFT_KINDS = ['newCustomer'] as const;

/** Unfinished input that survives locking and reloading (encrypted like everything else). */
export const draftSchema = z.object({
  id,
  kind: z.enum(DRAFT_KINDS),
  /** Position in a multi-step form. */
  step: z.int().min(0).max(100),
  data: z.record(z.string(), z.unknown()),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type Draft = z.output<typeof draftSchema>;

// --- Settings -------------------------------------------------------------

export const settingKeySchema = requiredText(LIMITS.settingKey);
