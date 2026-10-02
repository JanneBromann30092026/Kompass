import { memo } from 'react';
import { Link } from 'react-router';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { cn } from '@/components/ui';
import { ageInfo } from '@/core/customers/age';
import { LIFE_PHASE_INFO } from '@/data/reference';
import type { Customer } from '@/data/schemas';
import { de } from '@/i18n/de';
import { customerName } from '../labels';
import { CustomerAvatar } from './CustomerAvatar';
import { CustomerBadges } from './CustomerBadges';

const t = de.customers;

/** One customer in the list: number, name, age, phase, hints; tap opens the file. */
export const CustomerRow = memo(function CustomerRow({
  customer,
  today,
}: {
  customer: Customer;
  today: string;
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
        {/* Next reminder: filled in step 6. */}
        <span
          className="hidden shrink-0 items-center gap-1.5 text-sm text-fg-muted wide:flex"
          title={t.nextReminderSoon}
          aria-label={`${t.nextReminder}: ${t.nextReminderSoon}`}
        >
          <CalendarClock size={16} aria-hidden />–
        </span>
        <ChevronRight size={18} aria-hidden className="shrink-0 text-fg-muted" />
      </Link>
    </li>
  );
});
