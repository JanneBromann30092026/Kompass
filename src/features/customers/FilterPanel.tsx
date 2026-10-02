import { Button, ChoiceChip, SegmentedControl, Select, Toggle } from '@/components/ui';
import { CUSTOMER_SORTS, type CustomerFilter } from '@/core/customers/list';
import {
  CONTRACT_STATUSES,
  LIFE_PHASES,
  PRODUCT_LINES,
  type ContractStatus,
  type ProductLine,
} from '@/data/domain';
import { CONTRACT_STATUS_LABELS, LIFE_PHASE_INFO, PRODUCT_LINE_INFO } from '@/data/reference';
import { de } from '@/i18n/de';
import { EditPanel } from './components/EditPanel';
import { useCustomerList } from './listStore';

const t = de.customers.filters;

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2.5 px-1 text-sm font-medium text-fg-secondary">{title}</legend>
      {children}
    </fieldset>
  );
}

const toggled = <T,>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

/** Filters and sorting of the customer list; changes apply immediately. */
export function FilterPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const filter = useCustomerList((s) => s.filter);
  const sort = useCustomerList((s) => s.sort);
  const setFilter = useCustomerList((s) => s.setFilter);
  const setSort = useCustomerList((s) => s.setSort);
  const resetFilter = useCustomerList((s) => s.resetFilter);
  const product = filter.product;

  const setProduct = (line: ProductLine | '') =>
    setFilter({
      product: line ? { line, statuses: product?.statuses ?? ['concluded'] } : undefined,
    });

  return (
    <EditPanel
      open={open}
      onClose={onClose}
      title={t.title}
      footer={
        <>
          <Button variant="ghost" onClick={resetFilter} data-testid="filter-reset">
            {t.reset}
          </Button>
          <Button onClick={onClose} data-testid="filter-done">
            {t.done}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6 pb-2" data-testid="filter-panel">
        <Select
          label={t.sort}
          value={sort}
          options={CUSTOMER_SORTS.map((value) => ({ value, label: t.sorts[value] }))}
          onChange={setSort}
          data-testid="filter-sort"
        />

        <Group title={t.lifePhase}>
          <div className="flex flex-wrap gap-2">
            {LIFE_PHASES.map((phase) => (
              <ChoiceChip
                key={phase}
                selected={filter.lifePhases.includes(phase)}
                onToggle={() => setFilter({ lifePhases: toggled(filter.lifePhases, phase) })}
              >
                {LIFE_PHASE_INFO[phase].name}
              </ChoiceChip>
            ))}
          </div>
        </Group>

        <Group title={t.product}>
          <Select<ProductLine | ''>
            aria-label={t.product}
            value={product?.line ?? ''}
            options={[
              { value: '', label: t.anyProduct },
              ...PRODUCT_LINES.map((line) => ({
                value: line,
                label: `${PRODUCT_LINE_INFO[line].name} · ${PRODUCT_LINE_INFO[line].longName}`,
              })),
            ]}
            onChange={setProduct}
            data-testid="filter-product"
          />
          {product && (
            <div className="flex flex-wrap gap-2" aria-label={t.productStatus} role="group">
              {CONTRACT_STATUSES.map((status: ContractStatus) => (
                <ChoiceChip
                  key={status}
                  selected={product.statuses.includes(status)}
                  onToggle={() => {
                    const statuses = toggled(product.statuses, status);
                    setFilter({
                      product: statuses.length > 0 ? { ...product, statuses } : undefined,
                    });
                  }}
                >
                  {CONTRACT_STATUS_LABELS[status]}
                </ChoiceChip>
              ))}
            </div>
          )}
        </Group>

        <div className="flex flex-col gap-2">
          <span className="px-1 text-sm font-medium text-fg-secondary">{t.marketing}</span>
          <SegmentedControl<CustomerFilter['marketing']>
            label={t.marketing}
            value={filter.marketing}
            options={(['any', 'granted', 'missing'] as const).map((value) => ({
              value,
              label: t.marketingOptions[value],
            }))}
            onChange={(marketing) => setFilter({ marketing })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="px-1 text-sm font-medium text-fg-secondary">{t.demo}</span>
          <SegmentedControl<CustomerFilter['demo']>
            label={t.demo}
            value={filter.demo}
            options={(['any', 'only', 'hide'] as const).map((value) => ({
              value,
              label: t.demoOptions[value],
            }))}
            onChange={(demo) => setFilter({ demo })}
          />
        </div>

        <div className="flex flex-col divide-y divide-line">
          <Toggle
            label={t.minors}
            checked={filter.minors}
            onChange={(minors) => setFilter({ minors })}
          />
          <Toggle
            label={t.openPoints}
            checked={filter.openPoints}
            onChange={(openPoints) => setFilter({ openPoints })}
          />
          <Toggle
            label={t.archived}
            description={t.archivedHint}
            checked={filter.archived}
            onChange={(archived) => setFilter({ archived })}
          />
        </div>
      </div>
    </EditPanel>
  );
}
