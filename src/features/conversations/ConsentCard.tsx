import { ShieldCheck } from 'lucide-react';
import { Button, toast } from '@/components/ui';
import { needsParentalConsent } from '@/core/customers/age';
import { formatCalendarDate } from '@/core/format';
import { customersRepo } from '@/data/repositories';
import type { Customer } from '@/data/schemas';
import { de } from '@/i18n/de';
import { FileSection } from '../customers/file/parts';

const t = de.conversations.quick;

interface Consent {
  granted: boolean;
  date: string;
}

function ConsentRow({
  label,
  consent,
  onChange,
  testId,
}: {
  label: string;
  consent?: Consent;
  onChange: (granted: boolean) => void;
  testId: string;
}) {
  const granted = consent?.granted === true;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid={testId}>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-medium text-fg">{label}</span>
        <span className={granted ? 'text-sm text-success' : 'text-sm text-fg-secondary'}>
          {consent
            ? consent.granted
              ? t.granted(formatCalendarDate(consent.date))
              : t.refused(formatCalendarDate(consent.date))
            : t.none}
        </span>
      </span>
      <Button
        size="sm"
        variant={granted ? 'ghost' : 'secondary'}
        onClick={() => onChange(!granted)}
        data-testid={`${testId}-toggle`}
      >
        {granted ? t.revoke : t.grant}
      </Button>
    </div>
  );
}

/** Marketing consent (and the parents' consent for minors) granted or withdrawn in one tap. */
export function ConsentCard({ customer, today }: { customer: Customer; today: string }) {
  const save = async (
    patch: Parameters<typeof customersRepo.update>[1],
    label: string,
    granted: boolean,
  ) => {
    try {
      await customersRepo.update(customer.id, patch);
      toast.success(granted ? t.toastGranted(label) : t.toastRevoked(label));
    } catch {
      toast.error(de.conversations.saveFailed);
    }
  };
  return (
    <FileSection title={t.consents} icon={ShieldCheck} testId="quick-consents">
      <ConsentRow
        label={t.marketing}
        consent={customer.consents.marketing}
        testId="consent-marketing"
        onChange={(granted) =>
          void save(
            { consents: { ...customer.consents, marketing: { granted, date: today } } },
            t.marketing,
            granted,
          )
        }
      />
      {(needsParentalConsent(customer, today) || customer.parentalConsent) && (
        <ConsentRow
          label={t.parental}
          consent={customer.parentalConsent}
          testId="consent-parental"
          onChange={(granted) =>
            void save({ parentalConsent: { granted, date: today } }, t.parental, granted)
          }
        />
      )}
    </FileSection>
  );
}
