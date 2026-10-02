import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, CircleHelp, Pencil, X } from 'lucide-react';
import {
  Badge,
  Button,
  cn,
  ConfirmDialog,
  IconButton,
  ProgressBar,
  Surface,
  toast,
  useKeyboardInset,
} from '@/components/ui';
import { useToday } from '@/app/hooks/useToday';
import { useFocusModeRequest } from '@/app/shell/focusMode';
import { needsParentalConsent } from '@/core/customers/age';
import {
  isQuestionAnswered,
  mergeOpenPoints,
  unansweredOpenPoints,
  valueAt,
} from '@/core/customers/questionnaire';
import { customersRepo, draftsRepo, NEW_CUSTOMER_DRAFT_ID } from '@/data/repositories';
import { CONTRACT_STATUS_LABELS, PRODUCT_LINE_INFO, QUESTIONNAIRE } from '@/data/reference';
import type { CustomerInput } from '@/data/schemas';
import { de } from '@/i18n/de';
import { useReducedMotion } from '@/styles/useReducedMotion';
import { valueText } from '../describe';
import { CustomerField } from '../fields/CustomerField';
import type { FieldErrors, FieldKey, FormValues } from '../fields/fieldKeys';
import { errorsOf, formErrors } from '../fields/formValues';
import { questionCards, stepOfField, STEPS, SUMMARY_STEP, type QuestionCard } from './steps';

const t = de.customers.wizard;
const TOTAL = STEPS.length + 1;

interface WizardState {
  step: number;
  values: FormValues;
}

function restore(): WizardState | null {
  const draft = draftsRepo.get(NEW_CUSTOMER_DRAFT_ID);
  if (!draft) return null;
  return { step: Math.min(draft.step, SUMMARY_STEP), values: draft.data };
}

const hasContent = (state: WizardState) =>
  state.step > 0 ||
  Object.values(state.values).some((value) => value !== undefined && value !== '');

/**
 * Saves the draft encrypted after every change; one write at a time, the latest state wins.
 * Returns a function that stops saving and resolves once pending writes are done.
 */
function useDraftSaver(state: WizardState, enabled: boolean): () => Promise<void> {
  const chain = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef<WizardState | null>(null);
  const stopped = useRef(false);
  useEffect(() => {
    if (!enabled || stopped.current) return;
    latest.current = state;
    chain.current = chain.current.then(async () => {
      const current = latest.current;
      latest.current = null;
      if (!current || stopped.current) return;
      try {
        await draftsRepo.save(NEW_CUSTOMER_DRAFT_ID, 'newCustomer', current.step, current.values);
      } catch {
        // Locked meanwhile: the key is gone, the last saved state remains.
      }
    });
  }, [state, enabled]);
  return () => {
    stopped.current = true;
    return chain.current;
  };
}

function Card({
  card,
  values,
  errors,
  today,
  onChange,
}: {
  card: QuestionCard;
  values: FormValues;
  errors: FieldErrors;
  today: string;
  onChange: (patch: FormValues) => void;
}) {
  const answered = card.questions.some((q) => isQuestionAnswered(q, values));
  const single = card.fields.length === 1 && card.questions.length === 1;
  const title = card.questions.map((q) => q.text).join(' · ');
  const fields: FieldKey[] =
    card.fields.includes('marketing') && needsParentalConsent(values, today)
      ? [...card.fields, 'parentalConsent']
      : card.fields;
  return (
    <Surface className="flex flex-col gap-4" data-testid="wizard-question">
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-base font-semibold text-fg">{title}</h3>
        {!answered && (
          <Badge tone="amber" className="h-6 px-2.5">
            <CircleHelp size={13} aria-hidden />
            {de.customers.fields.unknown}
          </Badge>
        )}
      </div>
      {/* One question with one field: the heading says it, the field label is for screen readers. */}
      <div
        className={cn(
          'flex flex-col gap-4',
          single && '[&_[data-field-label]]:sr-only [&_label]:sr-only',
        )}
      >
        {fields.map((field) => (
          <CustomerField
            key={field}
            field={field}
            values={values}
            onChange={onChange}
            error={errors[field]}
            today={today}
            label={single ? title : undefined}
          />
        ))}
      </div>
      {card.fields.includes('contracts') && (
        <p className="text-sm text-fg-muted">{t.contractsHint}</p>
      )}
      {card.fields.includes('marketing') && (
        <p className="text-sm text-fg-muted">{t.consentsHint}</p>
      )}
    </Surface>
  );
}

function StepView({
  index,
  values,
  errors,
  today,
  onChange,
}: {
  index: number;
  values: FormValues;
  errors: FieldErrors;
  today: string;
  onChange: (patch: FormValues) => void;
}) {
  const step = STEPS[index];
  if (!step) return null;
  const cards = questionCards(step.section, values.lifePhase);
  const extra = (fields: FieldKey[]) =>
    fields.length > 0 && (
      <Surface className="flex flex-col gap-4">
        {fields.map((field) => (
          <CustomerField
            key={field}
            field={field}
            values={values}
            onChange={onChange}
            error={errors[field]}
            today={today}
          />
        ))}
        {(fields.includes('phone') || fields.includes('email')) && (
          <p className="text-sm text-fg-muted">{de.customers.hints.contact}</p>
        )}
      </Surface>
    );
  return (
    <div className="flex flex-col gap-4">
      {index === 0 && (
        <div className="flex flex-col gap-1 px-1">
          <h2 className="text-xl font-semibold tracking-tight text-fg">{t.start}</h2>
          <p className="text-base text-fg-secondary">{t.startText}</p>
        </div>
      )}
      {extra(step.before)}
      {cards.map((card) => (
        <Card
          key={card.questions[0]?.key}
          card={card}
          values={values}
          errors={errors}
          today={today}
          onChange={onChange}
        />
      ))}
      {extra(step.after)}
    </div>
  );
}

function contractsText(values: FormValues): string {
  const contracts = values.contracts ?? {};
  return Object.entries(contracts)
    .filter(([, status]) => status && status !== 'open')
    .map(
      ([line, status]) =>
        `${PRODUCT_LINE_INFO[line as keyof typeof PRODUCT_LINE_INFO].name}: ${CONTRACT_STATUS_LABELS[status]}`,
    )
    .join(', ');
}

function Summary({
  values,
  openPoints,
  onEdit,
}: {
  values: FormValues;
  openPoints: string[];
  onEdit: (step: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4" data-testid="wizard-summary">
      <p className="px-1 text-base text-fg-secondary">{t.summaryText}</p>
      <Surface className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-fg">
          <CircleHelp size={18} aria-hidden className="text-amber-fg" />
          {openPoints.length === 0 ? t.noOpenPoints : t.openPointsTitle(openPoints.length)}
        </h3>
        {openPoints.length > 0 && (
          <ul
            className="flex flex-col gap-1 text-sm text-fg-secondary"
            data-testid="wizard-open-points"
          >
            {openPoints.map((point) => (
              <li key={point}>• {point}</li>
            ))}
          </ul>
        )}
      </Surface>
      <div className="grid gap-4 wide:grid-cols-2">
        {STEPS.map((step, index) => {
          const rows = step.section.questions
            .filter((q) => isQuestionAnswered(q, values))
            .map((q) => ({
              label: q.text,
              value:
                q.fields[0] === 'contracts'
                  ? contractsText(values)
                  : q.fields
                      .map((path) => valueAt(values, path))
                      .filter((value) => value !== undefined && value !== '')
                      .map((value, i) => valueText('customer', q.fields[i] ?? '', value))
                      .join(' · '),
            }));
          const name =
            index === 0 ? [values.firstName, values.lastName].filter(Boolean).join(' ') : undefined;
          return (
            <Surface key={step.section.key} className="flex flex-col gap-2">
              <div className="-my-1 flex min-h-11 items-center gap-2">
                <h3 className="flex-1 text-base font-semibold text-fg">{step.section.title}</h3>
                <IconButton
                  icon={Pencil}
                  label={t.editStep(step.section.title)}
                  onClick={() => onEdit(index)}
                />
              </div>
              {name && <p className="text-base font-medium text-fg">{name}</p>}
              {rows.length === 0 && !name ? (
                <p className="text-sm text-fg-muted">{t.skipped}</p>
              ) : (
                <dl className="flex flex-col gap-1 text-sm">
                  {rows.map((row) => (
                    <div key={row.label} className="flex flex-wrap gap-x-2">
                      <dt className="text-fg-secondary">{row.label}:</dt>
                      <dd className="min-w-0 break-words text-fg">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Surface>
          );
        })}
      </div>
    </div>
  );
}

/** New customer through the question catalogue: step by step, every question skippable. */
export function NewCustomerPage() {
  const navigate = useNavigate();
  const today = useToday();
  const reduced = useReducedMotion();
  const keyboardInset = useKeyboardInset();
  useFocusModeRequest(true);
  const [restored] = useState(restore);
  const [state, setState] = useState<WizardState>(restored ?? { step: 0, values: {} });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [direction, setDirection] = useState(1);
  const [creating, setCreating] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stopSaving = useDraftSaver(state, hasContent(state));
  const { step, values } = state;
  const generated = unansweredOpenPoints(values, QUESTIONNAIRE);

  useEffect(() => {
    if (restored) toast.info(t.draftRestored);
  }, [restored]);

  // The keyboard covers the lower part: keep the focused field in view.
  useEffect(() => {
    if (!keyboardInset) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && scroller.current?.contains(active)) {
      active.scrollIntoView({ block: 'center' });
    }
  }, [keyboardInset]);

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setState((current) => ({ ...current, step: next }));
    setErrors({});
    scroller.current?.scrollTo({ top: 0 });
  };

  const change = (patch: FormValues) => {
    setState((current) => ({ ...current, values: { ...current.values, ...patch } }));
    setErrors({});
  };

  const next = () => {
    if (step === 0 && !values.firstName?.trim()) {
      setErrors({ firstName: de.customers.errors.required });
      return;
    }
    go(step + 1);
  };

  const create = async () => {
    const problems = formErrors(values, today);
    const firstProblem = Object.keys(problems)[0] as FieldKey | undefined;
    if (firstProblem) {
      go(stepOfField(firstProblem));
      setErrors(problems);
      return;
    }
    setCreating(true);
    try {
      const input: CustomerInput = {
        ...values,
        firstName: values.firstName ?? '',
        openPoints: mergeOpenPoints(values.openPoints ?? [], generated),
      };
      const customer = await customersRepo.create(input);
      await stopSaving();
      await draftsRepo.remove(NEW_CUSTOMER_DRAFT_ID);
      toast.success(t.created(customer.number));
      await navigate(`/customers/${customer.id}`, { replace: true });
    } catch (error: unknown) {
      const fieldErrors = errorsOf(error);
      if (fieldErrors) {
        go(stepOfField(Object.keys(fieldErrors)[0] as FieldKey));
        setErrors(fieldErrors);
      } else {
        toast.error(de.customers.errors.saveFailed);
      }
      setCreating(false);
    }
  };

  const leave = () => {
    if (hasContent(state)) setDiscarding(true);
    else void navigate('/customers');
  };

  const stepAnswered =
    step < SUMMARY_STEP &&
    (STEPS[step]?.section.questions.some((q) => isQuestionAnswered(q, values)) ?? false);
  const title = step === SUMMARY_STEP ? t.summary : (STEPS[step]?.section.title ?? '');

  return (
    <div className="flex h-full flex-col" data-testid="wizard">
      <header className="shrink-0 px-[max(1.5rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))] pb-3 wide:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <div className="flex min-h-11 items-center gap-3">
            <IconButton icon={X} label={t.cancel} onClick={leave} data-testid="wizard-cancel" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium text-fg-muted">
                {t.title} · {t.progress(step + 1, TOTAL)}
              </span>
              <h1
                className="truncate text-2xl font-semibold tracking-tight text-fg"
                data-testid="wizard-title"
              >
                {title}
              </h1>
            </div>
          </div>
          <ProgressBar value={(step + 1) / TOTAL} label={t.progress(step + 1, TOTAL)} />
        </div>
      </header>

      <div
        ref={scroller}
        data-scroll-container
        className="scroll-area min-h-0 flex-1 px-[max(1.5rem,env(safe-area-inset-left))] wide:px-8"
      >
        <form
          className="mx-auto w-full max-w-3xl pt-2 pb-8"
          onSubmit={(event) => {
            event.preventDefault();
            if (step < SUMMARY_STEP) next();
          }}
        >
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: reduced ? 0 : 24 * direction }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduced ? 0 : -24 * direction }}
              transition={{ duration: 0.2 }}
            >
              {step === SUMMARY_STEP ? (
                <Summary values={values} openPoints={generated} onEdit={go} />
              ) : (
                <StepView
                  index={step}
                  values={values}
                  errors={errors}
                  today={today}
                  onChange={change}
                />
              )}
            </motion.div>
          </AnimatePresence>
          {/* Enter in a single-line field goes on (hardware keyboard). */}
          <button type="submit" hidden aria-hidden tabIndex={-1} />
        </form>
      </div>

      <footer
        className="shrink-0 border-t border-line bg-surface/90 px-[max(1.5rem,env(safe-area-inset-left))] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] wide:px-8"
        // Stays above the on-screen keyboard.
        style={keyboardInset ? { paddingBottom: keyboardInset + 12 } : undefined}
      >
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
          {step > 0 && (
            <Button
              variant="ghost"
              icon={ArrowLeft}
              onClick={() => go(step - 1)}
              data-testid="wizard-back"
            >
              {t.back}
            </Button>
          )}
          <span className="flex-1" />
          {step < SUMMARY_STEP ? (
            <Button
              variant={step === 0 || stepAnswered ? 'primary' : 'secondary'}
              icon={step === 0 || stepAnswered ? ArrowRight : undefined}
              onClick={next}
              data-testid="wizard-next"
            >
              {step === 0 || stepAnswered ? t.next : t.skip}
            </Button>
          ) : (
            <Button
              icon={Check}
              onClick={() => void create()}
              loading={creating}
              data-testid="wizard-create"
            >
              {t.create}
            </Button>
          )}
        </div>
      </footer>

      <ConfirmDialog
        open={discarding}
        onClose={() => setDiscarding(false)}
        onConfirm={async () => {
          await stopSaving();
          await draftsRepo.remove(NEW_CUSTOMER_DRAFT_ID);
          await navigate('/customers');
        }}
        title={t.discardTitle}
        message={t.discardText}
        confirmLabel={t.discardConfirm}
      />
    </div>
  );
}
