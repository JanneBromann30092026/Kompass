/** German names of the domain values (contract status, housing …). */
import type {
  CampaignKind,
  ContactChannel,
  ContractStatus,
  Employment,
  Housing,
  MaritalStatus,
  NeedStatus,
  NeedTiming,
  Potential,
  Priority,
  ReminderKind,
  RiskProfile,
} from '../domain';

export const CONTRACT_STATUS_LABELS = {
  concluded: 'abgeschlossen',
  planned: 'geplant',
  offered: 'angeboten',
  declined: 'abgelehnt',
  no: 'nein',
  notRelevant: 'nicht relevant',
  open: 'offen',
  viaParents: 'über Eltern',
} as const satisfies Record<ContractStatus, string>;

export const HOUSING_LABELS = {
  parents: 'bei den Eltern',
  sharedFlat: 'WG',
  rent: 'Miete',
  owned: 'Eigentum',
} as const satisfies Record<Housing, string>;

export const EMPLOYMENT_LABELS = {
  employee: 'angestellt',
  selfEmployed: 'selbständig',
  civilServant: 'verbeamtet (auch angehend)',
} as const satisfies Record<Employment, string>;

export const MARITAL_STATUS_LABELS = {
  single: 'ledig',
  partnership: 'in Partnerschaft',
  married: 'verheiratet',
  divorced: 'geschieden',
  widowed: 'verwitwet',
} as const satisfies Record<MaritalStatus, string>;

export const RISK_PROFILE_LABELS = {
  conservative: 'sicherheitsorientiert',
  balanced: 'ausgewogen',
  growth: 'wachstumsorientiert',
} as const satisfies Record<RiskProfile, string>;

export const POTENTIAL_LABELS = {
  high: 'hoch',
  medium: 'mittel',
  low: 'niedrig',
} as const satisfies Record<Potential, string>;

export const CONTACT_CHANNEL_LABELS = {
  phone: 'Telefon',
  whatsapp: 'WhatsApp',
  email: 'E-Mail',
  inPerson: 'Persönlich',
} as const satisfies Record<ContactChannel, string>;

export const NEED_TIMING_LABELS = {
  now: 'Sinnvoll jetzt',
  later: 'Später',
  notUseful: 'Nicht sinnvoll',
} as const satisfies Record<NeedTiming, string>;

export const NEED_STATUS_LABELS = {
  open: 'offen',
  accepted: 'übernommen',
  dismissed: 'verworfen',
  done: 'erledigt',
} as const satisfies Record<NeedStatus, string>;

export const PRIORITY_LABELS = {
  1: 'existenziell',
  2: 'wichtig',
  3: 'optional',
} as const satisfies Record<Priority, string>;

export const REMINDER_KIND_LABELS = {
  trainingEnd: 'Ausbildungsende',
  eighteenthBirthday: '18. Geburtstag',
  annualReview: 'Jahresgespräch',
  lifeEvent: 'Lebensereignis',
  manual: 'Termin',
} as const satisfies Record<ReminderKind, string>;

export const CAMPAIGN_KIND_LABELS = {
  seminar: 'Seminar',
  invitation: 'Einladung',
  other: 'Aktion',
} as const satisfies Record<CampaignKind, string>;
