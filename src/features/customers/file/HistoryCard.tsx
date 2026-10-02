import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, History } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import { formatDateTime } from '@/core/format';
import type { HistoryEntry } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import { de } from '@/i18n/de';
import { spring } from '@/styles/motion';
import { describeChange } from '../describe';
import { FileSection } from './parts';

const t = de.customers.file;
const VISIBLE = 5;
const SUMMARY_FIELDS = 3;

/** Values that say nothing when a record is created ("Erledigt: nein", empty lists). */
const isBlank = (value: unknown) =>
  value === false || value === '' || (Array.isArray(value) && value.length === 0);

/** Names a created or deleted record by its title/kind and date; otherwise the fields. */
function summaryOf(entry: HistoryEntry, labels: string[]): string {
  if (entry.entity !== 'customer' && entry.action !== 'updated') {
    const pick = (path: string) => {
      const change = entry.changes.find((c) => c.path === path);
      const value = change?.to ?? change?.from;
      return value === undefined ? undefined : describeChange(entry.entity, { path, to: value }).to;
    };
    const parts = [pick('title') ?? pick('kind'), pick('dueDate') ?? pick('date')].filter(Boolean);
    if (parts.length > 0) return parts.join(' · ');
  }
  return labels.slice(0, SUMMARY_FIELDS).join(', ') + (labels.length > SUMMARY_FIELDS ? ' …' : '');
}

function Entry({ entry }: { entry: HistoryEntry }) {
  const [open, setOpen] = useState(false);
  const changes = entry.changes
    .filter((change) => entry.action === 'updated' || !isBlank(change.to ?? change.from))
    .map((change) => describeChange(entry.entity, change));
  const names = [...new Set(changes.map((c) => c.label))];
  const summary = summaryOf(entry, names);
  return (
    <li className="py-1" data-testid="history-entry">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="focus-ring no-callout flex min-h-11 w-full items-start gap-3 rounded-lg px-1 py-1.5 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-medium text-fg">
            {t.historyEntities[entry.entity]} {t.historyActions[entry.action]}
            <span className="ml-2 text-sm font-normal text-fg-muted">
              {formatDateTime(entry.updatedAt)}
            </span>
          </span>
          {summary && <span className="truncate text-sm text-fg-secondary">{summary}</span>}
        </span>
        <ChevronDown
          size={18}
          aria-hidden
          className={cn('mt-1 shrink-0 text-fg-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.default}
            className="overflow-hidden"
          >
            <dl className="mx-1 mb-2 flex flex-col gap-1.5 rounded-lg bg-surface-sunken p-3 text-sm">
              {changes.map((change, index) => (
                <div key={`${change.label}-${index}`} className="flex flex-wrap gap-x-2">
                  <dt className="text-fg-secondary">{change.label}:</dt>
                  <dd className="min-w-0 break-words text-fg">
                    {entry.action === 'updated'
                      ? (change.diff ?? `${change.from} → ${change.to}`)
                      : entry.action === 'deleted'
                        ? change.from
                        : change.to}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/** Dated history of the file (newest first); each entry expands to its changes. */
export function HistoryCard({ customerId }: { customerId: string }) {
  const all = useDataStore((s) => s.history);
  const [showAll, setShowAll] = useState(false);
  const entries = Object.values(all)
    .filter((entry) => entry.customerId === customerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const visible = showAll ? entries : entries.slice(0, VISIBLE);
  return (
    <FileSection title={t.sections.history} icon={History} testId="file-history">
      {entries.length === 0 ? (
        <p className="text-base text-fg-muted">{t.historyEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {visible.map((entry) => (
            <Entry key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
      {entries.length > VISIBLE && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="self-start"
        >
          {showAll ? t.historyShowLess : t.historyShowAll(entries.length)}
        </Button>
      )}
    </FileSection>
  );
}
