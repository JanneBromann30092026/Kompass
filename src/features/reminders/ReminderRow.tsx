import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, useMotionValue, useTransform } from 'motion/react';
import {
  CalendarArrowUp,
  CalendarDays,
  CalendarPlus,
  Check,
  CircleCheck,
  FolderOpen,
  Pencil,
  RotateCcw,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import {
  ActionMenuButton,
  Badge,
  ConfirmDialog,
  cn,
  toast,
  type ActionMenuItem,
} from '@/components/ui';
import { localIsoDate } from '@/core/dates';
import { formatCalendarDate } from '@/core/format';
import { postponedDate, reminderBucket, type PostponeStep } from '@/core/reminders/schedule';
import { reminderActionsRepo, type Completion } from '@/data/repositories';
import { LIFE_EVENT_INFO, REMINDER_KIND_LABELS } from '@/data/reference';
import type { Customer, Reminder } from '@/data/schemas';
import { de } from '@/i18n/de';
import { easeOut, spring } from '@/styles/motion';
import { useReducedMotion } from '@/styles/useReducedMotion';
import { customerName } from '../customers/labels';
import { CalendarDialog } from './CalendarDialog';
import { CompleteDialog } from './CompleteDialog';
import { DateDialog } from './DateDialog';
import { ReminderEditor } from './ReminderEditor';
import { dueLabel } from './useReminders';

const t = de.reminders;
/** Pointer distance that completes a reminder when swiping right. */
const SWIPE_DISTANCE = 120;
/** The success light plays before the reminder leaves the list. */
const CELEBRATE_MS = 450;

type Dialog = 'complete' | 'date' | 'edit' | 'calendar' | 'delete';

function kindLabel(reminder: Reminder): string {
  return reminder.kind === 'lifeEvent' && reminder.event
    ? LIFE_EVENT_INFO[reminder.event].name
    : REMINDER_KIND_LABELS[reminder.kind];
}

const DUE_TONES = {
  overdue: 'text-warning',
  today: 'text-amber-fg',
  next30: 'text-fg',
  next90: 'text-fg',
  later: 'text-fg',
} as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One reminder: due date, occasion, customer; complete by button or swiping right. */
export function ReminderRow({
  reminder,
  customer,
  today,
  showCustomer = true,
}: {
  reminder: Reminder;
  customer?: Customer;
  today: string;
  showCustomer?: boolean;
}) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const x = useMotionValue(0);
  const reveal = useTransform(x, [0, SWIPE_DISTANCE / 2], [0, 1]);
  const bucket = reminderBucket(reminder.dueDate, today);
  const kind = kindLabel(reminder);
  const fileUrl = `/customers/${reminder.customerId}`;

  const complete = async (completion: Completion = {}) => {
    setDialog(null);
    setCelebrating(true);
    if (!reduced) await wait(CELEBRATE_MS);
    try {
      await reminderActionsRepo.complete(reminder.id, completion);
      toast.success(t.toastDone(reminder.title), {
        label: t.undo,
        onSelect: () => {
          reminderActionsRepo.reopen(reminder.id).then(
            () => toast.info(t.toastReopened(reminder.title)),
            () => toast.error(t.saveFailed),
          );
        },
      });
    } catch {
      setCelebrating(false);
      toast.error(t.saveFailed);
    }
  };

  const postpone = async (date: string) => {
    setDialog(null);
    try {
      await reminderActionsRepo.postpone(reminder.id, date);
      toast.success(t.toastPostponed(formatCalendarDate(date)));
    } catch {
      toast.error(t.saveFailed);
    }
  };

  const reopen = async () => {
    try {
      await reminderActionsRepo.reopen(reminder.id);
      toast.success(t.toastReopened(reminder.title));
    } catch {
      toast.error(t.saveFailed);
    }
  };

  const step = (by: PostponeStep, label: string, icon: LucideIcon): ActionMenuItem => ({
    id: `postpone-${by}`,
    label,
    icon,
    onSelect: () => void postpone(postponedDate(reminder.dueDate, by, today)),
  });

  const items: ActionMenuItem[] = reminder.done
    ? [{ id: 'reopen', label: t.reopen, icon: RotateCcw, onSelect: () => void reopen() }]
    : [
        step('week', t.postponeWeek, CalendarArrowUp),
        step('month', t.postponeMonth, CalendarArrowUp),
        {
          id: 'postpone-date',
          label: t.postponeDate,
          icon: CalendarDays,
          onSelect: () => setDialog('date'),
        },
        { id: 'edit', label: t.edit, icon: Pencil, onSelect: () => setDialog('edit') },
        {
          id: 'calendar',
          label: t.calendar.export,
          icon: CalendarPlus,
          onSelect: () => setDialog('calendar'),
        },
      ];
  if (showCustomer) {
    items.push({
      id: 'file',
      label: t.openFile,
      icon: FolderOpen,
      onSelect: () => void navigate(fileUrl),
    });
  }
  if (!reminder.ruleKey) {
    items.push({
      id: 'delete',
      label: t.delete,
      icon: Trash2,
      danger: true,
      onSelect: () => setDialog('delete'),
    });
  }

  const content = (
    <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {reminder.done ? (
          <span className="text-sm font-medium text-success">
            {t.doneOn(
              formatCalendarDate(localIsoDate(new Date(reminder.doneAt ?? reminder.updatedAt))),
            )}
          </span>
        ) : (
          <span
            className={cn('text-sm font-semibold', DUE_TONES[bucket])}
            data-testid="reminder-due"
          >
            {dueLabel(reminder.dueDate, today)}
          </span>
        )}
        <span className="text-sm text-fg-muted tabular-nums">
          {formatCalendarDate(reminder.dueDate)}
        </span>
        {kind !== reminder.title && <Badge>{kind}</Badge>}
        {reminder.dateToCheck && <Badge tone="amber">{t.dateToCheck}</Badge>}
      </div>
      <p
        className={cn(
          'text-base font-semibold text-fg',
          reminder.done && 'text-fg-secondary line-through decoration-fg-muted',
        )}
        data-testid="reminder-title"
      >
        {reminder.title}
      </p>
      {showCustomer && customer && (
        <Link
          to={fileUrl}
          className="focus-ring self-start rounded text-sm font-medium text-accent"
          data-testid="reminder-customer"
        >
          {customer.number} · {customerName(customer)}
        </Link>
      )}
      {reminder.todo && !reminder.done && (
        <p className="line-clamp-2 text-sm text-fg-secondary">{reminder.todo}</p>
      )}
      {reminder.done && reminder.doneNote && (
        <p className="text-sm text-fg-secondary" data-testid="reminder-done-note">
          {reminder.doneNote}
        </p>
      )}
    </div>
  );

  return (
    <motion.li
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: easeOut }}
      className="relative"
      data-testid="reminder-row"
      data-reminder-id={reminder.id}
      data-kind={reminder.kind}
      data-done={reminder.done}
    >
      <div className="relative overflow-hidden rounded-xl">
        {!reminder.done && (
          <motion.div
            aria-hidden
            style={{ opacity: reveal }}
            className="absolute inset-0 flex items-center gap-2 bg-success-soft pl-5 text-base font-semibold text-success"
          >
            <CircleCheck size={22} />
            {t.complete}
          </motion.div>
        )}
        <motion.div
          drag={reminder.done || celebrating ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0, right: 0.6 }}
          dragDirectionLock
          onDragEnd={(_event, info) => {
            if (info.offset.x > SWIPE_DISTANCE) void complete();
          }}
          style={{ x, touchAction: 'pan-y' }}
          className={cn(
            'relative flex items-start gap-3 rounded-xl border border-line bg-surface-sunken py-2 pr-2 pl-2',
            reminder.done && 'opacity-80',
          )}
        >
          {celebrating && (
            <motion.div
              aria-hidden
              className="success-glow pointer-events-none absolute inset-0 rounded-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.8] }}
              transition={{ duration: CELEBRATE_MS / 1000, times: [0, 0.4, 1] }}
            />
          )}
          {reminder.done ? (
            <span className="flex size-11 shrink-0 items-center justify-center text-success">
              <CircleCheck size={24} aria-hidden />
            </span>
          ) : (
            <button
              type="button"
              aria-label={t.completeLabel(reminder.title)}
              onClick={() => setDialog('complete')}
              className="focus-ring no-callout relative flex size-11 shrink-0 items-center justify-center rounded-full"
              data-testid="reminder-complete"
            >
              <motion.span
                animate={celebrating ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                transition={spring.snappy}
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border-2 transition-colors',
                  celebrating
                    ? 'border-success bg-success text-on-success'
                    : 'border-fg-muted text-transparent',
                )}
              >
                <Check size={16} strokeWidth={3} aria-hidden />
              </motion.span>
            </button>
          )}
          {content}
          <ActionMenuButton
            items={items}
            label={t.actions(reminder.title)}
            testId="reminder-menu"
          />
        </motion.div>
      </div>

      {dialog === 'complete' && (
        <CompleteDialog
          reminder={reminder}
          today={today}
          onClose={() => setDialog(null)}
          onConfirm={(completion) => void complete(completion)}
        />
      )}
      {dialog === 'date' && (
        <DateDialog
          initial={postponedDate(reminder.dueDate, 'week', today)}
          onClose={() => setDialog(null)}
          onConfirm={(date) => void postpone(date)}
        />
      )}
      {dialog === 'edit' && (
        <ReminderEditor reminder={reminder} today={today} onClose={() => setDialog(null)} />
      )}
      {dialog === 'calendar' && (
        <CalendarDialog reminders={[reminder]} onClose={() => setDialog(null)} />
      )}
      <ConfirmDialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          await reminderActionsRepo.remove(reminder.id);
          toast.success(t.toastDeleted);
        }}
        title={t.deleteTitle}
        message={t.deleteText}
        confirmLabel={t.delete}
        variant="danger"
      />
    </motion.li>
  );
}
