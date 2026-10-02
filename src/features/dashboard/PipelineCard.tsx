import { Link } from 'react-router';
import { ChevronRight, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { PipelineLine } from '@/core/dashboard/dashboard';
import { CONTRACT_STATUS_LABELS, PRODUCT_LINE_INFO } from '@/data/reference';
import { de } from '@/i18n/de';
import { FileSection } from '../customers/file/parts';
import { customerName } from '../customers/labels';
import { dueLabel } from '../reminders/useReminders';

const t = de.dashboard.pipeline;

/** Planned and offered contracts per line, each with the customer's next reminder. */
export function PipelineCard({ lines, today }: { lines: PipelineLine[]; today: string }) {
  return (
    <FileSection title={t.title} icon={Workflow} testId="dashboard-pipeline">
      <p className="-mt-2 text-sm text-fg-secondary">{t.text}</p>
      {lines.length === 0 ? (
        <p className="text-base text-fg-muted">{t.none}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {lines.map((group) => (
            <section key={group.line} aria-label={PRODUCT_LINE_INFO[group.line].name}>
              <h3 className="flex items-baseline gap-2 text-sm font-semibold text-fg">
                {PRODUCT_LINE_INFO[group.line].name}
                <span className="font-normal text-fg-muted">
                  {t.count(group.planned, group.offered)}
                </span>
              </h3>
              <ul className="-mx-2 flex flex-col">
                {group.entries.map((entry) => (
                  <li key={entry.customer.id}>
                    <Link
                      to={`/customers/${entry.customer.id}`}
                      className="focus-ring flex min-h-14 items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent-soft/40 active:bg-accent-soft/60"
                      data-testid="pipeline-entry"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-base text-fg">
                          {customerName(entry.customer)}
                          <span className="ml-2 text-sm text-fg-muted">
                            {entry.customer.number}
                          </span>
                        </span>
                        <span className="truncate text-sm text-fg-secondary">
                          {entry.nextReminder
                            ? t.next(dueLabel(entry.nextReminder.dueDate, today))
                            : t.noNext}
                        </span>
                      </span>
                      <Badge tone={entry.status === 'offered' ? 'accent' : 'neutral'}>
                        {CONTRACT_STATUS_LABELS[entry.status]}
                      </Badge>
                      <ChevronRight size={18} aria-hidden className="shrink-0 text-fg-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </FileSection>
  );
}
