import { Link } from 'react-router';
import { ChevronRight, Target } from 'lucide-react';
import { Badge, cn } from '@/components/ui';
import type { Dashboard } from '@/core/dashboard/dashboard';
import { PRIORITIES, type Priority } from '@/data/domain';
import { POTENTIAL_LABELS, PRODUCT_LINE_INFO } from '@/data/reference';
import { de } from '@/i18n/de';
import { FileSection } from '../customers/file/parts';
import { customerName } from '../customers/labels';
import { useShowCustomers } from './useDashboard';

const t = de.dashboard.needs;

/** Customers whose open needs "now" include the priority. */
function idsWithPriority(dashboard: Dashboard, priority?: Priority): string[] {
  return dashboard.customers
    .filter((customer) =>
      dashboard.views
        .get(customer.id)
        ?.some((view) => view.group === 'now' && (!priority || view.priority === priority)),
    )
    .map((customer) => customer.id);
}

/** Open needs: counts per priority and the customers with the most pressing needs. */
export function OpenNeedsCard({ dashboard }: { dashboard: Dashboard }) {
  const showCustomers = useShowCustomers();
  const { openNeeds, needsByPriority, openNeedsCustomers } = dashboard;
  const more = openNeedsCustomers - openNeeds.length;

  return (
    <FileSection title={t.title} icon={Target} testId="dashboard-needs">
      <p className="-mt-2 text-sm text-fg-secondary">{t.text}</p>
      <div className="flex flex-wrap gap-2">
        {PRIORITIES.map((priority) => (
          <button
            key={priority}
            type="button"
            disabled={needsByPriority[priority] === 0}
            onClick={() =>
              showCustomers({
                selection: {
                  label: t.selection(priority),
                  ids: idsWithPriority(dashboard, priority),
                },
              })
            }
            aria-label={t.priorityLabel(priority, needsByPriority[priority])}
            className={cn(
              'focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-50',
              priority === 1
                ? 'border-amber/40 bg-amber-soft text-amber-fg'
                : 'border-line bg-surface-sunken text-fg-secondary',
            )}
            data-testid={`needs-priority-${priority}`}
          >
            {t.priority(priority)}
            <span className="text-base font-semibold tabular-nums text-fg">
              {needsByPriority[priority]}
            </span>
          </button>
        ))}
      </div>
      {openNeeds.length === 0 ? (
        <p className="text-base text-fg-muted">{t.none}</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {openNeeds.map((entry) => (
            <li key={entry.customer.id}>
              <Link
                to={`/customers/${entry.customer.id}`}
                className="focus-ring flex min-h-14 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent-soft/40 active:bg-accent-soft/60"
                data-testid="open-need"
              >
                <Badge tone={entry.priority === 1 ? 'amber' : 'neutral'} className="shrink-0">
                  {t.priority(entry.priority)}
                </Badge>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-base font-medium text-fg">
                    {customerName(entry.customer)}
                    <span className="ml-2 text-sm font-normal text-fg-muted">
                      {[
                        entry.customer.number,
                        entry.customer.potential &&
                          t.potential(POTENTIAL_LABELS[entry.customer.potential]),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-sm text-fg-secondary">
                    {entry.lines
                      .map(
                        (line) =>
                          PRODUCT_LINE_INFO[line.line].name + (line.adjust ? ` (${t.adjust})` : ''),
                      )
                      .join(', ')}
                  </span>
                </span>
                <ChevronRight size={18} aria-hidden className="shrink-0 text-fg-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {more > 0 && (
        <button
          type="button"
          className="focus-ring min-h-11 self-start rounded-full px-3 text-sm font-medium text-accent hover:bg-accent-soft/40"
          onClick={() =>
            showCustomers({
              selection: { label: t.title, ids: idsWithPriority(dashboard) },
            })
          }
          data-testid="needs-more"
        >
          {t.more(more)}
        </button>
      )}
    </FileSection>
  );
}
