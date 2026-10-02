import { useState } from 'react';
import { Button, ChoiceChip, Input, Textarea, Toggle } from '@/components/ui';
import { addDays, addMonths } from '@/core/dates';
import { formatCalendarDate } from '@/core/format';
import type { Completion } from '@/data/repositories';
import type { Reminder } from '@/data/schemas';
import { LIMITS } from '@/data/schemas';
import { de } from '@/i18n/de';
import { EditPanel } from '../customers/components/EditPanel';

const t = de.reminders;
type Preset = keyof typeof t.followUpPresets;

const presetDate = (preset: Preset, today: string) =>
  preset === 'week' ? addDays(today, 7) : addMonths(today, preset === 'month' ? 1 : 3);

/** Completing with an optional note and a suggested follow-up. */
export function CompleteDialog({
  reminder,
  today,
  onClose,
  onConfirm,
}: {
  reminder: Reminder;
  today: string;
  onClose: () => void;
  onConfirm: (completion: Completion) => void;
}) {
  const annual = reminder.kind === 'annualReview';
  const [note, setNote] = useState('');
  const [followUp, setFollowUp] = useState(false);
  const [title, setTitle] = useState(t.followUpDefault(reminder.title));
  const [dueDate, setDueDate] = useState(presetDate('month', today));
  const valid = !followUp || (title.trim() !== '' && dueDate !== '');

  const confirm = () => {
    if (!valid) return;
    onConfirm({
      note: note.trim() || undefined,
      followUp: followUp ? { title: title.trim(), dueDate } : undefined,
    });
  };

  return (
    <EditPanel
      open
      onClose={onClose}
      title={t.completeTitle}
      description={reminder.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button
            variant="success"
            onClick={confirm}
            disabled={!valid}
            data-testid="complete-confirm"
          >
            {t.complete}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5" data-testid="complete-dialog">
        <Textarea
          label={t.note}
          hint={de.customers.hints.health}
          placeholder={t.notePlaceholder}
          value={note}
          maxLength={LIMITS.text}
          onChange={(event) => setNote(event.target.value)}
          data-testid="complete-note"
        />
        {annual ? (
          <p
            className="rounded-lg bg-accent-soft px-4 py-3 text-base text-fg"
            data-testid="annual-follow-up"
          >
            {t.annualFollowUp(formatCalendarDate(addMonths(today, 12)))}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <Toggle checked={followUp} onChange={setFollowUp} label={t.followUp} />
            {followUp && (
              <>
                <Input
                  label={t.followUpTitle}
                  value={title}
                  maxLength={LIMITS.title}
                  onChange={(event) => setTitle(event.target.value)}
                  error={title.trim() === '' ? t.required : undefined}
                  data-testid="follow-up-title"
                />
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(t.followUpPresets) as Preset[]).map((preset) => (
                    <ChoiceChip
                      key={preset}
                      selected={dueDate === presetDate(preset, today)}
                      onToggle={() => setDueDate(presetDate(preset, today))}
                    >
                      {t.followUpPresets[preset]}
                    </ChoiceChip>
                  ))}
                </div>
                <Input
                  type="date"
                  label={t.followUpDate}
                  value={dueDate}
                  min={today}
                  onChange={(event) => setDueDate(event.target.value)}
                  data-testid="follow-up-date"
                />
              </>
            )}
          </div>
        )}
      </div>
    </EditPanel>
  );
}
