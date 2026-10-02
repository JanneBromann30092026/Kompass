/** Hint badges of a customer (list rows, file header). */
import type { BadgeTone } from '@/components/ui';
import { ageInfo, daysUntilBirthday } from '@/core/customers/age';
import { hasMarketingConsent } from '@/core/customers/consent';
import type { Customer } from '@/data/schemas';
import { de } from '@/i18n/de';

const b = de.customers.badges;

/** Days ahead in which a birthday is highlighted. */
const BIRTHDAY_DAYS = 7;

export function customerBadges(
  customer: Customer,
  today: string,
): { key: string; tone: BadgeTone; label: string }[] {
  const badges: { key: string; tone: BadgeTone; label: string }[] = [];
  const { minor } = ageInfo(customer, today);
  if (minor === 'yes') badges.push({ key: 'minor', tone: 'warning', label: b.minor });
  if (minor === 'maybe') badges.push({ key: 'minor', tone: 'warning', label: b.maybeMinor });
  if (customer.birthDate) {
    const days = daysUntilBirthday(customer.birthDate, today);
    if (days <= BIRTHDAY_DAYS) {
      badges.push({ key: 'birthday', tone: 'accent', label: b.birthdaySoon(days) });
    }
  }
  if (customer.openPoints.length > 0) {
    badges.push({
      key: 'openPoints',
      tone: 'amber',
      label: b.openPoints(customer.openPoints.length),
    });
  }
  if (!hasMarketingConsent(customer, today)) {
    badges.push({ key: 'noMarketing', tone: 'neutral', label: b.noMarketing });
  }
  if (customer.demo) badges.push({ key: 'demo', tone: 'neutral', label: b.demo });
  if (customer.archived) badges.push({ key: 'archived', tone: 'neutral', label: b.archived });
  return badges;
}
