/** Editable customer fields and how question-catalogue paths and errors map onto them. */
import type { AnswerKey } from '@/data/domain';
import type { CustomerInput } from '@/data/schemas';

/** Values of a customer form (a partial customer as the repository accepts it). */
export type FormValues = Partial<CustomerInput>;

export type FieldKey =
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'email'
  | 'birth'
  | 'maritalStatus'
  | 'children'
  | 'housing'
  | 'lifePhase'
  | 'occupation'
  | 'trainingStart'
  | 'trainingEnd'
  | 'employerVl'
  | 'employerBav'
  | 'netIncome'
  | 'fixedCosts'
  | 'disposableIncome'
  | 'riskProfile'
  | 'healthCheckDone'
  | 'potential'
  | 'tags'
  | 'contactChannel'
  | 'dataStorage'
  | 'marketing'
  | 'parentalConsent'
  | 'contracts'
  | `answers.${AnswerKey}`;

const PATH_TO_FIELD: Record<string, FieldKey> = {
  birthDate: 'birth',
  birthYear: 'birth',
  'consents.contactChannel': 'contactChannel',
  'consents.dataStorage': 'dataStorage',
  'consents.marketing': 'marketing',
};

/** Field for a customer path (question catalogue, validation errors). */
export function fieldOfPath(path: string): FieldKey {
  const direct = PATH_TO_FIELD[path];
  if (direct) return direct;
  const [head = '', second = ''] = path.split('.');
  if (head === 'consents') return PATH_TO_FIELD[`consents.${second}`] ?? 'dataStorage';
  if (head === 'answers') return `answers.${second}` as FieldKey;
  if (head === 'contracts') return 'contracts';
  return (PATH_TO_FIELD[head] ?? head) as FieldKey;
}

export type FieldErrors = Partial<Record<FieldKey, string>>;
