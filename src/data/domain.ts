/**
 * Keys of the domain model (CLAUDE.md "Fachmodell"). Names, descriptions and rules live in
 * src/data/reference.
 */

/** Product lines in priority order: 1 existential (BU, liability, car), 2 important, 3 optional. */
export const PRODUCT_LINES = [
  'bu',
  'liability',
  'car',
  'accident',
  'investmentPension',
  'occupationalPension',
  'capitalFormation',
  'fundSavings',
  'household',
] as const;
export type ProductLine = (typeof PRODUCT_LINES)[number];

export const CONTRACT_STATUSES = [
  'concluded',
  'planned',
  'offered',
  'declined',
  'no',
  'notRelevant',
  'open',
  'viaParents',
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const LIFE_PHASES = [
  'school',
  'training',
  'studies',
  'careerStart',
  'movingOut',
  'partnership',
  'family',
  'property',
  'retirement',
] as const;
export type LifePhase = (typeof LIFE_PHASES)[number];

export const LIFE_EVENT_KINDS = [
  'trainingStart',
  'trainingEnd',
  'eighteenthBirthday',
  'driversLicense',
  'salaryIncrease',
  'jobChange',
  'move',
  'marriage',
  'childBirth',
  'parentalLeaveEnd',
  'propertyPurchase',
  'annualReview',
] as const;
export type LifeEventKind = (typeof LIFE_EVENT_KINDS)[number];

export const TOPICS = [
  'incomeProtection',
  'liabilityAndProperty',
  'wealthBuilding',
  'retirementProvision',
] as const;
export type Topic = (typeof TOPICS)[number];

export const HOUSING = ['parents', 'sharedFlat', 'rent', 'owned'] as const;
export type Housing = (typeof HOUSING)[number];

export const MARITAL_STATUSES = [
  'single',
  'partnership',
  'married',
  'divorced',
  'widowed',
] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const RISK_PROFILES = ['conservative', 'balanced', 'growth'] as const;
export type RiskProfile = (typeof RISK_PROFILES)[number];

export const POTENTIALS = ['high', 'medium', 'low'] as const;
export type Potential = (typeof POTENTIALS)[number];

export const CONTACT_CHANNELS = ['phone', 'whatsapp', 'email', 'inPerson'] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const NEED_TIMINGS = ['now', 'later', 'notUseful'] as const;
export type NeedTiming = (typeof NEED_TIMINGS)[number];

export const NEED_STATUSES = ['open', 'accepted', 'dismissed', 'done'] as const;
export type NeedStatus = (typeof NEED_STATUSES)[number];

/** 1 existential, 2 important, 3 optional. */
export const PRIORITIES = [1, 2, 3] as const;
export type Priority = (typeof PRIORITIES)[number];

export const REMINDER_KINDS = [
  'trainingEnd',
  'eighteenthBirthday',
  'annualReview',
  'lifeEvent',
  'manual',
] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const CAMPAIGN_KINDS = ['seminar', 'invitation', 'other'] as const;
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number];

/** Free-text answers from the question catalogue (customer.answers). */
export const ANSWER_KEYS = [
  'takeover',
  'reserves',
  'goalsShort',
  'goalsMid',
  'goalsLong',
  'sport',
  'vehicles',
  'pets',
  'travel',
  'experience',
  'horizon',
  'planMove',
  'planJob',
  'planPartner',
  'planEducation',
  'bestTime',
] as const;
export type AnswerKey = (typeof ANSWER_KEYS)[number];
