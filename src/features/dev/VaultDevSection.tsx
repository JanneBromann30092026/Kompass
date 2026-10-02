import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Surface, toast } from '@/components/ui';
import { customersRepo } from '@/data/repositories';
import { devRepo, type RawPreview } from '@/data/repositories/devRepo';
import { useDataStore } from '@/data/store';
import { de } from '@/i18n/de';

const t = de.dev.vault;

function pick<T>(list: readonly T[], index: number): T {
  return list[index % list.length] as T;
}

export function Stat({
  label,
  value,
  testId,
}: {
  label: string;
  value: string | number;
  testId: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-surface-sunken px-4 py-3">
      <span className="text-sm text-fg-secondary">{label}</span>
      <span className="text-xl font-semibold text-fg tabular-nums" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

/** Creates, changes and deletes invented customers to check encryption, numbers and history. */
export function VaultDevSection() {
  const customers = useDataStore((s) => s.customers);
  const historyCount = useDataStore((s) => Object.keys(s.history).length);
  const [raw, setRaw] = useState<RawPreview | null>(null);
  const [lastNumber, setLastNumber] = useState(0);
  const [busy, setBusy] = useState(false);
  const list = Object.values(customers).sort((a, b) =>
    b.number.localeCompare(a.number, 'de', { numeric: true }),
  );
  const newest = list[0];

  // Refresh the raw view whenever the decrypted data changes (also from other tabs).
  useEffect(() => {
    let cancelled = false;
    void Promise.all([devRepo.newestCustomerRow(), devRepo.lastCustomerSequence()]).then(
      ([row, sequence]) => {
        if (cancelled) return;
        setRaw(row);
        setLastNumber(sequence);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [customers]);

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    try {
      toast.success(await action());
    } catch {
      toast.error(de.lock.errors.failed);
    } finally {
      setBusy(false);
    }
  };

  const create = () =>
    run(async () => {
      const index = lastNumber;
      const customer = await customersRepo.create({
        firstName: pick(t.testNames, index),
        birthYear: 1990 + (index % 15),
        occupation: pick(t.occupations, index),
        tags: ['testdaten'],
        demo: true,
      });
      return t.created(customer.number);
    });

  const update = () =>
    run(async () => {
      if (!newest) return '';
      const index = (t.occupations as readonly string[]).indexOf(newest.occupation ?? '') + 1;
      const updated = await customersRepo.update(newest.id, {
        occupation: pick(t.occupations, index),
      });
      return t.updated(updated.number);
    });

  const remove = () =>
    run(async () => {
      if (!newest) return '';
      await customersRepo.remove(newest.id);
      return t.removed(newest.number);
    });

  return (
    <section className="flex flex-col gap-3" data-testid="dev-section-vault">
      <h2 className="px-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">
        {t.title}
      </h2>
      <Surface className="flex flex-col gap-5">
        <p className="text-base text-fg-secondary">{t.hint}</p>
        <div className="grid grid-cols-3 gap-3">
          <Stat label={t.customers} value={list.length} testId="vault-customer-count" />
          <Stat label={t.historyEntries} value={historyCount} testId="vault-history-count" />
          <Stat
            label={t.lastNumber}
            value={lastNumber ? `K-${String(lastNumber).padStart(4, '0')}` : '–'}
            testId="vault-last-number"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button icon={Plus} onClick={() => void create()} loading={busy}>
            {t.create}
          </Button>
          <Button
            variant="secondary"
            icon={Pencil}
            onClick={() => void update()}
            disabled={!newest || busy}
          >
            {t.update}
          </Button>
          <Button
            variant="secondary"
            icon={Trash2}
            onClick={() => void remove()}
            disabled={!newest || busy}
          >
            {t.remove}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-fg-secondary">{t.decrypted}</h3>
            {list.length === 0 && <p className="text-sm text-fg-muted">{t.empty}</p>}
            <ul className="flex flex-col gap-1.5" data-testid="vault-customers">
              {list.slice(0, 5).map((customer) => (
                <li key={customer.id} className="flex items-center gap-2 text-base text-fg">
                  <Badge tone="accent">{customer.number}</Badge>
                  <span className="truncate">
                    {customer.firstName} · {customer.occupation}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <h3 className="text-sm font-semibold text-fg-secondary">{t.stored}</h3>
            {raw ? (
              <dl
                className="flex flex-col gap-1 font-mono text-xs break-all text-fg-secondary"
                data-testid="vault-raw"
              >
                <dt className="text-fg-muted">id</dt>
                <dd>{raw.id}</dd>
                <dt className="text-fg-muted">{t.iv}</dt>
                <dd>{raw.iv}</dd>
                <dt className="text-fg-muted">
                  {t.ciphertext} ({t.bytes(raw.bytes)})
                </dt>
                <dd>{raw.ciphertext}…</dd>
              </dl>
            ) : (
              <p className="text-sm text-fg-muted">{t.empty}</p>
            )}
          </div>
        </div>
      </Surface>
    </section>
  );
}
