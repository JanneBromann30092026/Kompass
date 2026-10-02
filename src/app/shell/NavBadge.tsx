import { cn } from '@/components/ui';
import { useDueCount } from '@/features/reminders/useReminders';
import { de } from '@/i18n/de';

const count = (to: string, due: number) => (to === '/reminders' ? due : 0);

/** Due reminders on the "Wiedervorlagen" navigation item (hidden at zero; visual only). */
export function NavBadge({ to, className }: { to: string; className?: string }) {
  const due = count(to, useDueCount());
  if (due === 0) return null;
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-5 min-w-5 items-center justify-center rounded-full bg-amber px-1.5 text-xs font-bold text-on-amber tabular-nums',
        className,
      )}
      data-testid="nav-due-badge"
    >
      {due > 99 ? '99+' : due}
    </span>
  );
}

/** The same count for screen readers, placed after the label ("Wiedervorlagen, 3 fällig"). */
export function NavBadgeText({ to }: { to: string }) {
  const due = count(to, useDueCount());
  if (due === 0) return null;
  return <span className="sr-only">, {de.reminders.dueCount(due)}</span>;
}
