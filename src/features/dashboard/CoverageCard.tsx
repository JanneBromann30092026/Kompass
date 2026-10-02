import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ActionMenu, cn, type ActionMenuItem, type MenuAnchor } from '@/components/ui';
import type { CoverageRow } from '@/core/dashboard/dashboard';
import { formatPercent } from '@/core/format';
import type { ContractStatus, ProductLine } from '@/data/domain';
import { PRODUCT_LINE_INFO } from '@/data/reference';
import type { NeedView } from '@/core/needs/decisions';
import type { Customer } from '@/data/schemas';
import { de } from '@/i18n/de';
import { FileSection } from '../customers/file/parts';
import { useShowCustomers } from './useDashboard';

const t = de.dashboard.coverage;

/** Bar segments in reading order; colours from the validated chart ramp. */
const SEGMENTS = [
  { key: 'concluded', label: t.concluded, color: 'bg-chart-concluded', statuses: ['concluded'] },
  { key: 'viaParents', label: t.parents, color: 'bg-chart-parents', statuses: ['viaParents'] },
  {
    key: 'pipeline',
    label: t.pipeline,
    color: 'bg-chart-pipeline',
    statuses: ['planned', 'offered'],
  },
] as const satisfies readonly {
  key: keyof CoverageRow;
  label: string;
  color: string;
  statuses: readonly ContractStatus[];
}[];

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-fg-secondary" aria-hidden>
      {SEGMENTS.map((segment) => (
        <li key={segment.key} className="flex items-center gap-1.5">
          <span className={cn('size-3 rounded-[4px]', segment.color)} />
          {segment.label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-full bg-amber" />
        {t.need}
      </li>
    </ul>
  );
}

function Bar({ row, total }: { row: CoverageRow; total: number }) {
  const rest = Math.max(0, total - row.concluded - row.viaParents - row.pipeline);
  return (
    <span className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-surface-sunken">
      {SEGMENTS.map(
        (segment) =>
          row[segment.key] > 0 && (
            <span
              key={segment.key}
              className={cn('h-full rounded-[4px] first:rounded-l-full', segment.color)}
              style={{ flex: `${row[segment.key]} 0 0` }}
            />
          ),
      )}
      {rest > 0 && <span className="h-full" style={{ flex: `${rest} 0 0` }} />}
    </span>
  );
}

/**
 * Product coverage per line: one quiet stacked bar per line (share of all customers),
 * the quote and the open need without a contract. Tapping a line lists its customers.
 */
export function CoverageCard({
  rows,
  total,
  customers,
  views,
}: {
  rows: CoverageRow[];
  total: number;
  customers: readonly Customer[];
  views: ReadonlyMap<string, readonly NeedView[]>;
}) {
  const showCustomers = useShowCustomers();
  const [menu, setMenu] = useState<{ line: ProductLine; anchor: MenuAnchor } | null>(null);

  const items = (line: ProductLine): ActionMenuItem[] => {
    const row = rows.find((r) => r.line === line);
    if (!row) return [];
    const name = PRODUCT_LINE_INFO[line].name;
    const statusItems = SEGMENTS.filter((segment) => row[segment.key] > 0).map(
      (segment): ActionMenuItem => ({
        id: segment.key,
        label: `${segment.label} (${row[segment.key]})`,
        onSelect: () => showCustomers({ product: { line, statuses: [...segment.statuses] } }),
      }),
    );
    if (row.needWithoutContract === 0) return statusItems;
    const ids = customers
      .filter(
        (customer) =>
          customer.contracts[line] !== 'concluded' &&
          views.get(customer.id)?.some((view) => view.line === line && view.group === 'now'),
      )
      .map((customer) => customer.id);
    return [
      ...statusItems,
      {
        id: 'need',
        label: `${t.need} (${row.needWithoutContract})`,
        onSelect: () => showCustomers({ selection: { label: t.selection(name, t.need), ids } }),
      },
    ];
  };

  return (
    <FileSection title={t.title} icon={ShieldCheck} testId="dashboard-coverage">
      <p className="-mt-2 text-sm text-fg-secondary">{t.text}</p>
      <Legend />
      <ul className="flex flex-col">
        {rows.map((row) => {
          const name = PRODUCT_LINE_INFO[row.line].name;
          const quote = row.quote === undefined ? t.noQuote : formatPercent(row.quote);
          return (
            <li key={row.line}>
              <button
                type="button"
                className="focus-ring -mx-2 flex w-[calc(100%+1rem)] flex-col gap-1.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent-soft/40 active:bg-accent-soft/60"
                aria-label={t.rowLabel(name, row.concluded, total, quote)}
                aria-haspopup="menu"
                onClick={(event) =>
                  setMenu({ line: row.line, anchor: event.currentTarget.getBoundingClientRect() })
                }
                data-testid="coverage-row"
                data-line={row.line}
              >
                <span className="flex min-h-6 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                    {name}
                  </span>
                  {row.needWithoutContract > 0 && (
                    <span
                      className="inline-flex h-6 items-center gap-1 rounded-full bg-amber-soft px-2 text-xs font-semibold text-amber-fg tabular-nums"
                      data-testid="coverage-need"
                    >
                      <span aria-hidden className="size-1.5 rounded-full bg-amber" />
                      {t.needCount(row.needWithoutContract)}
                    </span>
                  )}
                  <span
                    className="w-12 text-right text-sm font-semibold text-fg tabular-nums"
                    data-testid="coverage-quote"
                  >
                    {quote}
                  </span>
                </span>
                <Bar row={row} total={total} />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-fg-muted">{t.quoteHint}</p>
      <ActionMenu
        open={menu !== null}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
        items={menu ? items(menu.line) : []}
        label={menu ? t.menu(PRODUCT_LINE_INFO[menu.line].name) : undefined}
      />
    </FileSection>
  );
}
