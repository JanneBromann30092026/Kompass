import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Database, UserPlus } from 'lucide-react';
import { Button, EmptyState, Surface, toast } from '@/components/ui';
import { Page } from '@/app/shell/Page';
import { formatLongDate } from '@/core/format';
import { useSettings } from '@/features/settings/settingsStore';
import { de } from '@/i18n/de';
import { spring } from '@/styles/motion';
import { CoverageCard } from './CoverageCard';
import { MetricTiles } from './MetricTiles';
import { OpenNeedsCard } from './OpenNeedsCard';
import { PipelineCard } from './PipelineCard';
import { TodaySection } from './TodaySection';
import { useDashboard } from './useDashboard';

const t = de.dashboard;

function greetingFor(hour: number): string {
  if (hour < 11) return t.greeting.morning;
  if (hour < 18) return t.greeting.day;
  return t.greeting.evening;
}

/** First start: create the first customer – or, in developer mode, load the demo data. */
function Welcome() {
  const navigate = useNavigate();
  const devMode = useSettings((s) => s.devMode);
  const [loading, setLoading] = useState(false);

  const loadDemo = async () => {
    setLoading(true);
    try {
      const { demoRepo } = await import('@/data/repositories/demoRepo');
      toast.success(t.empty.demoLoaded((await demoRepo.loadDemoData()).created));
    } catch {
      toast.error(t.empty.demoFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Surface padding="lg" data-testid="dashboard-empty">
      <EmptyState
        title={t.empty.title}
        text={t.empty.text}
        action={
          <div className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              icon={UserPlus}
              onClick={() => void navigate('/customers/new')}
              data-testid="dashboard-create"
            >
              {t.empty.create}
            </Button>
            {devMode && (
              <>
                <Button
                  variant="secondary"
                  icon={Database}
                  loading={loading}
                  onClick={() => void loadDemo()}
                  data-testid="dashboard-demo"
                >
                  {t.empty.demo}
                </Button>
                <p className="text-sm text-fg-muted">{t.empty.demoHint}</p>
              </>
            )}
          </div>
        }
      />
    </Surface>
  );
}

/** Start page: greeting, today, key figures, coverage, open needs and pipeline. */
export function DashboardPage() {
  const { dashboard, today } = useDashboard();
  const [hour] = useState(() => new Date().getHours());
  const empty = dashboard.metrics.customers === 0;

  return (
    <Page title={greetingFor(hour)}>
      <div className="flex flex-col gap-4" data-testid="dashboard">
        <p className="-mt-2 text-base text-fg-secondary" data-testid="dashboard-date">
          {formatLongDate(today)}
        </p>
        {empty ? (
          <Welcome />
        ) : (
          <motion.div
            className="flex flex-col gap-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.soft}
          >
            <TodaySection dashboard={dashboard} today={today} />
            <MetricTiles metrics={dashboard.metrics} />
            <div className="grid items-start gap-4 wide:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-4">
                <CoverageCard
                  rows={dashboard.coverage}
                  total={dashboard.metrics.customers}
                  customers={dashboard.customers}
                  views={dashboard.views}
                />
                <PipelineCard lines={dashboard.pipeline} today={today} />
              </div>
              <OpenNeedsCard dashboard={dashboard} />
            </div>
          </motion.div>
        )}
      </div>
    </Page>
  );
}
