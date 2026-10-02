import { useState } from 'react';
import { Check, CircleHelp, Plus } from 'lucide-react';
import { IconButton, Input, toast } from '@/components/ui';
import { customersRepo } from '@/data/repositories';
import { LIMITS, type Customer } from '@/data/schemas';
import { de } from '@/i18n/de';
import { FileSection } from './parts';

const t = de.customers.file;

/** Facts still to ask for; tick off when clarified, add new ones inline. */
export function OpenPointsCard({ customer }: { customer: Customer }) {
  const [draft, setDraft] = useState('');

  const save = async (openPoints: string[]) => {
    try {
      await customersRepo.update(customer.id, { openPoints });
    } catch {
      toast.error(de.customers.errors.saveFailed);
    }
  };

  const add = async () => {
    const point = draft.trim();
    if (!point) return;
    await save([...customer.openPoints, point]);
    setDraft('');
  };

  return (
    <FileSection title={t.sections.openPoints} icon={CircleHelp} testId="file-open-points">
      {customer.openPoints.length === 0 ? (
        <p className="text-base text-fg-muted">{t.noOpenPoints}</p>
      ) : (
        <ul className="flex flex-col gap-1" data-testid="open-points">
          {customer.openPoints.map((point) => (
            <li key={point} className="flex items-start gap-2">
              <IconButton
                icon={Check}
                label={t.resolveOpenPoint(point)}
                variant="secondary"
                onClick={() => void save(customer.openPoints.filter((p) => p !== point))}
              />
              <span className="min-w-0 flex-1 pt-2.5 text-base text-fg">{point}</span>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <Input
          aria-label={t.addOpenPoint}
          placeholder={t.openPointPlaceholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={LIMITS.openPoint}
          enterKeyHint="done"
          className="min-w-0"
          data-testid="open-point-input"
        />
        <IconButton
          type="submit"
          icon={Plus}
          label={t.addOpenPoint}
          variant="primary"
          disabled={!draft.trim()}
        />
      </form>
    </FileSection>
  );
}
