import { useState } from 'react';
import { Link } from 'react-router';
import { Check, ChevronDown, Target } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import { groupViews, type NeedGroup, type NeedView } from '@/core/needs/decisions';
import { POTENTIAL_LABELS, PRODUCT_LINE_INFO, RULE_DISCLAIMER } from '@/data/reference';
import type { Customer } from '@/data/schemas';
import { de } from '@/i18n/de';
import { FileSection } from '../customers/file/parts';
import { NeedCard } from './NeedCard';

const t = de.needs;

/** Groups that start collapsed (nothing to do there right now). */
const COLLAPSED: readonly NeedGroup[] = ['notUseful', 'dismissed'];

function GroupList({
  customerId,
  group,
  views,
}: {
  customerId: string;
  group: NeedGroup;
  views: NeedView[];
}) {
  const [open, setOpen] = useState(!COLLAPSED.includes(group));
  const title = t.groups[group];
  return (
    <section className="flex flex-col gap-2.5" data-testid={`need-group-${group}`}>
      {COLLAPSED.includes(group) ? (
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="self-start"
          data-testid={`need-group-toggle-${group}`}
        >
          {t.showGroup(title, views.length)}
          <ChevronDown
            size={16}
            aria-hidden
            className={cn('transition-transform', open && 'rotate-180')}
          />
        </Button>
      ) : (
        <h3 className="text-base font-semibold text-fg-secondary">
          {title} <span className="font-normal text-fg-muted">({views.length})</span>
        </h3>
      )}
      {open && (
        <ul className="grid gap-3 wide:grid-cols-2">
          {views.map((view) => (
            <NeedCard key={view.line} customerId={customerId} view={view} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Need per product line: now / later / not useful, with priority, reasons and decisions. */
export function NeedsSection({ customer, views }: { customer: Customer; views: NeedView[] }) {
  const groups = groupViews(views);
  return (
    <FileSection title={t.title} icon={Target} testId="file-needs">
      <p className="text-sm text-fg-secondary" data-testid="need-potential">
        {customer.potential
          ? t.potential(POTENTIAL_LABELS[customer.potential])
          : t.potentialUnknown}{' '}
        · {t.potentialHint}
      </p>

      {groups.now.length === 0 && (
        <p className="text-base text-fg-muted" data-testid="need-nothing-now">
          {t.nothingNow}
        </p>
      )}
      {(['now', 'later', 'notUseful', 'dismissed'] as const).map(
        (group) =>
          groups[group].length > 0 && (
            <GroupList key={group} customerId={customer.id} group={group} views={groups[group]} />
          ),
      )}

      {groups.covered.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="need-group-covered">
          <h3 className="text-base font-semibold text-fg-secondary">{t.groups.covered}</h3>
          <ul className="flex flex-wrap gap-2">
            {groups.covered.map((view) => (
              <li key={view.line}>
                <Link
                  to={`/knowledge/product/${view.line}`}
                  aria-label={t.knowledge(PRODUCT_LINE_INFO[view.line].name)}
                  className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface-sunken px-4 text-sm font-medium text-fg"
                >
                  <Check size={15} aria-hidden strokeWidth={2.6} className="text-success" />
                  {PRODUCT_LINE_INFO[view.line].name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-fg-muted">{RULE_DISCLAIMER}</p>
    </FileSection>
  );
}
