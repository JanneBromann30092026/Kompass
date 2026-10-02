import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, SlidersHorizontal, X } from 'lucide-react';
import { Button, EmptyState, SearchInput, Surface } from '@/components/ui';
import { useHotkeys } from '@/app/hooks/useHotkeys';
import { useToday } from '@/app/hooks/useToday';
import { Page } from '@/app/shell/Page';
import { activeFilterCount, filterCustomers, type CustomerFilter } from '@/core/customers/list';
import { CONTRACT_STATUS_LABELS, LIFE_PHASE_INFO, PRODUCT_LINE_INFO } from '@/data/reference';
import { nextReminders } from '@/core/reminders/schedule';
import { useDataStore } from '@/data/store';
import { de } from '@/i18n/de';
import { CustomerRow } from './components/CustomerRow';
import { FilterPanel } from './FilterPanel';
import { useCustomerList } from './listStore';

const t = de.customers;

interface ActiveFilter {
  key: string;
  label: string;
  remove: Partial<CustomerFilter>;
}

/** Removable chips for the active filters. */
function activeFilters(filter: CustomerFilter): ActiveFilter[] {
  const f = t.filters;
  const chips: ActiveFilter[] = filter.lifePhases.map((phase) => ({
    key: `phase-${phase}`,
    label: LIFE_PHASE_INFO[phase].name,
    remove: { lifePhases: filter.lifePhases.filter((p) => p !== phase) },
  }));
  if (filter.product) {
    const statuses = filter.product.statuses.map((s) => CONTRACT_STATUS_LABELS[s]).join(', ');
    chips.push({
      key: 'product',
      label: `${PRODUCT_LINE_INFO[filter.product.line].name}: ${statuses}`,
      remove: { product: undefined },
    });
  }
  if (filter.marketing !== 'any') {
    chips.push({
      key: 'marketing',
      label: `${f.marketing}: ${f.marketingOptions[filter.marketing]}`,
      remove: { marketing: 'any' },
    });
  }
  if (filter.minors) chips.push({ key: 'minors', label: f.minors, remove: { minors: false } });
  if (filter.openPoints) {
    chips.push({ key: 'openPoints', label: f.openPoints, remove: { openPoints: false } });
  }
  if (filter.demo !== 'any') {
    chips.push({
      key: 'demo',
      label: `${f.demo}: ${f.demoOptions[filter.demo]}`,
      remove: { demo: 'any' },
    });
  }
  if (filter.archived) {
    chips.push({ key: 'archived', label: f.archived, remove: { archived: false } });
  }
  return chips;
}

/** Customer list with search, filters and sorting. */
export function CustomersPage() {
  const navigate = useNavigate();
  const today = useToday();
  const customers = useDataStore((s) => s.customers);
  const reminders = useDataStore((s) => s.reminders);
  const next = useMemo(() => nextReminders(Object.values(reminders)), [reminders]);
  const query = useCustomerList((s) => s.query);
  const filter = useCustomerList((s) => s.filter);
  const sort = useCustomerList((s) => s.sort);
  const setQuery = useCustomerList((s) => s.setQuery);
  const setFilter = useCustomerList((s) => s.setFilter);
  const resetFilter = useCustomerList((s) => s.resetFilter);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkeys([{ combo: '/', handler: () => searchRef.current?.focus() }]);

  const all = useMemo(() => Object.values(customers), [customers]);
  const shown = useMemo(
    () => filterCustomers(all, { query, filter, sort, today }),
    [all, query, filter, sort, today],
  );
  const pool = all.filter((c) => c.archived === filter.archived).length;
  const archivedCount = all.filter((c) => c.archived).length;
  const filterCount = activeFilterCount(filter);
  const chips = activeFilters(filter);

  const newCustomer = (
    <Button icon={Plus} onClick={() => void navigate('/customers/new')} data-testid="new-customer">
      {t.newCustomer}
    </Button>
  );

  if (all.length === 0) {
    return (
      <Page title={t.title} actions={newCustomer}>
        <EmptyState
          title={t.emptyTitle}
          text={`${t.emptyText} ${t.emptyDemo}`}
          action={newCustomer}
        />
      </Page>
    );
  }

  return (
    <Page title={t.title} actions={newCustomer}>
      <div className="flex flex-col gap-4" data-testid="customers-page">
        <div className="flex items-center gap-2">
          <SearchInput
            ref={searchRef}
            value={query}
            onChange={setQuery}
            label={t.search}
            clearLabel={t.clearSearch}
            placeholder={t.searchPlaceholder}
            className="min-w-0 flex-1"
            data-testid="customer-search"
          />
          <Button
            variant={filterCount > 0 ? 'primary' : 'secondary'}
            icon={SlidersHorizontal}
            onClick={() => setFiltersOpen(true)}
            data-testid="open-filters"
          >
            {filterCount > 0 ? t.filterCount(filterCount) : t.filter}
          </Button>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2" data-testid="active-filters">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.remove)}
                aria-label={t.filters.remove(chip.label)}
                className="focus-ring no-callout inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent-soft px-4 text-sm font-medium text-accent"
              >
                {chip.label}
                <X size={15} aria-hidden />
              </button>
            ))}
          </div>
        )}

        <p
          className="px-2 text-sm font-medium text-fg-muted"
          role="status"
          data-testid="customer-count"
        >
          {t.count(shown.length, pool)}
          {!filter.archived && archivedCount > 0 && ` · ${t.archivedCount(archivedCount)}`}
        </p>

        {shown.length === 0 ? (
          <EmptyState
            title={filter.archived && pool === 0 ? t.archiveEmpty : t.noMatchTitle}
            text={filter.archived && pool === 0 ? undefined : t.noMatchText}
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  resetFilter();
                }}
              >
                {t.resetFilters}
              </Button>
            }
          />
        ) : (
          <Surface padding="none" className="overflow-hidden">
            <ul className="divide-y divide-line" data-testid="customer-list">
              {shown.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  today={today}
                  next={next.get(customer.id)}
                />
              ))}
            </ul>
          </Surface>
        )}
      </div>
      <FilterPanel open={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </Page>
  );
}
