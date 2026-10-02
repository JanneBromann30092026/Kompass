import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { CalendarClock, ChevronDown, Plus } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import { byDueDate } from '@/core/reminders/schedule';
import type { Customer } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import { de } from '@/i18n/de';
import { FileSection } from '../customers/file/parts';
import { ReminderEditor } from './ReminderEditor';
import { ReminderRow } from './ReminderRow';

const t = de.reminders;

/** Reminders in the customer file: open ones by date, completed ones collapsed. */
export function RemindersSection({ customer, today }: { customer: Customer; today: string }) {
  const all = useDataStore((state) => state.reminders);
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const own = useMemo(
    () => Object.values(all).filter((reminder) => reminder.customerId === customer.id),
    [all, customer.id],
  );
  const open = own.filter((reminder) => !reminder.done).sort(byDueDate);
  const done = own
    .filter((reminder) => reminder.done)
    .sort((a, b) => (b.doneAt ?? b.updatedAt).localeCompare(a.doneAt ?? a.updatedAt));

  return (
    <FileSection
      title={t.title}
      icon={CalendarClock}
      testId="file-reminders"
      actions={
        <Button
          size="sm"
          variant="secondary"
          icon={Plus}
          onClick={() => setAdding(true)}
          data-testid="file-reminder-add"
        >
          {t.addShort}
        </Button>
      }
    >
      {open.length === 0 ? (
        <p className="text-base text-fg-muted">{t.sectionEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {open.map((reminder) => (
              <ReminderRow
                key={reminder.id}
                reminder={reminder}
                today={today}
                showCustomer={false}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
      {done.length > 0 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={showDone}
            onClick={() => setShowDone(!showDone)}
            className="self-start"
            data-testid="file-reminders-show-done"
          >
            {showDone ? t.hideDone : t.showDone(done.length)}
            <ChevronDown
              size={16}
              aria-hidden
              className={cn('transition-transform', showDone && 'rotate-180')}
            />
          </Button>
          {showDone && (
            <ul className="flex flex-col gap-2">
              {done.map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  today={today}
                  showCustomer={false}
                />
              ))}
            </ul>
          )}
        </>
      )}
      {adding && (
        <ReminderEditor customerId={customer.id} today={today} onClose={() => setAdding(false)} />
      )}
    </FileSection>
  );
}
