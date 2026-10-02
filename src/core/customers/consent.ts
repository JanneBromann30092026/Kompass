/** Consent rules: marketing (invitations, birthday greetings) for minors needs the parents. */
import { needsParentalConsent, type BirthFacts } from './age';

interface Consent {
  granted: boolean;
  date: string;
}

export interface ConsentFacts extends BirthFacts {
  consents: { marketing?: Consent };
  parentalConsent?: Consent;
}

export type ConsentIssue = 'parentalConsentMissing';

/** Problems with the given consents (empty = fine). */
export function consentIssues(customer: ConsentFacts, today: string): ConsentIssue[] {
  const marketing = customer.consents.marketing?.granted === true;
  if (marketing && needsParentalConsent(customer, today) && !customer.parentalConsent?.granted) {
    return ['parentalConsentMissing'];
  }
  return [];
}

/** May the customer be invited or congratulated? Without consent nobody is (only counted). */
export function hasMarketingConsent(customer: ConsentFacts, today: string): boolean {
  return (
    customer.consents.marketing?.granted === true && consentIssues(customer, today).length === 0
  );
}
