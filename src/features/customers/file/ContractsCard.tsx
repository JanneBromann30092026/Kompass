import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, Check, FileCheck2 } from 'lucide-react';
import { ActionMenu, cn, toast, type MenuAnchor } from '@/components/ui';
import {
  CONTRACT_STATUSES,
  PRODUCT_LINES,
  type ContractStatus,
  type ProductLine,
} from '@/data/domain';
import { customersRepo } from '@/data/repositories';
import { CONTRACT_STATUS_LABELS, PRODUCT_LINE_INFO } from '@/data/reference';
import type { Customer } from '@/data/schemas';
import { de } from '@/i18n/de';
import { FileSection } from './parts';

const t = de.customers.file;

const STATUS_STYLES: Record<ContractStatus, string> = {
  concluded: 'bg-success',
  planned: 'bg-accent',
  offered: 'bg-accent',
  viaParents: 'bg-amber',
  declined: 'bg-warning',
  no: 'bg-fg-muted',
  notRelevant: 'bg-line-strong',
  open: 'bg-transparent border border-fg-muted',
};

/** Status per product line; tap a line to change it (recorded in the history). */
export function ContractsCard({ customer }: { customer: Customer }) {
  const navigate = useNavigate();
  const [menu, setMenu] = useState<{ line: ProductLine; anchor: MenuAnchor } | null>(null);

  const setStatus = async (line: ProductLine, status: ContractStatus) => {
    if (customer.contracts[line] === status) return;
    try {
      await customersRepo.update(customer.id, {
        contracts: { ...customer.contracts, [line]: status },
      });
      toast.success(
        t.contractChanged(PRODUCT_LINE_INFO[line].name, CONTRACT_STATUS_LABELS[status]),
      );
    } catch {
      toast.error(de.customers.errors.saveFailed);
    }
  };

  return (
    <FileSection title={t.sections.contracts} icon={FileCheck2} testId="file-contracts">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PRODUCT_LINES.map((line) => {
          const status = customer.contracts[line];
          const info = PRODUCT_LINE_INFO[line];
          return (
            <li key={line}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-label={t.contractStatus(info.name)}
                data-testid={`contract-chip-${line}`}
                data-status={status}
                onClick={(event) =>
                  setMenu({ line, anchor: event.currentTarget.getBoundingClientRect() })
                }
                className="focus-ring no-callout flex min-h-14 w-full flex-col items-start justify-center gap-0.5 rounded-lg border border-line bg-surface-sunken px-3.5 py-2 text-left transition-[transform,border-color] duration-150 hover:border-line-strong active:scale-[0.98]"
              >
                <span className="text-sm font-semibold text-fg">{info.name}</span>
                <span className="flex items-center gap-1.5 text-sm text-fg-secondary">
                  <span
                    aria-hidden
                    className={cn('size-2.5 rounded-full', STATUS_STYLES[status])}
                  />
                  {CONTRACT_STATUS_LABELS[status]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <ActionMenu
        open={menu !== null}
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        label={menu ? t.contractStatus(PRODUCT_LINE_INFO[menu.line].name) : undefined}
        items={
          menu
            ? [
                ...CONTRACT_STATUSES.map((status) => ({
                  id: status,
                  label: CONTRACT_STATUS_LABELS[status],
                  icon: customer.contracts[menu.line] === status ? Check : undefined,
                  onSelect: () => void setStatus(menu.line, status),
                })),
                {
                  id: 'knowledge',
                  label: t.knowledgeLink(PRODUCT_LINE_INFO[menu.line].name),
                  icon: BookOpen,
                  onSelect: () => void navigate(`/knowledge/product/${menu.line}`),
                },
              ]
            : []
        }
      />
    </FileSection>
  );
}
