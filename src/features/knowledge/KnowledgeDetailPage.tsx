import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import {
  BellRing,
  CircleCheck,
  CircleX,
  Lightbulb,
  MessageCircleQuestion,
  MessagesSquare,
  Sparkles,
  Tags,
  Zap,
} from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';
import { Page } from '@/app/shell/Page';
import type { LifeEventKind, LifePhase, ProductLine, Topic } from '@/data/domain';
import {
  knowledgeTitle,
  LIFE_EVENT_INFO,
  LIFE_PHASE_INFO,
  NEED_RULES,
  parseKnowledgeRef,
  phasesForProduct,
  phasesWithEvent,
  PRODUCT_LINE_INFO,
  productsTriggeredByEvent,
  productsTriggeredByPhase,
  RULE_DISCLAIMER,
  TOPIC_INFO,
  type KnowledgeRef,
} from '@/data/reference';
import { de } from '@/i18n/de';
import { spring } from '@/styles/motion';
import { knowledgeIcon } from './icons';
import {
  BackButton,
  BulletList,
  ChipList,
  DetailSection,
  EntryCard,
  Hero,
  Hint,
  MatchingCustomers,
  PriorityBadge,
} from './parts';
import { useMatchingCustomers } from './matching';

const t = de.knowledge;

const products = (keys: readonly ProductLine[]): KnowledgeRef[] =>
  keys.map((key) => ({ kind: 'product', key }));
const phases = (keys: readonly LifePhase[]): KnowledgeRef[] =>
  keys.map((key) => ({ kind: 'phase', key }));
const events = (keys: readonly LifeEventKind[]): KnowledgeRef[] =>
  keys.map((key) => ({ kind: 'event', key }));
const topics = (keys: readonly Topic[]): KnowledgeRef[] =>
  keys.map((key) => ({ kind: 'topic', key }));

function ProductDetail({ line }: { line: ProductLine }) {
  const info = PRODUCT_LINE_INFO[line];
  const rule = NEED_RULES[line];
  const typicalIn = phasesForProduct(line);
  const hasTriggers = rule.triggers.events.length > 0 || rule.triggers.phases.length > 0;
  return (
    <>
      <Hero
        icon={knowledgeIcon({ kind: 'product', key: line })}
        kind={t.kinds.product}
        badges={<PriorityBadge level={info.priority} />}
        subtitle={info.longName}
        description={info.description}
      />
      <div className="grid gap-4 wide:grid-cols-2">
        <DetailSection title={t.product.usefulWhen} icon={CircleCheck} testId="rule-useful">
          <BulletList items={rule.usefulWhen} tone="positive" />
        </DetailSection>
        <DetailSection title={t.product.notUsefulWhen} icon={CircleX} testId="rule-not-useful">
          <BulletList items={rule.notUsefulWhen} tone="negative" />
        </DetailSection>
      </div>
      <DetailSection title={t.product.triggers} icon={Zap} testId="rule-triggers">
        {!hasTriggers && <p className="text-base text-fg-muted">{t.product.noTriggers}</p>}
        {rule.triggers.events.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-fg-secondary">{t.product.triggerEvents}</h3>
            <ChipList entries={events(rule.triggers.events)} />
          </div>
        )}
        {rule.triggers.phases.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-fg-secondary">{t.product.triggerPhases}</h3>
            <ChipList entries={phases(rule.triggers.phases)} />
          </div>
        )}
        {rule.triggerNote && <Hint tone="amber">{rule.triggerNote}</Hint>}
      </DetailSection>
      {rule.objections.length > 0 && (
        <DetailSection
          title={t.product.objections}
          icon={MessageCircleQuestion}
          testId="rule-objections"
        >
          <dl className="flex flex-col divide-y divide-line">
            {rule.objections.map(({ objection, answer }) => (
              <div key={objection} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <dt className="text-base font-medium text-fg">„{objection}“</dt>
                <dd className="text-base text-fg-secondary">→ {answer}</dd>
              </div>
            ))}
          </dl>
        </DetailSection>
      )}
      {rule.notes.length > 0 && (
        <DetailSection title={t.product.notes} icon={Lightbulb}>
          <BulletList items={rule.notes} />
        </DetailSection>
      )}
      <div className="grid gap-4 wide:grid-cols-2">
        <DetailSection title={t.product.topics} icon={Tags}>
          <ChipList entries={topics(info.topics)} />
        </DetailSection>
        <DetailSection title={t.product.typicalIn} icon={Sparkles}>
          <ChipList entries={phases(typicalIn)} empty={t.product.noTypicalPhase} />
        </DetailSection>
      </div>
      <Hint>{RULE_DISCLAIMER}</Hint>
      <MatchingCustomers
        title={t.product.customers}
        customers={useMatchingCustomers({ kind: 'product', key: line })}
      />
    </>
  );
}

function PhaseDetail({ phase }: { phase: LifePhase }) {
  const info = LIFE_PHASE_INFO[phase];
  const triggered = productsTriggeredByPhase(phase);
  return (
    <>
      <Hero
        icon={knowledgeIcon({ kind: 'phase', key: phase })}
        kind={t.kinds.phase}
        description={info.description}
        note={info.note}
      />
      <DetailSection title={t.phase.typicalProducts} icon={Sparkles} testId="phase-products">
        <ChipList entries={products(info.typicalProducts)} />
      </DetailSection>
      <div className="grid gap-4 wide:grid-cols-2">
        <DetailSection title={t.phase.typicalEvents} icon={CircleCheck}>
          <ChipList entries={events(info.typicalEvents)} empty={t.phase.noEvents} />
        </DetailSection>
        {triggered.length > 0 && (
          <DetailSection title={t.phase.triggers} icon={Zap}>
            <ChipList entries={products(triggered)} />
          </DetailSection>
        )}
        {info.relatedPhases.length > 0 && (
          <DetailSection title={t.phase.relatedPhases} icon={Tags}>
            <ChipList entries={phases(info.relatedPhases)} />
          </DetailSection>
        )}
      </div>
      <MatchingCustomers
        title={t.phase.customers}
        customers={useMatchingCustomers({ kind: 'phase', key: phase })}
      />
    </>
  );
}

function EventDetail({ event }: { event: LifeEventKind }) {
  const info = LIFE_EVENT_INFO[event];
  const triggered = productsTriggeredByEvent(event);
  return (
    <>
      <Hero
        icon={knowledgeIcon({ kind: 'event', key: event })}
        kind={t.kinds.event}
        meta={
          info.aliases.length > 0 ? `${t.event.aliases}: ${info.aliases.join(', ')}` : undefined
        }
        description={info.description}
      />
      <div className="grid gap-4 wide:grid-cols-2">
        <DetailSection title={t.event.reminder} icon={BellRing} testId="event-reminder">
          <p className="text-base text-fg">{info.reminderText}</p>
        </DetailSection>
        <DetailSection title={t.event.talkingPoints} icon={MessagesSquare} testId="event-talking">
          <BulletList items={info.talkingPoints} />
        </DetailSection>
      </div>
      <DetailSection title={t.event.triggers} icon={Zap} testId="event-triggers">
        <ChipList entries={products(triggered)} empty={t.event.noTriggers} />
      </DetailSection>
      {phasesWithEvent(event).length > 0 && (
        <DetailSection title={t.event.typicalIn} icon={Sparkles}>
          <ChipList entries={phases(phasesWithEvent(event))} />
        </DetailSection>
      )}
      <MatchingCustomers
        title={t.event.customers}
        customers={useMatchingCustomers({ kind: 'event', key: event })}
      />
    </>
  );
}

function TopicDetail({ topic }: { topic: Topic }) {
  const info = TOPIC_INFO[topic];
  return (
    <>
      <Hero
        icon={knowledgeIcon({ kind: 'topic', key: topic })}
        kind={t.kinds.topic}
        description={info.description}
      />
      <section className="flex flex-col gap-3" data-testid="topic-products">
        <h2 className="px-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">
          {t.topic.products}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {info.products.map((key) => (
            <EntryCard
              key={key}
              entry={{ kind: 'product', key }}
              subtitle={PRODUCT_LINE_INFO[key].longName}
              badge={<PriorityBadge level={PRODUCT_LINE_INFO[key].priority} />}
            />
          ))}
        </div>
      </section>
      <MatchingCustomers
        title={t.topic.customers}
        customers={useMatchingCustomers({ kind: 'topic', key: topic })}
      />
    </>
  );
}

function Detail({ entry }: { entry: KnowledgeRef }) {
  switch (entry.kind) {
    case 'product':
      return <ProductDetail line={entry.key} />;
    case 'phase':
      return <PhaseDetail phase={entry.key} />;
    case 'event':
      return <EventDetail event={entry.key} />;
    case 'topic':
      return <TopicDetail topic={entry.key} />;
  }
}

/** One knowledge entry with its links to related entries. */
export function KnowledgeDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const entry = parseKnowledgeRef(params.kind, params.key);

  if (!entry) {
    return (
      <Page title={t.notFound} leading={<BackButton />}>
        <EmptyState
          title={t.notFound}
          text={t.notFoundText}
          action={<Button onClick={() => void navigate('/knowledge')}>{t.toOverview}</Button>}
        />
      </Page>
    );
  }

  return (
    <Page title={knowledgeTitle(entry)} leading={<BackButton />}>
      <motion.div
        className="flex flex-col gap-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.soft}
        data-testid={`knowledge-detail-${entry.kind}-${entry.key}`}
      >
        <Detail entry={entry} />
      </motion.div>
    </Page>
  );
}
