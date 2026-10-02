import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Check, Info, Users, X, type LucideIcon, type LucideProps } from 'lucide-react';
import { Badge, cn, IconButton, Surface, type BadgeTone } from '@/components/ui';
import { knowledgeTitle, PRODUCT_LINE_INFO, type KnowledgeRef } from '@/data/reference';
import { de } from '@/i18n/de';
import { knowledgeIcon, knowledgePath } from './icons';

const t = de.knowledge;

const PRIORITY_TONES: Record<1 | 2 | 3, BadgeTone> = { 1: 'amber', 2: 'accent', 3: 'neutral' };

export function PriorityBadge({ level }: { level: 1 | 2 | 3 }) {
  return <Badge tone={PRIORITY_TONES[level]}>{t.priority(level)}</Badge>;
}

/** Back to where the user came from; to the overview when opened directly. */
export function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <IconButton
      icon={ArrowLeft}
      label={t.back}
      data-testid="knowledge-back"
      onClick={() => {
        if (location.key === 'default') void navigate('/knowledge', { replace: true });
        else void navigate(-1);
      }}
    />
  );
}

export function IconCircle({ icon: Icon, size = 'md' }: { icon: LucideIcon; size?: 'md' | 'lg' }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent',
        size === 'md' ? 'size-11' : 'size-16',
      )}
    >
      <Icon size={size === 'md' ? 20 : 30} aria-hidden strokeWidth={1.9} />
    </span>
  );
}

const tappable =
  'focus-ring no-callout transition-[transform,border-color] duration-150 active:scale-[0.98] hover:border-line-strong';

/** Renders an icon passed as a value (icons looked up at render time). */
function Glyph({ icon: Icon, ...props }: LucideProps & { icon: LucideIcon }) {
  return <Icon {...props} />;
}

/** Pill link to another knowledge entry. */
export function KnowledgeChip({
  entry,
  showPriority = true,
}: {
  entry: KnowledgeRef;
  showPriority?: boolean;
}) {
  return (
    <Link
      to={knowledgePath(entry)}
      className={cn(
        tappable,
        'inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface-raised px-4 text-sm font-medium text-fg shadow-soft',
      )}
    >
      <Glyph icon={knowledgeIcon(entry)} size={17} aria-hidden className="shrink-0 text-accent" />
      {knowledgeTitle(entry)}
      {showPriority && entry.kind === 'product' && (
        <span className="text-xs font-semibold text-fg-muted">
          {t.priority(PRODUCT_LINE_INFO[entry.key].priority)}
        </span>
      )}
    </Link>
  );
}

export function ChipList({
  entries,
  empty,
  showPriority,
}: {
  entries: KnowledgeRef[];
  empty?: string;
  showPriority?: boolean;
}) {
  if (entries.length === 0)
    return empty ? <p className="text-base text-fg-muted">{empty}</p> : null;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map((entry) => (
        <KnowledgeChip
          key={`${entry.kind}:${entry.key}`}
          entry={entry}
          showPriority={showPriority}
        />
      ))}
    </div>
  );
}

/** Card link to a knowledge entry (overview grids). */
export function EntryCard({
  entry,
  subtitle,
  badge,
  to,
  icon,
  title,
  testId,
}: {
  entry?: KnowledgeRef;
  subtitle?: string;
  badge?: ReactNode;
  /** For entries that are not a KnowledgeRef (basics). */
  to?: string;
  icon?: LucideIcon;
  title?: string;
  testId?: string;
}) {
  const Icon = icon ?? (entry ? knowledgeIcon(entry) : Info);
  return (
    <Link
      to={to ?? (entry ? knowledgePath(entry) : '/knowledge')}
      data-testid={testId ?? (entry ? `knowledge-card-${entry.kind}-${entry.key}` : undefined)}
      className={cn(
        tappable,
        'flex min-h-20 items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-card',
      )}
    >
      <IconCircle icon={Icon} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-start justify-between gap-2">
          <span className="text-base font-semibold text-fg">
            {title ?? (entry ? knowledgeTitle(entry) : '')}
          </span>
          {badge}
        </span>
        {subtitle && <span className="line-clamp-2 text-sm text-fg-secondary">{subtitle}</span>}
      </span>
    </Link>
  );
}

export function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <h2 className="flex items-baseline gap-2 px-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">
      {title}
      {count !== undefined && <span className="font-medium tabular-nums">{count}</span>}
    </h2>
  );
}

/** A titled card on a detail page. */
export function DetailSection({
  title,
  icon: Icon,
  children,
  className,
  testId,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <Surface className={cn('flex flex-col gap-3', className)} data-testid={testId}>
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-fg">
        {Icon && <Icon size={20} aria-hidden className="text-accent" />}
        {title}
      </h2>
      {children}
    </Surface>
  );
}

const BULLETS = {
  positive: { icon: Check, className: 'bg-success-soft text-success' },
  negative: { icon: X, className: 'bg-surface-sunken text-fg-muted' },
} as const;

export function BulletList({
  items,
  tone,
}: {
  items: readonly string[];
  tone?: keyof typeof BULLETS;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => {
        const bullet = tone ? BULLETS[tone] : null;
        return (
          <li key={item} className="flex gap-3 text-base text-fg">
            {bullet ? (
              <span
                className={cn(
                  'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
                  bullet.className,
                )}
              >
                <bullet.icon size={14} aria-hidden strokeWidth={2.6} />
              </span>
            ) : (
              <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
            )}
            <span>{item}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Small hint line (rules are rules of thumb, notes on a phase …). */
export function Hint({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'amber';
}) {
  return (
    <p className={cn('flex gap-2 text-sm', tone === 'amber' ? 'text-amber-fg' : 'text-fg-muted')}>
      <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Header card of a detail page: icon, kind, badges, description. */
export function Hero({
  icon,
  kind,
  badges,
  subtitle,
  description,
  meta,
  note,
}: {
  icon: LucideIcon;
  kind: string;
  badges?: ReactNode;
  subtitle?: string;
  description: string;
  /** Small additional line, e.g. other names of an event. */
  meta?: string;
  note?: string;
}) {
  return (
    <Surface padding="lg" className="relative overflow-hidden" data-testid="knowledge-hero">
      <div aria-hidden className="knowledge-glow pointer-events-none absolute -inset-10" />
      <div className="relative flex items-start gap-4">
        <IconCircle icon={icon} size="lg" />
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{kind}</Badge>
            {badges}
          </div>
          {subtitle && <p className="text-lg font-medium text-fg">{subtitle}</p>}
          <p className="text-base text-fg-secondary">{description}</p>
          {meta && <p className="text-sm text-fg-muted">{meta}</p>}
          {note && <Hint tone="amber">{note}</Hint>}
        </div>
      </div>
    </Surface>
  );
}

export interface MatchingCustomer {
  id: string;
  number: string;
  name: string;
  detail?: string;
}

const MAX_CUSTOMERS = 12;

/** Customers this entry applies to (active ones), linked to their files. */
export function MatchingCustomers({
  title,
  customers,
}: {
  title: string;
  customers: MatchingCustomer[];
}) {
  return (
    <Surface className="flex flex-col gap-3" data-testid="knowledge-customers">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-fg">
        <Users size={20} aria-hidden className="text-accent" />
        <span className="flex-1">{title}</span>
        <span className="text-sm font-medium text-fg-muted">
          {t.customersCount(customers.length)}
        </span>
      </h2>
      {customers.length === 0 ? (
        <p className="text-base text-fg-muted">{t.noCustomers}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {customers.slice(0, MAX_CUSTOMERS).map((customer) => (
            <li key={customer.id}>
              <Link
                to={`/customers/${customer.id}`}
                className={cn(
                  tappable,
                  'inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface-raised px-4 text-sm font-medium text-fg shadow-soft',
                )}
              >
                <span>{customer.name}</span>
                <span className="text-xs font-semibold text-fg-muted tabular-nums">
                  {customer.number}
                </span>
                {customer.detail && (
                  <span className="text-xs text-fg-secondary">· {customer.detail}</span>
                )}
              </Link>
            </li>
          ))}
          {customers.length > MAX_CUSTOMERS && (
            <li className="flex min-h-11 items-center px-2 text-sm text-fg-muted">
              +{customers.length - MAX_CUSTOMERS}
            </li>
          )}
        </ul>
      )}
    </Surface>
  );
}
