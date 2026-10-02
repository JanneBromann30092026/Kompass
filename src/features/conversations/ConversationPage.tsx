import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Check, Info } from 'lucide-react';
import {
  Button,
  ChoiceChip,
  cn,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Input,
  Surface,
  Textarea,
  toast,
  useKeyboardInset,
} from '@/components/ui';
import { useDraftSaver } from '@/app/hooks/useDraftSaver';
import { useToday } from '@/app/hooks/useToday';
import { Page } from '@/app/shell/Page';
import { conversationDraftId, conversationsRepo, draftsRepo } from '@/data/repositories';
import { LIMITS, type Conversation, type Customer } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import { de } from '@/i18n/de';
import { appendDictation } from '@/services/speech/dictation';
import { ContractsCard } from '../customers/file/ContractsCard';
import { LifeEventsCard } from '../customers/file/LifeEventsCard';
import { customerName } from '../customers/labels';
import { RemindersSection } from '../reminders/RemindersSection';
import { ConsentCard } from './ConsentCard';
import { DictationButton } from './DictationButton';
import { TEXT_FIELDS, type ConversationValues, type TextField } from './fields';

const t = de.conversations;

const TEXT_KEYS = [
  'date',
  'title',
  'participants',
  ...TEXT_FIELDS,
  'notes',
] as const satisfies readonly (keyof ConversationValues)[];

function initialValues(conversation: Conversation | undefined, today: string): ConversationValues {
  return {
    date: conversation?.date ?? today,
    title: conversation?.title ?? '',
    participants: conversation?.participants ?? '',
    discussed: conversation?.discussed ?? '',
    results: conversation?.results ?? '',
    openItems: conversation?.openItems ?? '',
    nextSteps: conversation?.nextSteps ?? '',
    notes: conversation?.notes ?? '',
  };
}

/** Only the known text fields of a stored draft. */
function fromDraft(initial: ConversationValues, data: Record<string, unknown>): ConversationValues {
  const values = { ...initial };
  for (const key of Object.keys(initial) as (keyof ConversationValues)[]) {
    const value = data[key];
    if (typeof value === 'string') values[key] = value;
  }
  return values;
}

const hasNote = (values: ConversationValues) =>
  [values.title, values.participants, values.notes, ...TEXT_FIELDS.map((f) => values[f])].some(
    (value) => value.trim() !== '',
  );

function ConversationForm({
  customer,
  conversation,
}: {
  customer: Customer;
  conversation?: Conversation;
}) {
  const navigate = useNavigate();
  const today = useToday();
  const keyboardInset = useKeyboardInset();
  const draftId = conversationDraftId(customer.id, conversation?.id);
  const [restored] = useState(() => draftsRepo.get(draftId));
  const [initial] = useState(() => initialValues(conversation, today));
  const [values, setValues] = useState<ConversationValues>(() =>
    restored ? fromDraft(initial, restored.data) : initial,
  );
  const [active, setActive] = useState<TextField>('discussed');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const form = useRef<HTMLDivElement>(null);
  const dirty = TEXT_KEYS.some((key) => values[key] !== initial[key]);
  const draftState = useMemo(() => ({ step: 0, values }), [values]);
  const stopSaving = useDraftSaver(draftId, 'conversation', draftState, dirty);
  const fileUrl = `/customers/${customer.id}`;

  useEffect(() => {
    if (restored) toast.info(t.draftRestored);
  }, [restored]);

  // The keyboard covers the lower part: keep the focused field above it – when the keyboard
  // opens and when moving between fields while it is open.
  useEffect(() => {
    if (!keyboardInset) return;
    const reveal = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement) || !form.current?.contains(target)) return;
      const visibleBottom = window.innerHeight - keyboardInset - 24;
      const { top, bottom } = target.getBoundingClientRect();
      if (bottom <= visibleBottom && top >= 0) return;
      // "end" honours the scroll margin (Chromium ignores it with "nearest").
      target.style.scrollMarginBottom = `${keyboardInset + 24}px`;
      target.scrollIntoView({ block: 'end' });
    };
    reveal(document.activeElement);
    const onFocus = (event: FocusEvent) => reveal(event.target);
    document.addEventListener('focusin', onFocus);
    return () => document.removeEventListener('focusin', onFocus);
  }, [keyboardInset]);

  const set = (patch: Partial<ConversationValues>) => {
    setValues((current) => ({ ...current, ...patch }));
    setError(null);
  };

  const leave = async () => {
    await stopSaving();
    await draftsRepo.remove(draftId);
    await navigate(fileUrl, { replace: true });
  };

  const save = async () => {
    if (!values.date) {
      setError(t.required);
      return;
    }
    if (!hasNote(values)) {
      setError(t.emptyNote);
      return;
    }
    setSaving(true);
    try {
      if (conversation) await conversationsRepo.update(conversation.id, values);
      else await conversationsRepo.create(customer.id, values);
      toast.success(t.saved);
      await leave();
    } catch {
      toast.error(t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (dirty) setDiscarding(true);
    else void navigate(fileUrl, { replace: true });
  };

  return (
    <Page
      title={conversation ? t.editTitle : t.newTitle}
      leading={<IconButton icon={ArrowLeft} label={t.cancel} onClick={cancel} />}
      actions={
        <Button
          icon={Check}
          onClick={() => void save()}
          loading={saving}
          data-testid="conversation-save"
        >
          {t.save}
        </Button>
      }
    >
      <div
        ref={form}
        className="flex flex-col gap-4"
        style={keyboardInset ? { paddingBottom: keyboardInset } : undefined}
        data-testid="conversation-form"
      >
        <p className="-mt-2 text-base text-fg-secondary">
          {t.with(customerName(customer))} · {customer.number}
        </p>

        <Surface className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
            <Input
              type="date"
              label={t.fields.date}
              value={values.date}
              max={today}
              onChange={(event) => set({ date: event.target.value })}
              data-testid="conversation-date"
            />
            <Input
              label={t.fields.participants}
              placeholder={t.placeholders.participants}
              value={values.participants}
              maxLength={LIMITS.title}
              onChange={(event) => set({ participants: event.target.value })}
              data-testid="conversation-participants"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Input
              label={t.fields.title}
              placeholder={t.placeholders.title}
              value={values.title}
              maxLength={LIMITS.title}
              onChange={(event) => set({ title: event.target.value })}
              data-testid="conversation-title"
            />
            <div className="flex flex-wrap gap-2">
              {t.occasions.map((occasion) => (
                <ChoiceChip
                  key={occasion}
                  selected={values.title === occasion}
                  onToggle={() => set({ title: values.title === occasion ? '' : occasion })}
                >
                  {occasion}
                </ChoiceChip>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg bg-surface-sunken p-3">
            <DictationButton
              target={t.fields[active]}
              onText={(text) =>
                setValues((current) => ({
                  ...current,
                  [active]: appendDictation(current[active], text),
                }))
              }
            />
            <p className="flex items-start gap-2 text-sm text-fg-secondary">
              <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
              {t.keyboardHint} {de.customers.hints.health}
            </p>
          </div>

          <div className="grid gap-4 wide:grid-cols-2">
            {TEXT_FIELDS.map((field) => (
              <Textarea
                key={field}
                label={t.fields[field]}
                placeholder={t.placeholders[field]}
                value={values[field]}
                rows={4}
                maxLength={LIMITS.notes}
                onFocus={() => setActive(field)}
                onChange={(event) => set({ [field]: event.target.value })}
                className={cn(active === field && 'ring-2 ring-accent/40')}
                data-testid={`conversation-${field}`}
              />
            ))}
          </div>
          {initial.notes && (
            <Textarea
              label={t.fields.notes}
              value={values.notes}
              rows={3}
              maxLength={LIMITS.notes}
              onChange={(event) => set({ notes: event.target.value })}
              data-testid="conversation-notes"
            />
          )}

          {error && (
            <p
              role="alert"
              className="text-base font-medium text-danger"
              data-testid="conversation-error"
            >
              {error}
            </p>
          )}
          <p className="text-sm text-fg-muted">{t.annualHint}</p>
        </Surface>

        <section className="flex flex-col gap-3" data-testid="quick-actions">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-fg">{t.quick.title}</h2>
            <p className="text-sm text-fg-secondary">{t.quick.text}</p>
          </div>
          <ContractsCard customer={customer} />
          <div className="grid gap-4 wide:grid-cols-2">
            <RemindersSection customer={customer} today={today} />
            <div className="flex flex-col gap-4">
              <LifeEventsCard customerId={customer.id} />
              <ConsentCard customer={customer} today={today} />
            </div>
          </div>
        </section>

        <Button
          icon={Check}
          size="lg"
          fullWidth
          onClick={() => void save()}
          loading={saving}
          data-testid="conversation-save-bottom"
        >
          {t.save}
        </Button>
      </div>

      <ConfirmDialog
        open={discarding}
        onClose={() => setDiscarding(false)}
        onConfirm={leave}
        title={t.discardTitle}
        message={t.discardText}
        confirmLabel={t.discard}
        variant="danger"
      />
    </Page>
  );
}

/** New or edited conversation note of a customer (/customers/:id/conversations/…). */
export function ConversationPage() {
  const { id = '', conversationId } = useParams();
  const navigate = useNavigate();
  const customer = useDataStore((state) => state.customers[id]);
  const conversation = useDataStore((state) =>
    conversationId ? state.conversations[conversationId] : undefined,
  );
  if (!customer || (conversationId && !conversation)) {
    return (
      <Page title={de.customers.file.notFound}>
        <EmptyState
          title={de.customers.file.notFound}
          text={de.customers.file.notFoundText}
          action={
            <Button onClick={() => void navigate('/customers')}>{de.customers.file.toList}</Button>
          }
        />
      </Page>
    );
  }
  return (
    <ConversationForm
      key={conversationId ?? 'new'}
      customer={customer}
      conversation={conversation}
    />
  );
}
