import { useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { CalendarCheck, Cake, ChevronDown, ChevronRight, Info, PartyPopper } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import type { BirthdayEntry, Dashboard } from '@/core/dashboard/dashboard';
import { formatDayMonth } from '@/core/format';
import { useDataStore } from '@/data/store';
import { de } from '@/i18n/de';
import { CustomerAvatar } from '../customers/components/CustomerAvatar';
import { FileSection } from '../customers/file/parts';
import { customerName } from '../customers/labels';
import { ReminderRow } from '../reminders/ReminderRow';
import { GreetingDialog } from './GreetingDialog';

const t = de.dashboard;
/** Due reminders shown on the start page; the rest is one tap away. */
const DUE_LIMIT = 5;

function whenLabel(days: number): string {
  if (days === 0) return t.birthday.today;
  if (days === 1) return t.birthday.tomorrow;
  return t.birthday.inDays(days);
}

function BirthdayRow({ entry }: { entry: BirthdayEntry }) {
  const [greeting, setGreeting] = useState(false);
  const { customer } = entry;
  return (
    <li className="flex min-h-14 items-center gap-3" data-testid="birthday-row">
      <Link
        to={`/customers/${customer.id}`}
        className="focus-ring -ml-1 flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 pl-1"
      >
        <CustomerAvatar firstName={customer.firstName} lastName={customer.lastName} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-base font-medium text-fg">{customerName(customer)}</span>
          <span className={cn('text-sm', entry.days === 0 ? 'text-amber-fg' : 'text-fg-secondary')}>
            {t.birthday.turns(entry.age)} · {whenLabel(entry.days)}
            <span className="text-fg-muted"> · {formatDayMonth(entry.date)}</span>
          </span>
        </span>
      </Link>
      {entry.canGreet ? (
        <Button
          size="sm"
          variant={entry.days === 0 ? 'primary' : 'secondary'}
          icon={PartyPopper}
          onClick={() => setGreeting(true)}
          aria-label={t.birthday.greetLabel(customerName(customer))}
          data-testid="birthday-greet"
        >
          <span className="hidden sm:inline">{t.birthday.greet}</span>
        </Button>
      ) : (
        <span
          className="flex max-w-[11rem] items-start gap-1.5 text-xs text-fg-muted"
          data-testid="birthday-no-consent"
        >
          <Info size={14} aria-hidden className="mt-px shrink-0" />
          {t.birthday.noConsent}
        </span>
      )}
      {greeting && (
        <GreetingDialog customer={customer} open={greeting} onClose={() => setGreeting(false)} />
      )}
    </li>
  );
}

function Subheading({ children }: { children: string }) {
  return <h3 className="text-sm font-semibold text-fg-secondary">{children}</h3>;
}

/** What needs attention today: due reminders (completable here) and birthdays. */
export function TodaySection({ dashboard, today }: { dashboard: Dashboard; today: string }) {
  const customers = useDataStore((state) => state.customers);
  const [showMonth, setShowMonth] = useState(false);
  const { due, birthdays } = dashboard;
  const shown = due.slice(0, DUE_LIMIT);
  const soon = [...birthdays.today, ...birthdays.week];

  return (
    <FileSection title={t.today.title} icon={CalendarCheck} testId="dashboard-today">
      <div className="grid gap-5 wide:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2" data-testid="today-due">
          <Subheading>{t.today.due}</Subheading>
          {due.length === 0 ? (
            <p className="text-base text-fg-muted">{t.today.noDue}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {shown.map((reminder) => (
                  <ReminderRow
                    key={reminder.id}
                    reminder={reminder}
                    customer={customers[reminder.customerId]}
                    today={today}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
          <Link
            to="/reminders"
            className="focus-ring inline-flex min-h-11 items-center gap-1 self-start rounded-full px-3 text-sm font-medium text-accent hover:bg-accent-soft/40"
            data-testid="today-all-reminders"
          >
            {due.length > DUE_LIMIT ? t.today.more(due.length - DUE_LIMIT) : t.today.all}
            <ChevronRight size={16} aria-hidden />
          </Link>
        </div>
        <div className="flex min-w-0 flex-col gap-1" data-testid="today-birthdays">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg-secondary">
            <Cake size={16} aria-hidden className="text-amber" />
            {t.today.birthdays}
          </h3>
          {soon.length === 0 ? (
            <p className="py-1 text-base text-fg-muted">{t.today.noBirthdays}</p>
          ) : (
            <ul className="flex flex-col">
              {soon.map((entry) => (
                <BirthdayRow key={entry.customer.id} entry={entry} />
              ))}
            </ul>
          )}
          {birthdays.month.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={showMonth}
                onClick={() => setShowMonth(!showMonth)}
                className="self-start"
                data-testid="birthdays-more"
              >
                {t.today.laterBirthdays(birthdays.month.length)}
                <ChevronDown
                  size={16}
                  aria-hidden
                  className={cn('transition-transform', showMonth && 'rotate-180')}
                />
              </Button>
              {showMonth && (
                <ul className="flex flex-col">
                  {birthdays.month.map((entry) => (
                    <BirthdayRow key={entry.customer.id} entry={entry} />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </FileSection>
  );
}
