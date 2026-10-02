import { useRef } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ClipboardList, ListOrdered } from 'lucide-react';
import { create } from 'zustand';
import { Badge, cn, EmptyState, SearchInput } from '@/components/ui';
import { useHotkeys } from '@/app/hooks/useHotkeys';
import { Page } from '@/app/shell/Page';
import { searchDocuments, searchSnippet } from '@/core/search';
import { LIFE_EVENT_KINDS, LIFE_PHASES, PRODUCT_LINES, TOPICS } from '@/data/domain';
import {
  knowledgeDocuments,
  LIFE_EVENT_INFO,
  LIFE_PHASE_INFO,
  PRIORITIZATION,
  PRODUCT_LINE_INFO,
  productLinesByPriority,
  TOPIC_INFO,
  type KnowledgeDocument,
} from '@/data/reference';
import { de } from '@/i18n/de';
import { spring } from '@/styles/motion';
import { knowledgeIcon, knowledgePath } from './icons';
import { EntryCard, IconCircle, PriorityBadge, SectionHeading } from './parts';

const t = de.knowledge;

/** The query survives opening an entry and coming back (no personal data). */
const useKnowledgeSearch = create<{ query: string; setQuery: (query: string) => void }>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
}));

const DOCUMENTS = knowledgeDocuments();
const grid = 'grid gap-3 sm:grid-cols-2 wide:grid-cols-3';

function Section({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3" data-testid={`knowledge-section-${id}`}>
      <SectionHeading title={title} count={count} />
      {children}
    </section>
  );
}

function Overview() {
  const byPriority = ([1, 2, 3] as const).map((level) => ({
    level,
    name: PRIORITIZATION.levels.find((l) => l.level === level)?.name ?? '',
    lines: productLinesByPriority().filter((line) => PRODUCT_LINE_INFO[line].priority === level),
  }));
  return (
    <>
      <Section id="products" title={t.sections.products} count={PRODUCT_LINES.length}>
        {byPriority.map(({ level, name, lines }) => (
          <div key={level} className="flex flex-col gap-2">
            <h3 className="px-2 text-sm font-medium text-fg-secondary">
              {t.priorityGroup(level, name)}
            </h3>
            <div className={grid}>
              {lines.map((key) => (
                <EntryCard
                  key={key}
                  entry={{ kind: 'product', key }}
                  subtitle={PRODUCT_LINE_INFO[key].longName}
                  badge={<PriorityBadge level={level} />}
                />
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section id="phases" title={t.sections.phases} count={LIFE_PHASES.length}>
        <div className={grid}>
          {LIFE_PHASES.map((key) => (
            <EntryCard
              key={key}
              entry={{ kind: 'phase', key }}
              subtitle={LIFE_PHASE_INFO[key].description}
            />
          ))}
        </div>
      </Section>

      <Section id="events" title={t.sections.events} count={LIFE_EVENT_KINDS.length}>
        <div className={grid}>
          {LIFE_EVENT_KINDS.map((key) => (
            <EntryCard
              key={key}
              entry={{ kind: 'event', key }}
              subtitle={LIFE_EVENT_INFO[key].description}
            />
          ))}
        </div>
      </Section>

      <Section id="topics" title={t.sections.topics} count={TOPICS.length}>
        <div className="grid gap-3 sm:grid-cols-2">
          {TOPICS.map((key) => (
            <EntryCard
              key={key}
              entry={{ kind: 'topic', key }}
              subtitle={TOPIC_INFO[key].description}
              badge={<Badge>{t.productCount(TOPIC_INFO[key].products.length)}</Badge>}
            />
          ))}
        </div>
      </Section>

      <Section id="basics" title={t.sections.basics}>
        <div className="grid gap-3 sm:grid-cols-2">
          <EntryCard
            to="/knowledge/priorities"
            icon={ListOrdered}
            title={t.basics.priorities}
            subtitle={t.basics.prioritiesText}
            testId="knowledge-card-priorities"
          />
          <EntryCard
            to="/knowledge/questionnaire"
            icon={ClipboardList}
            title={t.basics.questionnaire}
            subtitle={t.basics.questionnaireText}
            testId="knowledge-card-questionnaire"
          />
        </div>
      </Section>
    </>
  );
}

function ResultRow({ document, query }: { document: KnowledgeDocument; query: string }) {
  const { ref } = document;
  const snippet = searchSnippet(document, query) ?? document.text?.[0];
  return (
    <Link
      to={knowledgePath(ref)}
      data-testid="knowledge-result"
      className={cn(
        'focus-ring no-callout flex items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-card transition-[transform,border-color] duration-150 hover:border-line-strong active:scale-[0.99]',
      )}
    >
      <IconCircle icon={knowledgeIcon(ref)} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-fg">{document.title}</span>
          <Badge>{t.kinds[ref.kind]}</Badge>
          {ref.kind === 'product' && <PriorityBadge level={PRODUCT_LINE_INFO[ref.key].priority} />}
        </span>
        {snippet && <span className="line-clamp-2 text-sm text-fg-secondary">{snippet}</span>}
      </span>
    </Link>
  );
}

function Results({ query }: { query: string }) {
  const results = searchDocuments(DOCUMENTS, query);
  return (
    <section className="flex flex-col gap-3" data-testid="knowledge-results">
      <p role="status" className="px-2 text-sm font-medium text-fg-muted">
        {t.results(results.length)}
      </p>
      {results.length === 0 ? (
        <EmptyState title={t.noResults} text={t.noResultsText} />
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((document) => (
            <ResultRow
              key={`${document.ref.kind}:${document.ref.key}`}
              document={document}
              query={query}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** "Wissen": product lines, life phases, events, topics and basics – searchable. */
export function KnowledgePage() {
  const query = useKnowledgeSearch((s) => s.query);
  const setQuery = useKnowledgeSearch((s) => s.setQuery);
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkeys([{ combo: '/', handler: () => searchRef.current?.focus() }]);
  const searching = query.trim().length > 0;

  return (
    <Page title={t.title}>
      <motion.div
        className="flex flex-col gap-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.soft}
        data-testid="knowledge-page"
      >
        <div className="flex flex-col gap-4">
          <p className="max-w-2xl text-base text-fg-secondary">{t.intro}</p>
          <SearchInput
            ref={searchRef}
            value={query}
            onChange={setQuery}
            label={t.search}
            clearLabel={t.clearSearch}
            placeholder={t.searchPlaceholder}
            data-testid="knowledge-search"
            className="max-w-xl"
          />
        </div>
        {searching ? <Results query={query} /> : <Overview />}
      </motion.div>
    </Page>
  );
}
