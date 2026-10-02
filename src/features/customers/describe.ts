/** Human-readable history entries: field labels and values in German. */
import { formatCalendarDate, formatMoney } from '@/core/format';
import type { FieldChange } from '@/core/history';
import type { ProductLine } from '@/data/domain';
import {
  CONTACT_CHANNEL_LABELS,
  CONTRACT_STATUS_LABELS,
  EMPLOYMENT_LABELS,
  HOUSING_LABELS,
  LIFE_EVENT_INFO,
  LIFE_PHASE_INFO,
  MARITAL_STATUS_LABELS,
  NEED_STATUS_LABELS,
  NEED_TIMING_LABELS,
  POTENTIAL_LABELS,
  PRODUCT_LINE_INFO,
  REMINDER_KIND_LABELS,
  RISK_PROFILE_LABELS,
} from '@/data/reference';
import type { HistoryEntity } from '@/data/schemas';
import { de } from '@/i18n/de';
import { answerLabel } from './labels';

const f = de.customers.fields;
const h = de.customers.file.historyFields;

const CONSENT_LABELS: Record<string, string> = {
  dataStorage: f.dataStorage,
  marketing: f.marketing,
  contactChannel: f.contactChannel,
};

/** Label of a changed field, e.g. "Vertrag BU" or "Werbung / Seminar-Einladung". */
export function fieldLabel(entity: HistoryEntity, path: string): string {
  const [head = '', second = '', third = ''] = path.split('.');
  if (entity !== 'customer') return ((h as Record<string, unknown>)[head] as string) ?? path;
  if (head === 'contracts') {
    return h.contract(PRODUCT_LINE_INFO[second as ProductLine]?.name ?? second);
  }
  if (head === 'answers') return answerLabel(second);
  if (head === 'consents' || head === 'parentalConsent') {
    const label =
      head === 'parentalConsent' ? f.parentalConsent : (CONSENT_LABELS[second] ?? second);
    const leaf = head === 'parentalConsent' ? second : third;
    return leaf === 'date' ? h.consentDate(label) : label;
  }
  const labels = f as Record<string, unknown>;
  return typeof labels[head] === 'string' ? labels[head] : path;
}

const MONEY_FIELDS = new Set(['netIncome', 'fixedCosts', 'disposableIncome']);

const ENUM_LABELS: Record<string, Record<string, string>> = {
  housing: HOUSING_LABELS,
  employment: EMPLOYMENT_LABELS,
  maritalStatus: MARITAL_STATUS_LABELS,
  riskProfile: RISK_PROFILE_LABELS,
  potential: POTENTIAL_LABELS,
  channel: CONTACT_CHANNEL_LABELS,
  timing: NEED_TIMING_LABELS,
  status: NEED_STATUS_LABELS,
};

const MAX_TEXT = 80;

/** A value as text ("–" for none). */
export function valueText(entity: HistoryEntity, path: string, value: unknown): string {
  if (value === undefined || value === null || value === '') return de.customers.file.emptyValue;
  const head = path.split('.')[0] ?? '';
  const leaf = path.split('.').at(-1) ?? '';
  if (typeof value === 'boolean') {
    if (leaf === 'granted') return value ? f.granted : f.refused;
    return value ? f.yes : f.no;
  }
  if (typeof value === 'number') return MONEY_FIELDS.has(head) ? formatMoney(value) : String(value);
  if (Array.isArray(value)) return value.map((item) => valueText(entity, path, item)).join(', ');
  if (typeof value === 'object') {
    // A whole consent or channel object (created / removed at once).
    const record = value as Record<string, unknown>;
    if ('channel' in record) return valueText(entity, 'channel', record.channel);
    if ('granted' in record) {
      const date = typeof record.date === 'string' ? ` (${formatCalendarDate(record.date)})` : '';
      return `${valueText(entity, 'granted', record.granted)}${date}`;
    }
    return JSON.stringify(value);
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const lookup = (table: Readonly<Record<string, { name: string } | string>>) => {
    const entry = table[text];
    return typeof entry === 'string' ? entry : entry?.name;
  };
  const named =
    head === 'contracts'
      ? lookup(CONTRACT_STATUS_LABELS)
      : head === 'lifePhase'
        ? lookup(LIFE_PHASE_INFO)
        : head === 'productLine'
          ? lookup(PRODUCT_LINE_INFO)
          : head === 'kind' && entity === 'lifeEvent'
            ? lookup(LIFE_EVENT_INFO)
            : head === 'kind' && entity === 'reminder'
              ? lookup(REMINDER_KIND_LABELS)
              : undefined;
  if (named) return named;
  const labels = ENUM_LABELS[leaf] ?? ENUM_LABELS[head];
  if (labels?.[text]) return labels[text];
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(text)) return formatCalendarDate(text);
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text;
}

export interface DescribedChange {
  label: string;
  from: string;
  to: string;
  /** Lists (tags, open points): only what was removed (−) and added (+). */
  diff?: string;
}

function listDiff(entity: HistoryEntity, path: string, from: unknown[], to: unknown[]): string {
  const text = (items: unknown[]) => items.map((item) => valueText(entity, path, item)).join(', ');
  const removed = from.filter((item) => !to.includes(item));
  const added = to.filter((item) => !from.includes(item));
  return [removed.length > 0 && `− ${text(removed)}`, added.length > 0 && `+ ${text(added)}`]
    .filter(Boolean)
    .join(' · ');
}

export function describeChange(entity: HistoryEntity, change: FieldChange): DescribedChange {
  const described: DescribedChange = {
    label: fieldLabel(entity, change.path),
    from: valueText(entity, change.path, change.from),
    to: valueText(entity, change.path, change.to),
  };
  if (Array.isArray(change.from) || Array.isArray(change.to)) {
    const from = Array.isArray(change.from) ? change.from : [];
    const to = Array.isArray(change.to) ? change.to : [];
    described.diff = listDiff(entity, change.path, from, to);
  }
  return described;
}
