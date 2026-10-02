import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { CalendarPlus, ChevronDown, Plus } from 'lucide-react';
import { Button, ChoiceChip, cn, EmptyState } from '@/components/ui';
import { useToday } from '@/app/hooks/useToday';
import { Page } from '@/app/shell/Page';
import {
  byDueDate,
  isDue,
  REMINDER_BUCKETS,
  reminderBucket,
  type ReminderBucket,
} from '@/core/reminders/schedule';
import { REMINDER_KINDS, type ReminderKind } from '@/data/domain';
import { REMINDER_KIND_LABELS } from '@/data/reference';
import type { Reminder } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import { de } from '@/i18n/de';
import { CalendarDialog } from './CalendarDialog';
import { ReminderEditor } from './ReminderEditor';
import { ReminderRow } from './ReminderRow';
import { useActiveReminders } from './useReminders';

const t = de.reminders;
const DONE_LIMIT = 50;

const BUCKET_TONES: Record<ReminderBucket, string> = {
  overdue: 'text-warning',
  today: 'text-amber-fg',
  next30: 'text-fg-secondary',
  next90: 'text-fg-secondary',
  later: 'text-fg-secondary',
};

function ReminderList({ reminders, today }: { reminders: Reminder[]; today: string }) {
  const customers = useDataStore((state) => state.customers);
  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {reminders.map((reminder) => (
          <ReminderRow
            key={reminder.id}
            reminder={reminder}
            customer={customers[reminder.customerId]}
            today={today}
          />
        ))}
      </AnimatePresence>
    </ul>
  );
}

/** All reminders by due date: overdue, today, next 30 days, 31–90 days, later. */
export function RemindersPage() {
  const today = useToday();
  const reminders = useActiveReminders();
  const [kind, setKind] = useState<ReminderKind | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);

  const open = useMemo(
    () => reminders.filter((reminder) => !reminder.done).sort(byDueDate),
    [reminders],
  );
  const done = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.done)
        .sort((a, b) => (b.doneAt ?? b.updatedAt).localeCompare(a.doneAt ?? a.updatedAt)),
    [reminders],
  );
  const visible = kind ? open.filter((reminder) => reminder.kind === kind) : open;
  const groups = REMINDER_BUCKETS.map((bucket) => ({
    bucket,
    items: visible.filter((reminder) => reminderBucket(reminder.dueDate, today) === bucket),
  })).filter((group) => group.items.length > 0);
  const dueCount = open.filter((reminder) => isDue(reminder, today)).length;

  return (
    <Page
      title={t.title}
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            icon={CalendarPlus}
            onClick={() => setExporting(true)}
            disabled={visible.length === 0}
            data-testid="reminders-export"
          >
            <span className="hidden sm:inline">{t.calendar.exportAll}</span>
          </Button>
          <Button size="sm" icon={Plus} onClick={() => setAdding(true)} data-testid="reminders-add">
            <span className="hidden sm:inline">{t.add}</span>
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5" data-testid="reminders-page">
        <div className="flex flex-col gap-3">
          <p className="text-base text-fg-secondary" data-testid="reminders-summary">
            {t.count(open.length)}
            {dueCount > 0 && (
              <span className="font-semibold text-warning"> · {t.dueCount(dueCount)}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t.filter}>
            <ChoiceChip selected={kind === null} onToggle={() => setKind(null)}>
              {t.allKinds}
            </ChoiceChip>
            {REMINDER_KINDS.map((key) => (
              <ChoiceChip
                key={key}
                selected={kind === key}
                onToggle={() => setKind(kind === key ? null : key)}
              >
                {REMINDER_KIND_LABELS[key]}
              </ChoiceChip>
            ))}
          </div>
        </div>

        {open.length === 0 ? (
          <EmptyState
            title={t.empty}
            text={t.emptyText}
            action={
              <Button icon={Plus} onClick={() => setAdding(true)}>
                {t.add}
              </Button>
            }
          />
        ) : groups.length === 0 ? (
          <p className="text-base text-fg-muted">{t.emptyFiltered}</p>
        ) : (
          <>
            {groups.map(({ bucket, items }) => (
              <section
                key={bucket}
                className="flex flex-col gap-2.5"
                data-testid={`bucket-${bucket}`}
              >
                <h2 className={cn('text-base font-semibold', BUCKET_TONES[bucket])}>
                  {t.buckets[bucket]}{' '}
                  <span className="font-normal text-fg-muted">({items.length})</span>
                </h2>
                <ReminderList reminders={items} today={today} />
              </section>
            ))}
            <p className="text-sm text-fg-muted">{t.swipeHint}</p>
          </>
        )}

        {done.length > 0 && (
          <section className="flex flex-col gap-2.5" data-testid="reminders-done">
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={showDone}
              onClick={() => setShowDone(!showDone)}
              className="self-start"
              data-testid="reminders-show-done"
            >
              {showDone ? t.hideDone : t.showDone(done.length)}
              <ChevronDown
                size={16}
                aria-hidden
                className={cn('transition-transform', showDone && 'rotate-180')}
              />
            </Button>
            {showDone && <ReminderList reminders={done.slice(0, DONE_LIMIT)} today={today} />}
          </section>
        )}
      </div>

      {adding && <ReminderEditor today={today} onClose={() => setAdding(false)} />}
      {exporting && <CalendarDialog reminders={visible} onClose={() => setExporting(false)} />}
    </Page>
  );
}
