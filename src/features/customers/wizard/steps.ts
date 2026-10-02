/** Steps of the new-customer flow: the nine sections of the question catalogue, then a summary. */
import type { LifePhase } from '@/data/domain';
import { QUESTIONNAIRE } from '@/data/reference';
import type { Question, QuestionnaireSection } from '@/data/reference/schemas';
import { questionApplies } from '@/core/customers/questionnaire';
import { fieldOfPath, type FieldKey } from '../fields/fieldKeys';

export interface QuestionCard {
  /** Questions answered by the same fields share a card. */
  questions: Question[];
  fields: FieldKey[];
}

export interface WizardStep {
  section: QuestionnaireSection;
  /** Fields that are not questions (name, contact data): never open points. */
  before: FieldKey[];
  after: FieldKey[];
}

export const STEPS: WizardStep[] = QUESTIONNAIRE.sections.map((section) => ({
  section,
  before: section.key === 'person' ? ['firstName', 'lastName'] : [],
  after:
    section.key === 'person'
      ? ['phone', 'email']
      : section.key === 'contracts'
        ? ['healthCheckDone']
        : [],
}));

/** Index of the summary step (after all sections). */
export const SUMMARY_STEP = STEPS.length;

const fieldsOf = (question: Question): FieldKey[] => [...new Set(question.fields.map(fieldOfPath))];

/** Applicable questions of a section, grouped into cards. */
export function questionCards(
  section: QuestionnaireSection,
  lifePhase?: LifePhase,
): QuestionCard[] {
  const cards: QuestionCard[] = [];
  for (const question of section.questions) {
    if (!questionApplies(question, lifePhase)) continue;
    const fields = fieldsOf(question);
    const same = cards.find((card) => card.fields.join() === fields.join());
    if (same) same.questions.push(question);
    else cards.push({ questions: [question], fields });
  }
  return cards;
}

/** Step that edits a field (to show a validation error where it can be fixed). */
export function stepOfField(field: FieldKey): number {
  const index = STEPS.findIndex(
    (step) =>
      step.before.includes(field) ||
      step.after.includes(field) ||
      step.section.questions.some((q) => fieldsOf(q).includes(field)) ||
      (field === 'parentalConsent' && step.section.key === 'communication'),
  );
  return index === -1 ? 0 : index;
}
