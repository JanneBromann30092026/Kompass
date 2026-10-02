import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  CalendarClock,
  Megaphone,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/components/ui';
import type { Metrics } from '@/core/dashboard/dashboard';
import { de } from '@/i18n/de';
import { useShowCustomers } from './useDashboard';

const t = de.dashboard.metrics;

function Tile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  onClick,
  testId,
}: {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone?: 'default' | 'warning';
  onClick: () => void;
  testId: string;
}) {
  const warning = tone === 'warning' && value > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        'focus-ring flex min-h-28 flex-col items-start gap-1 rounded-xl border border-line bg-surface p-4 text-left shadow-card transition-[transform,border-color] duration-150 active:scale-[0.98] hover:border-line-strong',
        warning && 'border-warning/40',
      )}
    >
      <span className="flex w-full items-center gap-2 text-sm font-medium text-fg-secondary">
        <Icon
          size={16}
          aria-hidden
          className={cn('shrink-0', warning ? 'text-warning' : 'text-accent')}
        />
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          'text-3xl font-semibold tracking-tight tabular-nums',
          warning ? 'text-warning' : 'text-fg',
        )}
        data-testid={`${testId}-value`}
      >
        {value}
      </span>
      <span className="text-xs text-fg-muted">{hint}</span>
    </button>
  );
}

/** Key figures as tiles; each opens the matching list. */
export function MetricTiles({ metrics }: { metrics: Metrics }) {
  const navigate = useNavigate();
  const showCustomers = useShowCustomers();
  return (
    <section
      aria-label={t.title}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 wide:grid-cols-5"
      data-testid="dashboard-metrics"
    >
      <Tile
        label={t.customers}
        value={metrics.customers}
        hint={metrics.demo > 0 ? t.demo(metrics.demo) : ' '}
        icon={Users}
        onClick={() => showCustomers({})}
        testId="metric-customers"
      />
      <Tile
        label={t.invitable}
        value={metrics.invitable}
        hint={t.invitableHint}
        icon={Megaphone}
        onClick={() => showCustomers({ marketing: 'granted' })}
        testId="metric-invitable"
      />
      <Tile
        label={t.minors}
        value={metrics.minors}
        hint={t.minorsHint}
        icon={ShieldCheck}
        onClick={() => showCustomers({ minors: true })}
        testId="metric-minors"
      />
      <Tile
        label={t.overdue}
        value={metrics.overdue}
        hint={t.overdueHint}
        icon={AlertTriangle}
        tone="warning"
        onClick={() => void navigate('/reminders')}
        testId="metric-overdue"
      />
      <Tile
        label={t.dueSoon}
        value={metrics.dueSoon}
        hint={t.dueSoonHint}
        icon={CalendarClock}
        onClick={() => void navigate('/reminders')}
        testId="metric-due"
      />
    </section>
  );
}
