import { memo } from 'react';
import { Link } from 'react-router';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { cn } from '@/components/ui';
import { ageInfo } from '@/core/customers/age';
import { LIFE_PHASE_INFO } from '@/data/reference';
import { reminderBucket } from '@/core/reminders/schedule';
import type { Customer, Reminder } from '@/data/schemas';
import { dueLabel } from '@/features/reminders/useReminders';
import { de } from '@/i18n/de';
import { customerName } from '../labels';
import { CustomerAvatar } from './CustomerAvatar';
import { CustomerBadges } from './CustomerBadges';

const t = de.customers;

const TONES = {
  overdue: 'text-warning',
  today: 'text-amber-fg',
  next30: 'text-fg-secondary',
  next90: 'text-fg-muted',
  later: 'text-fg-muted',
} as const;

/** Next reminder: relative date, tinted when due; the occasion on wide screens. */
function NextReminder({ reminder, today }: { reminder?: Reminder; today: string }) {
  if (!reminder) {
    return (
      <span
        className="hidden shrink-0 items-center gap-1.5 text-sm text-fg-muted wide:flex"
        aria-label={`${t.nextReminder}: ${t.nextReminderNone}`}
      >
        <CalendarClock size={16} aria-hidden />–
      </span>
    );
  }
  const label = dueLabel(reminder.dueDate, today);
  return (
    <span
      className={cn(
        'flex shrink-0 flex-col items-end text-right text-sm',
        TONES[reminderBucket(reminder.dueDate, today)],
      )}
      aria-label={`${t.nextReminder}: ${reminder.title}, ${label}`}
      data-testid="customer-next-reminder"
    >
      <span className="flex items-center gap-1.5 font-medium">
        <CalendarClock size={16} aria-hidden />
        {label}
      </span>
      <span className="hidden max-w-40 truncate text-fg-muted wide:block">{reminder.title}</span>
    </span>
  );
}

/** One customer in the list: number, name, age, phase, hints; tap opens the file. */
export const CustomerRow = memo(function CustomerRow({
  customer,
  today,
  next,
}: {
  customer: Customer;
  today: string;
  /** Earliest open reminder. */
  next?: Reminder;
}) {
  const { age, approximate } = ageInfo(customer, today);
  const facts = [
    age === undefined ? undefined : t.age(age, approximate),
    customer.lifePhase ? LIFE_PHASE_INFO[customer.lifePhase].name : undefined,
    customer.occupation,
  ].filter(Boolean);
  return (
    <li className="[contain-intrinsic-size:auto_84px] [content-visibility:auto]">
      <Link
        to={`/customers/${customer.id}`}
        data-testid="customer-row"
        className={cn(
          'focus-ring no-callout flex min-h-18 items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-accent-soft/40 active:bg-accent-soft/60 sm:px-5',
          customer.archived && 'opacity-75',
        )}
      >
        <CustomerAvatar firstName={customer.firstName} lastName={customer.lastName} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-base font-semibold text-fg">
              {customerName(customer)}
            </span>
            <span className="shrink-0 text-sm font-medium text-fg-muted tabular-nums">
              {customer.number}
            </span>
          </span>
          {facts.length > 0 && (
            <span className="truncate text-sm text-fg-secondary">{facts.join(' · ')}</span>
          )}
          <CustomerBadges
            customer={customer}
            today={today}
            className="mt-1 flex flex-wrap gap-1.5"
          />
        </span>
        <NextReminder reminder={next} today={today} />
        <ChevronRight size={18} aria-hidden className="shrink-0 text-fg-muted" />
      </Link>
    </li>
  );
});
