import { useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  ChevronDown,
  MessageCircleQuestion,
  RotateCcw,
  SearchCheck,
  SlidersHorizontal,
  X,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import { Badge, Button, cn, toast, type BadgeTone } from '@/components/ui';
import type { NeedState, NeedView } from '@/core/needs/decisions';
import type { Priority } from '@/data/domain';
import { needDecisionsRepo } from '@/data/repositories';
import {
  NEED_RULES,
  NEED_TIMING_LABELS,
  PRIORITY_LABELS,
  PRODUCT_LINE_INFO,
  reasonText,
} from '@/data/reference';
import { knowledgeIcon } from '@/features/knowledge/icons';
import { de } from '@/i18n/de';
import { easeOut, spring } from '@/styles/motion';
import { NeedEditor } from './NeedEditor';

const t = de.needs;

const PRIORITY_TONES: Record<Priority, BadgeTone> = { 1: 'amber', 2: 'neutral', 3: 'neutral' };
const STATE_TONES: Record<NeedState, BadgeTone> = {
  suggested: 'neutral',
  accepted: 'success',
  adjusted: 'accent',
  dismissed: 'neutral',
};

/** Renders an icon chosen at render time. */
function Glyph({ icon: Icon, ...props }: LucideProps & { icon: LucideIcon }) {
  return <Icon {...props} />;
}

type Action = 'accept' | 'dismiss' | 'reset' | 'keep';

/** One product line: suggestion or decision, reasons, actions and typical objections. */
export function NeedCard({ customerId, view }: { customerId: string; view: NeedView }) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [editing, setEditing] = useState(false);
  const [objectionsOpen, setObjectionsOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const { line, assessment, decision, state } = view;
  const name = PRODUCT_LINE_INFO[line].name;
  const objections = NEED_RULES[line].objections;
  const ownReason = state !== 'suggested' ? decision?.reason : undefined;
  const timingDiffers =
    state === 'adjusted' && decision !== undefined && decision.timing !== assessment.timing;
  const suggestionLabel =
    assessment.timing === 'covered' ? undefined : NEED_TIMING_LABELS[assessment.timing];

  const run = async (action: Action) => {
    setBusy(action);
    try {
      if (action === 'accept') {
        await needDecisionsRepo.accept(customerId, assessment);
        setCelebrate((count) => count + 1);
        toast.success(t.toastAccepted(name));
      } else if (action === 'dismiss') {
        await needDecisionsRepo.dismiss(customerId, assessment);
        toast.success(t.toastDismissed(name));
      } else if (action === 'reset') {
        await needDecisionsRepo.reset(customerId, line);
        toast.success(t.toastReset(name));
      } else if (decision) {
        await needDecisionsRepo.keep(decision, assessment);
        toast.success(t.toastKept(name));
      }
    } catch {
      toast.error(t.saveFailed);
    } finally {
      setBusy(null);
    }
  };

  return (
    <li
      className={cn(
        'relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-surface-sunken p-4',
        view.recheck ? 'border-amber' : 'border-line',
      )}
      data-testid={`need-card-${line}`}
      data-state={state}
      data-group={view.group}
    >
      {celebrate > 0 && (
        <motion.div
          key={celebrate}
          aria-hidden
          className="need-glow pointer-events-none absolute inset-0 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.8, times: [0, 0.12, 0.5, 1], ease: easeOut }}
        />
      )}

      <div className="relative flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Glyph icon={knowledgeIcon({ kind: 'product', key: line })} size={20} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Link
            to={`/knowledge/product/${line}`}
            aria-label={t.knowledge(name)}
            className="focus-ring self-start rounded text-lg font-semibold tracking-tight text-fg"
          >
            {name}
          </Link>
          <div className="flex flex-wrap items-center gap-1.5">
            <motion.span
              key={state}
              initial={celebrate > 0 ? { scale: 0.6, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring.snappy}
              className="inline-flex"
            >
              <Badge
                tone={STATE_TONES[state]}
                className={cn(state === 'suggested' && 'border-dashed')}
              >
                {state === 'accepted' && <Check size={13} aria-hidden strokeWidth={2.6} />}
                <span data-testid="need-state">{t.states[state]}</span>
              </Badge>
            </motion.span>
            <Badge tone={PRIORITY_TONES[view.priority]}>
              {t.priority(view.priority, PRIORITY_LABELS[view.priority])}
            </Badge>
            {assessment.kind !== 'new' && <Badge tone="accent">{t.kinds[assessment.kind]}</Badge>}
            {assessment.check && (
              <Badge tone="amber">
                <SearchCheck size={13} aria-hidden />
                {t.check}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {ownReason && (
        <p className="relative rounded-lg bg-surface px-3 py-2 text-base text-fg">
          <span className="block text-sm text-fg-secondary">{t.ownReason}</span>
          {ownReason}
        </p>
      )}
      {timingDiffers && suggestionLabel && (
        <p className="relative text-sm text-fg-muted">{t.suggestion(suggestionLabel)}</p>
      )}
      <ul className="relative flex flex-col gap-1.5" data-testid="need-reasons">
        {assessment.reasons.map((reason, index) => (
          <li key={`${reason.code}-${index}`} className="flex gap-2 text-base text-fg-secondary">
            <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-fg-muted" />
            <span className="min-w-0">{reasonText(reason)}</span>
          </li>
        ))}
      </ul>

      {view.recheck && suggestionLabel && (
        <div
          className="relative flex flex-col gap-2 rounded-lg bg-amber-soft px-3 py-2.5"
          data-testid="need-recheck"
        >
          <p className="text-base font-semibold text-amber-fg">{t.recheck}</p>
          <p className="text-sm text-fg">{t.recheckText(suggestionLabel)}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={RotateCcw}
              loading={busy === 'reset'}
              onClick={() => void run('reset')}
              data-testid="need-reassess"
            >
              {t.reassess}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={busy === 'keep'}
              onClick={() => void run('keep')}
              data-testid="need-keep"
            >
              {t.keep}
            </Button>
          </div>
        </div>
      )}

      <div className="relative flex flex-wrap items-center gap-2">
        {state === 'suggested' && (
          <>
            <Button
              size="sm"
              variant="success"
              icon={Check}
              loading={busy === 'accept'}
              onClick={() => void run('accept')}
              data-testid="need-accept"
            >
              {t.accept}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={X}
              loading={busy === 'dismiss'}
              onClick={() => void run('dismiss')}
              data-testid="need-dismiss"
            >
              {t.dismiss}
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          icon={SlidersHorizontal}
          onClick={() => setEditing(true)}
          data-testid="need-adjust"
        >
          {t.adjust}
        </Button>
        {state !== 'suggested' && !view.recheck && (
          <Button
            size="sm"
            variant="ghost"
            icon={RotateCcw}
            loading={busy === 'reset'}
            onClick={() => void run('reset')}
            data-testid="need-reset"
          >
            {t.reset}
          </Button>
        )}
      </div>

      {objections.length > 0 && (
        <button
          type="button"
          aria-expanded={objectionsOpen}
          onClick={() => setObjectionsOpen(!objectionsOpen)}
          className="focus-ring no-callout relative -mx-1 -mb-1 flex min-h-11 items-center gap-2 rounded-b-lg border-t border-line px-1 pt-1 text-left text-sm font-medium text-fg-secondary"
          data-testid="need-objections"
        >
          <MessageCircleQuestion size={16} aria-hidden />
          <span className="flex-1">{t.objections}</span>
          <ChevronDown
            size={16}
            aria-hidden
            className={cn('transition-transform', objectionsOpen && 'rotate-180')}
          />
        </button>
      )}

      <AnimatePresence initial={false}>
        {objectionsOpen && (
          <motion.dl
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.default}
            className="relative flex flex-col gap-2 overflow-hidden"
            data-testid="need-objection-list"
          >
            {objections.map((item) => (
              <div key={item.objection} className="rounded-lg bg-surface px-3 py-2">
                <dt className="text-base font-medium text-fg">{t.quote(item.objection)}</dt>
                <dd className="text-base text-fg-secondary">{item.answer}</dd>
              </div>
            ))}
          </motion.dl>
        )}
      </AnimatePresence>

      {editing && (
        <NeedEditor customerId={customerId} view={view} onClose={() => setEditing(false)} />
      )}
    </li>
  );
}
