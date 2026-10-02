import type { ReactNode } from 'react';
import { Pencil, type LucideIcon } from 'lucide-react';
import { cn, IconButton, Surface } from '@/components/ui';
import { de } from '@/i18n/de';

const t = de.customers.file;

/** A titled card of the customer file with an optional edit button. */
export function FileSection({
  title,
  icon: Icon,
  onEdit,
  editLabel,
  actions,
  children,
  className,
  testId,
}: {
  title: string;
  icon?: LucideIcon;
  onEdit?: () => void;
  editLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <Surface className={cn('flex flex-col gap-3', className)} data-testid={testId}>
      <div className="-my-1 flex min-h-11 items-center gap-2">
        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-lg font-semibold tracking-tight text-fg">
          {Icon && <Icon size={20} aria-hidden className="shrink-0 text-accent" />}
          <span className="truncate">{title}</span>
        </h2>
        {actions}
        {onEdit && (
          <IconButton
            icon={Pencil}
            label={editLabel ?? t.editSection(title)}
            onClick={onEdit}
            variant="secondary"
          />
        )}
      </div>
      {children}
    </Surface>
  );
}

export interface DetailItem {
  label: string;
  value?: ReactNode;
}

/** Label/value pairs; missing values show a dash. */
export function DetailList({ items }: { items: DetailItem[] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-sm text-fg-secondary">{item.label}</dt>
          <dd
            className={cn(
              'min-w-0 text-base break-words',
              item.value === undefined || item.value === '' ? 'text-fg-muted' : 'text-fg',
            )}
          >
            {item.value === undefined || item.value === '' ? t.emptyValue : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
