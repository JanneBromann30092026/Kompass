import { motion } from 'motion/react';
import { CalendarClock, House, Megaphone, Users, Waypoints, type LucideIcon } from 'lucide-react';
import { Badge, Surface } from '@/components/ui';
import { Page } from '@/app/shell/Page';
import { de } from '@/i18n/de';
import { spring } from '@/styles/motion';

export type ComingSoonKey = keyof typeof de.comingSoon.pages;

/** Navigation label, icon and roadmap step of every page that is still a placeholder. */
const PAGES: Record<ComingSoonKey, { title: string; icon: LucideIcon; step: number }> = {
  dashboard: { title: de.nav.dashboard, icon: House, step: 8 },
  customers: { title: de.nav.customers, icon: Users, step: 4 },
  reminders: { title: de.nav.reminders, icon: CalendarClock, step: 6 },
  campaigns: { title: de.nav.campaigns, icon: Megaphone, step: 9 },
  network: { title: de.nav.network, icon: Waypoints, step: 11 },
};

/** Friendly placeholder for a page that a later roadmap step fills in. */
export function ComingSoonPage({ page }: { page: ComingSoonKey }) {
  const { title, icon: Icon, step } = PAGES[page];
  const texts = de.comingSoon.pages[page];
  return (
    <Page title={title} width="narrow">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.soft}
        data-testid={`coming-soon-${page}`}
      >
        <Surface padding="lg" className="relative overflow-hidden">
          <div aria-hidden className="coming-soon-glow pointer-events-none absolute -inset-10" />
          <div className="relative flex flex-col items-center gap-5 py-6 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-accent-soft text-accent ring-8 ring-accent-soft/40">
              <Icon size={34} aria-hidden strokeWidth={1.9} />
            </span>
            <Badge tone="amber">{de.comingSoon.badge(step)}</Badge>
            <div className="flex max-w-lg flex-col gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-fg">{texts.heading}</h2>
              <p className="text-base text-fg-secondary">{texts.text}</p>
            </div>
          </div>
        </Surface>
      </motion.div>
    </Page>
  );
}
