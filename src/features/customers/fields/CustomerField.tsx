import { useId } from 'react';
import { cn, Input, SegmentedControl, Select, TagInput, Textarea } from '@/components/ui';
import { normalizePhone } from '@/core/customers/phone';
import {
  CONTACT_CHANNELS,
  CONTRACT_STATUSES,
  HOUSING,
  LIFE_PHASES,
  MARITAL_STATUSES,
  POTENTIALS,
  PRODUCT_LINES,
  RISK_PROFILES,
  type AnswerKey,
  type ContactChannel,
  type ContractStatus,
  type ProductLine,
} from '@/data/domain';
import {
  CONTACT_CHANNEL_LABELS,
  CONTRACT_STATUS_LABELS,
  HOUSING_LABELS,
  LIFE_PHASE_INFO,
  MARITAL_STATUS_LABELS,
  POTENTIAL_LABELS,
  PRODUCT_LINE_INFO,
  RISK_PROFILE_LABELS,
} from '@/data/reference';
import { LIMITS } from '@/data/schemas';
import { de } from '@/i18n/de';
import { answerLabel } from '../labels';
import type { FieldKey, FormValues } from './fieldKeys';

const t = de.customers;
const f = t.fields;

interface Consent {
  granted: boolean;
  date: string;
}

export interface CustomerFieldProps {
  field: FieldKey;
  values: FormValues;
  onChange: (patch: FormValues) => void;
  error?: string;
  /** "JJJJ-MM-TT": default date of new consents. */
  today: string;
  /** Overrides the field's label (e.g. the question text in the catalogue). */
  label?: string;
}

/** Label above a group of controls that are not a single input. */
function GroupLabel({ id, children }: { id: string; children: string }) {
  return (
    <span id={id} data-field-label className="px-1 text-sm font-medium text-fg-secondary">
      {children}
    </span>
  );
}

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="px-1 text-sm text-danger" role="alert">
      {error}
    </p>
  );
}

/** Native picker with a "nicht angegeben" option for optional choices. */
function EnumSelect<T extends string>({
  label,
  value,
  options,
  labelOf,
  onChange,
  error,
}: {
  label: string;
  value: T | undefined;
  options: readonly T[];
  labelOf: (value: T) => string;
  onChange: (value: T | undefined) => void;
  error?: string;
}) {
  const items = [
    { value: '' as const, label: f.notSet },
    ...options.map((option) => ({ value: option, label: labelOf(option) })),
  ];
  return (
    <Select<T | ''>
      label={label}
      value={value ?? ''}
      options={items}
      onChange={(next) => onChange(next === '' ? undefined : next)}
      error={error}
    />
  );
}

function NumberInput({
  label,
  value,
  onChange,
  error,
  max = 1_000_000,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  error?: string;
  max?: number;
}) {
  return (
    <Input
      label={label}
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      value={value === undefined ? '' : String(value)}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, 7);
        onChange(digits ? Math.min(Number(digits), max) : undefined);
      }}
      error={error}
    />
  );
}

type TriValue = 'unknown' | 'yes' | 'no';

function TriState({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
  hint?: string;
}) {
  const current: TriValue = value === undefined ? 'unknown' : value ? 'yes' : 'no';
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <span className="flex flex-col">
        <span className="text-base text-fg">{label}</span>
        {hint && <span className="text-sm text-fg-muted">{hint}</span>}
      </span>
      <SegmentedControl<TriValue>
        label={label}
        value={current}
        options={[
          { value: 'unknown', label: f.unknown },
          { value: 'yes', label: f.yes },
          { value: 'no', label: f.no },
        ]}
        onChange={(next) => onChange(next === 'unknown' ? undefined : next === 'yes')}
      />
    </div>
  );
}

type ConsentValue = 'unknown' | 'granted' | 'refused';

function ConsentEditor({
  label,
  value,
  onChange,
  today,
  error,
  hint,
}: {
  label: string;
  value: Consent | undefined;
  onChange: (value: Consent | undefined) => void;
  today: string;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  const current: ConsentValue = !value ? 'unknown' : value.granted ? 'granted' : 'refused';
  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby={id}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="flex flex-col">
          <span id={id} className="text-base text-fg">
            {label}
          </span>
          {hint && <span className="text-sm text-fg-muted">{hint}</span>}
        </span>
        <SegmentedControl<ConsentValue>
          label={label}
          value={current}
          options={[
            { value: 'unknown', label: f.unknown },
            { value: 'granted', label: f.granted },
            { value: 'refused', label: f.refused },
          ]}
          onChange={(next) =>
            onChange(
              next === 'unknown'
                ? undefined
                : { granted: next === 'granted', date: value?.date ?? today },
            )
          }
        />
      </div>
      {value && (
        <Input
          type="date"
          label={f.consentDate}
          value={value.date}
          max={today}
          onChange={(event) => onChange({ ...value, date: event.target.value || today })}
          className="max-w-56"
        />
      )}
      <ErrorText error={error} />
    </div>
  );
}

type BirthMode = 'date' | 'year';

function BirthEditor({
  values,
  onChange,
  error,
  label,
}: {
  values: FormValues;
  onChange: (patch: FormValues) => void;
  error?: string;
  label: string;
}) {
  const id = useId();
  // Only the year known: the date field stays empty.
  const mode: BirthMode = values.birthYear !== undefined && !values.birthDate ? 'year' : 'date';
  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby={id}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <GroupLabel id={id}>{label}</GroupLabel>
        <SegmentedControl<BirthMode>
          label={f.birthMode}
          value={mode}
          options={[
            { value: 'date', label: f.birthModes.date },
            { value: 'year', label: f.birthModes.year },
          ]}
          onChange={(next) =>
            onChange(
              next === 'year'
                ? {
                    birthDate: undefined,
                    birthYear: values.birthDate
                      ? Number(values.birthDate.slice(0, 4))
                      : (values.birthYear ?? new Date().getFullYear() - 20),
                  }
                : { birthYear: undefined },
            )
          }
        />
      </div>
      {mode === 'date' ? (
        <Input
          type="date"
          aria-label={f.birthDate}
          value={values.birthDate ?? ''}
          min="1900-01-01"
          onChange={(event) =>
            onChange({ birthDate: event.target.value || undefined, birthYear: undefined })
          }
          className="max-w-56"
        />
      ) : (
        <Input
          aria-label={f.birthYear}
          inputMode="numeric"
          pattern="[0-9]*"
          value={values.birthYear === undefined ? '' : String(values.birthYear)}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
            onChange({ birthYear: digits ? Number(digits) : undefined });
          }}
          hint={t.hints.birthYear}
          className="max-w-40"
        />
      )}
      <ErrorText error={error} />
    </div>
  );
}

function ChannelEditor({
  values,
  onChange,
  today,
  label,
}: {
  values: FormValues;
  onChange: (patch: FormValues) => void;
  today: string;
  label: string;
}) {
  const consents = values.consents ?? {};
  return (
    <EnumSelect<ContactChannel>
      label={label}
      value={consents.contactChannel?.channel}
      options={CONTACT_CHANNELS}
      labelOf={(channel) => CONTACT_CHANNEL_LABELS[channel]}
      onChange={(channel) =>
        onChange({
          consents: {
            ...consents,
            contactChannel: channel
              ? { channel, date: consents.contactChannel?.date ?? today }
              : undefined,
          },
        })
      }
    />
  );
}

/** Status per product line ("offen" = not discussed yet). */
export function ContractsEditor({
  values,
  onChange,
}: {
  values: FormValues;
  onChange: (patch: FormValues) => void;
}) {
  const contracts = values.contracts ?? {};
  const statusOptions = CONTRACT_STATUSES.map((status) => ({
    value: status,
    label: CONTRACT_STATUS_LABELS[status],
  }));
  return (
    <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
      {PRODUCT_LINES.map((line: ProductLine) => (
        <Select<ContractStatus>
          key={line}
          label={`${PRODUCT_LINE_INFO[line].name} · ${PRODUCT_LINE_INFO[line].longName}`}
          value={contracts[line] ?? 'open'}
          options={statusOptions}
          onChange={(status) => onChange({ contracts: { ...contracts, [line]: status } })}
          data-testid={`contract-${line}`}
        />
      ))}
    </div>
  );
}

/** One editable customer field (used by the file's edit panels and the question catalogue). */
export function CustomerField({
  field,
  values,
  onChange,
  error,
  today,
  label,
}: CustomerFieldProps) {
  const text = (key: 'firstName' | 'lastName' | 'occupation') => (
    <Input
      label={label ?? f[key]}
      value={values[key] ?? ''}
      onChange={(event) => onChange({ [key]: event.target.value })}
      autoComplete="off"
      maxLength={key === 'occupation' ? LIMITS.occupation : LIMITS.name}
      placeholder={key === 'occupation' ? f.occupationPlaceholder : undefined}
      error={error}
      data-testid={`field-${key}`}
    />
  );
  const consents = values.consents ?? {};

  if (field.startsWith('answers.')) {
    const key = field.slice('answers.'.length) as AnswerKey;
    const answers = values.answers ?? {};
    return (
      <Textarea
        label={label ?? answerLabel(key)}
        value={answers[key] ?? ''}
        onChange={(event) => onChange({ answers: { ...answers, [key]: event.target.value } })}
        maxLength={LIMITS.answer}
        rows={2}
        hint={t.hints.health}
        error={error}
        data-testid={`field-answers-${key}`}
      />
    );
  }

  switch (field) {
    case 'firstName':
    case 'lastName':
    case 'occupation':
      return text(field);
    case 'phone':
      return (
        <Input
          label={label ?? f.phone}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={values.phone ?? ''}
          onChange={(event) => onChange({ phone: event.target.value })}
          onBlur={() => values.phone && onChange({ phone: normalizePhone(values.phone) })}
          maxLength={LIMITS.phone}
          hint={t.hints.phone}
          error={error}
          data-testid="field-phone"
        />
      );
    case 'email':
      return (
        <Input
          label={label ?? f.email}
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          value={values.email ?? ''}
          onChange={(event) => onChange({ email: event.target.value })}
          maxLength={LIMITS.email}
          error={error}
          data-testid="field-email"
        />
      );
    case 'birth':
      return (
        <BirthEditor values={values} onChange={onChange} error={error} label={label ?? f.birth} />
      );
    case 'maritalStatus':
      return (
        <EnumSelect
          label={label ?? f.maritalStatus}
          value={values.maritalStatus}
          options={MARITAL_STATUSES}
          labelOf={(v) => MARITAL_STATUS_LABELS[v]}
          onChange={(maritalStatus) => onChange({ maritalStatus })}
          error={error}
        />
      );
    case 'housing':
      return (
        <EnumSelect
          label={label ?? f.housing}
          value={values.housing}
          options={HOUSING}
          labelOf={(v) => HOUSING_LABELS[v]}
          onChange={(housing) => onChange({ housing })}
          error={error}
        />
      );
    case 'lifePhase':
      return (
        <EnumSelect
          label={label ?? f.lifePhase}
          value={values.lifePhase}
          options={LIFE_PHASES}
          labelOf={(v) => LIFE_PHASE_INFO[v].name}
          onChange={(lifePhase) => onChange({ lifePhase })}
          error={error}
        />
      );
    case 'riskProfile':
      return (
        <EnumSelect
          label={label ?? f.riskProfile}
          value={values.riskProfile}
          options={RISK_PROFILES}
          labelOf={(v) => RISK_PROFILE_LABELS[v]}
          onChange={(riskProfile) => onChange({ riskProfile })}
          error={error}
        />
      );
    case 'potential':
      return (
        <EnumSelect
          label={label ?? f.potential}
          value={values.potential}
          options={POTENTIALS}
          labelOf={(v) => POTENTIAL_LABELS[v]}
          onChange={(potential) => onChange({ potential })}
          error={error}
        />
      );
    case 'children':
      return (
        <NumberInput
          label={label ?? f.children}
          value={values.children}
          onChange={(children) => onChange({ children })}
          error={error}
          max={20}
        />
      );
    case 'netIncome':
    case 'fixedCosts':
    case 'disposableIncome':
      return (
        <NumberInput
          label={label ?? f[field]}
          value={values[field]}
          onChange={(amount) => onChange({ [field]: amount })}
          error={error}
        />
      );
    case 'trainingStart':
    case 'trainingEnd':
      return (
        <Input
          type="month"
          label={label ?? f[field]}
          value={values[field] ?? ''}
          onChange={(event) => onChange({ [field]: event.target.value || undefined })}
          error={error}
          className="max-w-56"
        />
      );
    case 'employerVl':
    case 'employerBav':
      return (
        <TriState
          label={label ?? f[field]}
          value={values[field]}
          onChange={(value) => onChange({ [field]: value })}
        />
      );
    case 'healthCheckDone':
      return (
        <TriState
          label={label ?? f.healthCheckDone}
          value={values.healthCheckDone}
          onChange={(healthCheckDone) => onChange({ healthCheckDone })}
          hint={t.hints.healthCheck}
        />
      );
    case 'tags':
      return (
        <TagInput
          label={label ?? f.tags}
          value={values.tags ?? []}
          onChange={(tags) => onChange({ tags })}
          placeholder={f.tagsPlaceholder}
          removeLabel={f.removeTag}
        />
      );
    case 'contactChannel':
      return (
        <ChannelEditor
          values={values}
          onChange={onChange}
          today={today}
          label={label ?? f.contactChannel}
        />
      );
    case 'dataStorage':
    case 'marketing':
      return (
        <ConsentEditor
          label={label ?? f[field]}
          value={consents[field]}
          onChange={(consent) => onChange({ consents: { ...consents, [field]: consent } })}
          today={today}
          error={error}
        />
      );
    case 'parentalConsent':
      return (
        <ConsentEditor
          label={label ?? f.parentalConsent}
          value={values.parentalConsent}
          onChange={(parentalConsent) => onChange({ parentalConsent })}
          today={today}
          error={error}
          hint={t.hints.parentalRequired}
        />
      );
    case 'contracts':
      return <ContractsEditor values={values} onChange={onChange} />;
  }
}

/** Stacks fields with consistent spacing; toggles and consents get a divider. */
export function FieldStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('flex flex-col gap-5', className)}>{children}</div>;
}
