import { useState } from 'react';
import { Button, SegmentedControl, Textarea, toast } from '@/components/ui';
import type { NeedView } from '@/core/needs/decisions';
import { NEED_TIMINGS, type NeedTiming, type Priority } from '@/data/domain';
import { needDecisionsRepo } from '@/data/repositories';
import { NEED_TIMING_LABELS, PRIORITY_LABELS, PRODUCT_LINE_INFO } from '@/data/reference';
import { LIMITS } from '@/data/schemas';
import { de } from '@/i18n/de';
import { EditPanel } from '../customers/components/EditPanel';

const t = de.needs;
const PRIORITIES: readonly Priority[] = [1, 2, 3];

/** Own assessment of a need: timing, priority and an own reason. */
export function NeedEditor({
  customerId,
  view,
  onClose,
}: {
  customerId: string;
  view: NeedView;
  onClose: () => void;
}) {
  const decided = view.state === 'dismissed' ? undefined : view.decision;
  const [timing, setTiming] = useState<NeedTiming>(
    decided?.timing ?? (view.assessment.timing === 'covered' ? 'now' : view.assessment.timing),
  );
  const [priority, setPriority] = useState<Priority>(view.priority);
  const [reason, setReason] = useState(view.decision?.reason ?? '');
  const [saving, setSaving] = useState(false);
  const name = PRODUCT_LINE_INFO[view.line].name;

  const save = async () => {
    setSaving(true);
    try {
      await needDecisionsRepo.adjust(customerId, view.assessment, { timing, priority, reason });
      toast.success(t.toastAdjusted(name));
      onClose();
    } catch {
      toast.error(t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditPanel
      open
      onClose={onClose}
      title={t.editTitle(name)}
      description={t.editText}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button onClick={() => void save()} loading={saving} data-testid="need-save">
            {t.save}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5" data-testid="need-editor">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-fg-secondary">{t.timing}</p>
          <SegmentedControl
            label={t.timing}
            value={timing}
            onChange={setTiming}
            options={NEED_TIMINGS.map((value) => ({ value, label: NEED_TIMING_LABELS[value] }))}
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-fg-secondary">{t.priorityField}</p>
          <SegmentedControl
            label={t.priorityField}
            value={String(priority) as `${Priority}`}
            onChange={(value) => setPriority(Number(value) as Priority)}
            options={PRIORITIES.map((value) => ({
              value: String(value) as `${Priority}`,
              label: `${t.priorityOption(value)} · ${PRIORITY_LABELS[value]}`,
            }))}
            className="w-full"
          />
        </div>
        <Textarea
          label={t.reason}
          hint={de.customers.hints.health}
          placeholder={t.reasonPlaceholder}
          value={reason}
          maxLength={LIMITS.text}
          onChange={(event) => setReason(event.target.value)}
          data-testid="need-reason"
        />
      </div>
    </EditPanel>
  );
}
