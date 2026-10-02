import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Ban, CircleDollarSign, ClipboardList, ListOrdered, Scale } from 'lucide-react';
import { Surface } from '@/components/ui';
import { Page } from '@/app/shell/Page';
import {
  PRIORITIZATION,
  PRODUCT_LINE_INFO,
  productLinesByPriority,
  QUESTIONNAIRE,
} from '@/data/reference';
import { de } from '@/i18n/de';
import { spring } from '@/styles/motion';
import {
  BackButton,
  BulletList,
  ChipList,
  DetailSection,
  Hero,
  Hint,
  PriorityBadge,
} from './parts';

const t = de.knowledge;

function Content({ testId, children }: { testId: string; children: ReactNode }) {
  return (
    <motion.div
      className="flex flex-col gap-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
      data-testid={testId}
    >
      {children}
    </motion.div>
  );
}

/** Priority levels 1–3 with their product lines. */
export function PrioritiesPage() {
  return (
    <Page title={t.basics.priorities} leading={<BackButton />}>
      <Content testId="knowledge-priorities">
        <Hero
          icon={ListOrdered}
          kind={t.sections.basics}
          subtitle={PRIORITIZATION.principle}
          description={t.basics.prioritiesText}
        />
        {PRIORITIZATION.levels.map(({ level, name, description }) => (
          <Surface key={level} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge level={level} />
              <h2 className="text-lg font-semibold tracking-tight text-fg">{name}</h2>
            </div>
            <p className="text-base text-fg-secondary">{description}</p>
            <ChipList
              showPriority={false}
              entries={productLinesByPriority()
                .filter((line) => PRODUCT_LINE_INFO[line].priority === level)
                .map((key) => ({ kind: 'product', key }))}
            />
          </Surface>
        ))}
        <div className="grid gap-4 wide:grid-cols-2">
          <DetailSection title={t.priorities.deviation} icon={Scale}>
            <p className="text-base text-fg">{PRIORITIZATION.deviation}</p>
          </DetailSection>
          <DetailSection title={t.priorities.potential} icon={CircleDollarSign}>
            <p className="text-base text-fg">{PRIORITIZATION.potential}</p>
          </DetailSection>
        </div>
      </Content>
    </Page>
  );
}

/** Question catalogue for a new customer, with what must not be stored. */
export function QuestionnairePage() {
  const { doNotStore } = QUESTIONNAIRE;
  return (
    <Page title={t.basics.questionnaire} leading={<BackButton />}>
      <Content testId="knowledge-questionnaire">
        <Hero
          icon={ClipboardList}
          kind={t.sections.basics}
          subtitle={QUESTIONNAIRE.title}
          description={t.basics.questionnaireText}
        />
        <div className="grid gap-4 sm:grid-cols-2 wide:grid-cols-3">
          {QUESTIONNAIRE.sections.map((section, index) => (
            <Surface key={section.key} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-fg">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent tabular-nums">
                  {index + 1}
                </span>
                {section.title}
              </h2>
              <BulletList items={section.questions} />
            </Surface>
          ))}
        </div>
        <Hint tone="amber">{QUESTIONNAIRE.missingAnswers}</Hint>
        <DetailSection title={doNotStore.title} icon={Ban} testId="questionnaire-do-not-store">
          <BulletList items={doNotStore.items} tone="negative" />
          <p className="text-sm text-fg-secondary">{doNotStore.optional}</p>
        </DetailSection>
      </Content>
    </Page>
  );
}
