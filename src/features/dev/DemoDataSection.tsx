import { useState } from 'react';
import { Database, Gauge, Sparkles, Trash2, Users } from 'lucide-react';
import { Button, ConfirmDialog, Surface, toast } from '@/components/ui';
import { SYNTHETIC_COUNT } from '@/data/demo/synthetic';
import { demoRepo, isSynthetic } from '@/data/repositories/demoRepo';
import { useDataStore } from '@/data/store';
import { de } from '@/i18n/de';
import { Stat } from './VaultDevSection';

const t = de.dev.demoData;

type Action = 'load' | 'remove' | 'synthetic' | 'removeSynthetic' | 'measure';

/** Loads and removes the demo customers and synthetic data for performance tests. */
export function DemoDataSection() {
  const stats = useDataStore((s) => {
    const customers = Object.values(s.customers);
    const synthetic = customers.filter(isSynthetic).length;
    return `${customers.length}|${customers.filter((c) => c.demo).length - synthetic}|${synthetic}`;
  });
  const [total = 0, demo = 0, synthetic = 0] = stats.split('|').map(Number);
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState('');

  const run = async (action: Action, task: () => Promise<string>) => {
    setBusy(action);
    try {
      const message = await task();
      setResult(message);
      toast.success(message);
    } catch {
      toast.error(t.failed);
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null;

  return (
    <section className="flex flex-col gap-3" data-testid="dev-section-demo">
      <h2 className="px-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">
        {t.title}
      </h2>
      <Surface className="flex flex-col gap-5">
        <p className="text-base text-fg-secondary">{t.hint}</p>
        <div className="grid grid-cols-3 gap-3">
          <Stat label={t.customers} value={total} testId="demo-total" />
          <Stat label={t.demo} value={demo} testId="demo-count" />
          <Stat label={t.synthetic} value={synthetic} testId="demo-synthetic" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            icon={Users}
            loading={busy === 'load'}
            disabled={disabled && busy !== 'load'}
            onClick={() =>
              void run('load', async () => t.loaded((await demoRepo.loadDemoData()).created))
            }
            data-testid="demo-load"
          >
            {t.load}
          </Button>
          <Button
            variant="secondary"
            icon={Trash2}
            disabled={disabled || demo === 0}
            onClick={() => setConfirming(true)}
            data-testid="demo-remove"
          >
            {t.remove}
          </Button>
        </div>
        <p className="text-sm text-fg-muted">{t.numbersHint}</p>
        <div className="h-px bg-line" />
        <div className="flex flex-col gap-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-fg">
            <Gauge size={18} aria-hidden className="text-accent" />
            {t.performance}
          </h3>
          <p className="text-sm text-fg-secondary">{t.performanceHint(SYNTHETIC_COUNT)}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            icon={Sparkles}
            loading={busy === 'synthetic'}
            disabled={disabled && busy !== 'synthetic'}
            onClick={() =>
              void run('synthetic', async () => {
                const { created, ms } = await demoRepo.addSynthetic(SYNTHETIC_COUNT);
                return t.syntheticAdded(created, ms);
              })
            }
            data-testid="demo-synthetic-add"
          >
            {t.addSynthetic(SYNTHETIC_COUNT)}
          </Button>
          <Button
            variant="secondary"
            icon={Trash2}
            loading={busy === 'removeSynthetic'}
            disabled={(disabled && busy !== 'removeSynthetic') || synthetic === 0}
            onClick={() =>
              void run('removeSynthetic', async () =>
                t.syntheticRemoved(await demoRepo.removeSynthetic()),
              )
            }
            data-testid="demo-synthetic-remove"
          >
            {t.removeSynthetic}
          </Button>
          <Button
            variant="ghost"
            icon={Database}
            loading={busy === 'measure'}
            disabled={disabled && busy !== 'measure'}
            onClick={() =>
              void run('measure', async () => {
                const { rows, ms } = await demoRepo.measureDecrypt();
                return t.measured(rows, ms);
              })
            }
            data-testid="demo-measure"
          >
            {t.measure}
          </Button>
        </div>
        {result && (
          <p role="status" className="text-sm font-medium text-fg" data-testid="demo-result">
            {result}
          </p>
        )}
      </Surface>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => run('remove', async () => t.removed(await demoRepo.removeDemoData()))}
        title={t.removeTitle}
        message={t.removeText}
        confirmLabel={t.removeConfirm}
      />
    </section>
  );
}
