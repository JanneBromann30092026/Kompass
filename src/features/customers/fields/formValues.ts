/** Initial form values for a set of fields, validation and error messages. */
import { needsParentalConsent } from '@/core/customers/age';
import { consentIssues } from '@/core/customers/consent';
import { ValidationError } from '@/data/errors';
import type { Customer } from '@/data/schemas';
import { de } from '@/i18n/de';
import { fieldOfPath, type FieldErrors, type FieldKey, type FormValues } from './fieldKeys';

/** The parts of a customer that the given fields edit (consents and answers as a whole). */
export function initialValues(customer: Customer, fields: readonly FieldKey[]): FormValues {
  const values: FormValues = {};
  const target = values as Record<string, unknown>;
  for (const field of fields) {
    if (field === 'birth') {
      values.birthDate = customer.birthDate;
      values.birthYear = customer.birthYear;
    } else if (field === 'contactChannel' || field === 'dataStorage' || field === 'marketing') {
      values.consents = structuredClone(customer.consents);
    } else if (field.startsWith('answers.')) {
      values.answers = { ...customer.answers };
    } else if (field === 'contracts') {
      values.contracts = { ...customer.contracts };
    } else if (field === 'tags') {
      values.tags = [...customer.tags];
    } else {
      target[field] = (customer as Record<string, unknown>)[field];
    }
  }
  return values;
}

/** Shows the parents' consent for (possible) minors, or when it is already recorded. */
export function showsParentalConsent(values: FormValues, today: string): boolean {
  return needsParentalConsent(values, today) || values.parentalConsent !== undefined;
}

/** Checks that the schema cannot express: marketing to minors needs the parents. */
export function formErrors(values: FormValues, today: string): FieldErrors {
  const issues = consentIssues({ ...values, consents: values.consents ?? {} }, today);
  return issues.includes('parentalConsentMissing')
    ? { parentalConsent: de.customers.errors.parentalConsentMissing }
    : {};
}

/** Error of a failed save as a field message. */
export function errorsOf(error: unknown): FieldErrors | null {
  if (!(error instanceof ValidationError)) return null;
  return { [fieldOfPath(error.field)]: de.customers.errors[error.code] };
}
