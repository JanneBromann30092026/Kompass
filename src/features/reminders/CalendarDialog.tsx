import { useState } from 'react';
import { CalendarPlus, Share } from 'lucide-react';
import { Button, Modal, toast } from '@/components/ui';
import { formatCalendarDate } from '@/core/format';
import { calendarEvents, type CalendarLabels } from '@/core/reminders/calendar';
import { buildIcs } from '@/core/reminders/ics';
import { LIFE_EVENT_KINDS, type LifeEventKind } from '@/data/domain';
import { LIFE_EVENT_INFO } from '@/data/reference';
import type { Reminder } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import { de } from '@/i18n/de';

const t = de.reminders.calendar;
const PREVIEW = 5;

const LABELS: CalendarLabels = {
  kinds: t.occasions,
  events: Object.fromEntries(
    LIFE_EVENT_KINDS.map((kind) => [kind, LIFE_EVENT_INFO[kind].name]),
  ) as Record<LifeEventKind, string>,
  description: t.description,
};

interface CalendarFile {
  file: File;
  events: ReturnType<typeof calendarEvents>;
}

function createFile(
  reminders: readonly Reminder[],
  customers: Parameters<typeof calendarEvents>[1],
) {
  const events = calendarEvents(reminders, customers, LABELS);
  const ics = buildIcs(events, new Date(), { alarm: t.alarm });
  return { events, file: new File([ics], t.fileName, { type: 'text/calendar' }) };
}

/**
 * Calendar export of open reminders (.ics). The file is created when the dialog opens, so
 * sharing runs directly in the tap (iPadOS needs a fresh user gesture).
 */
export function CalendarDialog({
  reminders,
  onClose,
}: {
  reminders: readonly Reminder[];
  onClose: () => void;
}) {
  const customers = useDataStore((state) => state.customers);
  const [{ file, events }] = useState<CalendarFile>(() => createFile(reminders, customers));
  const canShare =
    typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  const share = () => {
    navigator.share({ files: [file], title: t.title }).then(onClose, (error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error(t.shareFailed);
    });
  };

  const download = () => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t.title}
      description={t.text(events.length)}
      footer={
        <>
          <Button
            variant={canShare ? 'secondary' : 'primary'}
            icon={CalendarPlus}
            onClick={download}
            data-testid="calendar-download"
          >
            {t.download}
          </Button>
          {canShare && (
            <Button icon={Share} onClick={share} data-testid="calendar-share">
              {t.share}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4" data-testid="calendar-dialog">
        <p className="rounded-lg bg-accent-soft px-4 py-3 text-base text-fg">{t.privacy}</p>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-fg-secondary">{t.preview}</p>
          <ul className="flex flex-col gap-1.5" data-testid="calendar-preview">
            {events.slice(0, PREVIEW).map((event) => (
              <li
                key={event.uid}
                className="flex gap-3 rounded-lg bg-surface-sunken px-3 py-2 text-base"
              >
                <span className="shrink-0 text-fg-secondary tabular-nums">
                  {formatCalendarDate(event.date)}
                </span>
                <span className="min-w-0 truncate text-fg">{event.summary}</span>
              </li>
            ))}
          </ul>
          {events.length > PREVIEW && (
            <p className="text-sm text-fg-muted">{t.more(events.length - PREVIEW)}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
