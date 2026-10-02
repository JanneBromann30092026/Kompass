import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Spinner } from '@/components/ui';
import { ComingSoonPage } from '@/features/coming-soon/ComingSoonPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { de } from '@/i18n/de';
import { easeOut } from '@/styles/motion';
import { useReducedMotion } from '@/styles/useReducedMotion';
import { ShortcutsOverlay } from '../shortcuts/ShortcutsOverlay';
import { useAppStatus } from '../useAppStatus';
import { useHotkeys } from '../hooks/useHotkeys';
import { useMediaQuery, WIDE_LAYOUT_QUERY } from '../hooks/useMediaQuery';
import { useFocusMode } from './focusMode';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';

// Developer tools are rarely used: own chunk, loaded on demand.
const DevUiPage = lazy(() => import('@/features/dev/DevUiPage'));

// Knowledge view: one chunk for all its pages.
const knowledge = () => import('@/features/knowledge');
const KnowledgePage = lazy(() => knowledge().then((m) => ({ default: m.KnowledgePage })));
const KnowledgeDetailPage = lazy(() =>
  knowledge().then((m) => ({ default: m.KnowledgeDetailPage })),
);
const PrioritiesPage = lazy(() => knowledge().then((m) => ({ default: m.PrioritiesPage })));
const QuestionnairePage = lazy(() => knowledge().then((m) => ({ default: m.QuestionnairePage })));

const DashboardPage = lazy(() =>
  import('@/features/dashboard').then((m) => ({ default: m.DashboardPage })),
);
// Customers: list, file and the question catalogue share a chunk.
const RemindersPage = lazy(() =>
  import('@/features/reminders').then((m) => ({ default: m.RemindersPage })),
);
const conversations = () => import('@/features/conversations');
const PreparationPage = lazy(() => conversations().then((m) => ({ default: m.PreparationPage })));
const ConversationPage = lazy(() => conversations().then((m) => ({ default: m.ConversationPage })));
const customers = () => import('@/features/customers');
const CustomersPage = lazy(() => customers().then((m) => ({ default: m.CustomersPage })));
const CustomerFilePage = lazy(() => customers().then((m) => ({ default: m.CustomerFilePage })));
const NewCustomerPage = lazy(() => customers().then((m) => ({ default: m.NewCustomerPage })));

function DatabaseErrorBanner() {
  const database = useAppStatus((s) => s.database);
  if (!database || database.ok) return null;
  return (
    <p
      role="alert"
      data-testid="database-error"
      className="mx-4 mt-[max(1rem,env(safe-area-inset-top))] rounded-lg bg-danger-soft px-4 py-3 text-base text-danger"
    >
      {de.database.errors[database.reason]}
    </p>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const reduced = useReducedMotion();
  const offset = reduced ? 0 : 10;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className="h-full"
        initial={{ opacity: 0, y: offset }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: easeOut } }}
        exit={{ opacity: 0, y: -offset / 2, transition: { duration: 0.12, ease: 'easeIn' } }}
      >
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-fg-muted">
              <Spinner size={28} label={de.ui.loading} />
            </div>
          }
        >
          <Routes location={location}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/new" element={<NewCustomerPage />} />
            <Route path="/customers/:id" element={<CustomerFilePage />} />
            <Route path="/customers/:id/prepare" element={<PreparationPage />} />
            <Route path="/customers/:id/conversations/new" element={<ConversationPage />} />
            <Route
              path="/customers/:id/conversations/:conversationId"
              element={<ConversationPage />}
            />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/campaigns" element={<ComingSoonPage page="campaigns" />} />
            <Route path="/network" element={<ComingSoonPage page="network" />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/knowledge/priorities" element={<PrioritiesPage />} />
            <Route path="/knowledge/questionnaire" element={<QuestionnairePage />} />
            <Route path="/knowledge/:kind/:key" element={<KnowledgeDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/dev/ui" element={<DevUiPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

/** App-wide keyboard shortcuts (hardware keyboard); not while a dialog is open. */
function useGlobalShortcuts() {
  const navigate = useNavigate();
  useHotkeys([
    {
      combo: 'n',
      handler: () => {
        if (document.querySelector('[aria-modal="true"]')) return;
        void navigate('/customers/new');
      },
    },
  ]);
}

export function Shell() {
  useGlobalShortcuts();
  const wide = useMediaQuery(WIDE_LAYOUT_QUERY);
  const focus = useFocusMode();
  const reduced = useReducedMotion();

  return (
    <div
      className="relative flex h-dvh overflow-hidden"
      data-layout={wide ? 'wide' : 'narrow'}
      data-focus={focus || undefined}
    >
      <AnimatePresence initial={false}>
        {wide && !focus && (
          <motion.div
            key="sidebar"
            className="flex shrink-0"
            initial={{ opacity: 0, x: reduced ? 0 : -24 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.25, ease: easeOut } }}
            exit={{ opacity: 0, x: reduced ? 0 : -24, transition: { duration: 0.15 } }}
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <DatabaseErrorBanner />
        <main className="relative min-h-0 flex-1">
          <AnimatedRoutes />
        </main>
        <AnimatePresence initial={false}>
          {!wide && !focus && (
            <motion.div
              key="tabbar"
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: easeOut } }}
              exit={{ opacity: 0, y: reduced ? 0 : 24, transition: { duration: 0.15 } }}
            >
              <TabBar />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ShortcutsOverlay />
    </div>
  );
}
