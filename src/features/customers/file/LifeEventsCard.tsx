import { useState } from 'react';
import { Link } from 'react-router';
import {
  CalendarHeart,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  IconButton,
  Input,
  SegmentedControl,
  Select,
  Textarea,
  toast,
} from '@/components/ui';
import { formatCalendarDate } from '@/core/format';
import { LIFE_EVENT_KINDS, type LifeEventKind } from '@/data/domain';
import { lifeEventsRepo } from '@/data/repositories';
import { LIFE_EVENT_INFO } from '@/data/reference';
import { LIMITS, type LifeEvent } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import { de } from '@/i18n/de';
import { knowledgeIcon } from '@/features/knowledge/icons';
import { EditPanel } from '../components/EditPanel';
import { errorsOf } from '../fields/formValues';
import { FileSection } from './parts';

const t = de.customers.file;

type DateMode = 'day' | 'month' | 'none';

/** Renders an icon chosen at render time. */
function Glyph({ icon: Icon, ...props }: LucideProps & { icon: LucideIcon }) {
  return <Icon {...props} />;
}

const modeOf = (date: string | undefined): DateMode =>
  !date ? 'none' : date.length === 7 ? 'month' : 'day';

function EventEditor({
  customerId,
  event,
  onClose,
}: {
  customerId: string;
  event?: LifeEvent;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<LifeEventKind>(event?.kind ?? 'trainingStart');
  const [mode, setMode] = useState<DateMode>(event ? modeOf(event.date) : 'month');
  const [date, setDate] = useState(event?.date ?? '');
  const [note, setNote] = useState(event?.note ?? '');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const dateValue = mode === 'none' ? undefined : mode === 'month' ? date.slice(0, 7) : date;

  const save = async () => {
    setSaving(true);
    try {
      const input = { kind, date: dateValue || undefined, note };
      if (event) await lifeEventsRepo.update(event.id, input);
      else await lifeEventsRepo.create(customerId, input);
      toast.success(t.saved);
      onClose();
    } catch (failure: unknown) {
      const errors = errorsOf(failure);
      setError(errors ? Object.values(errors)[0] : de.customers.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditPanel
      open
      onClose={onClose}
      title={event ? t.editEvent : t.addEvent}
      footer={
        <>
          {event && (
            <Button
              variant="ghost"
              icon={Trash2}
              onClick={() => setConfirming(true)}
              className="mr-auto text-danger"
            >
              {t.deleteEvent}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button onClick={() => void save()} loading={saving} data-testid="event-save">
            {t.save}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5 pb-2" data-testid="event-editor">
        <Select<LifeEventKind>
          label={t.eventKind}
          value={kind}
          options={LIFE_EVENT_KINDS.map((value) => ({ value, label: LIFE_EVENT_INFO[value].name }))}
          onChange={setKind}
          data-testid="event-kind"
        />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-1 text-sm font-medium text-fg-secondary">{t.eventDate}</span>
            <SegmentedControl<DateMode>
              label={t.eventDateMode}
              value={mode}
              options={(['day', 'month', 'none'] as const).map((value) => ({
                value,
                label: t.eventDateModes[value],
              }))}
              onChange={(next) => {
                setMode(next);
                if (next === 'day' && date.length === 7) setDate(`${date}-01`);
              }}
            />
          </div>
          {mode !== 'none' && (
            <Input
              type={mode === 'day' ? 'date' : 'month'}
              aria-label={t.eventDate}
              value={mode === 'month' ? date.slice(0, 7) : date}
              onChange={(e) => setDate(e.target.value)}
              className="max-w-56"
              data-testid="event-date"
            />
          )}
        </div>
        <Textarea
          label={t.eventNote}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={LIMITS.text}
          rows={2}
          hint={de.customers.hints.health}
          error={error}
        />
        <p className="px-1 text-sm text-fg-muted">{LIFE_EVENT_INFO[kind].reminderText}</p>
      </div>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          if (event) await lifeEventsRepo.remove(event.id);
          onClose();
        }}
        title={t.deleteEvent}
        message={`${LIFE_EVENT_INFO[kind].name}${dateValue ? ` · ${formatCalendarDate(dateValue)}` : ''}`}
        confirmLabel={t.deleteEvent}
      />
    </EditPanel>
  );
}

/** Life events with date; newest first, undated last. */
export function LifeEventsCard({ customerId }: { customerId: string }) {
  const all = useDataStore((s) => s.lifeEvents);
  const events = Object.values(all)
    .filter((event) => event.customerId === customerId)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const [editing, setEditing] = useState<LifeEvent | 'new' | null>(null);

  return (
    <FileSection
      title={t.sections.events}
      icon={CalendarHeart}
      testId="file-events"
      actions={
        <IconButton
          icon={Plus}
          label={t.addEvent}
          variant="secondary"
          onClick={() => setEditing('new')}
          data-testid="add-event"
        />
      }
    >
      {events.length === 0 ? (
        <p className="text-base text-fg-muted">{t.noEvents}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {events.map((event) => {
            return (
              <li key={event.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Glyph
                    icon={knowledgeIcon({ kind: 'event', key: event.kind })}
                    size={17}
                    aria-hidden
                  />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <Link
                    to={`/knowledge/event/${event.kind}`}
                    className="focus-ring self-start rounded text-base font-medium text-fg hover:text-accent"
                  >
                    {LIFE_EVENT_INFO[event.kind].name}
                  </Link>
                  <span className="text-sm text-fg-secondary">
                    {event.date ? formatCalendarDate(event.date) : t.emptyValue}
                    {event.note ? ` · ${event.note}` : ''}
                  </span>
                </span>
                <IconButton icon={Pencil} label={t.editEvent} onClick={() => setEditing(event)} />
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <EventEditor
          customerId={customerId}
          event={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </FileSection>
  );
}
