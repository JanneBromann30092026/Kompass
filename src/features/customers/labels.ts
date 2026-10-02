/** German names of customer fields and values for display (lists, history, summaries). */
import type { AnswerKey } from '@/data/domain';
import { QUESTIONNAIRE } from '@/data/reference';

const ANSWER_LABELS = new Map<string, string>(
  QUESTIONNAIRE.sections.flatMap((section) =>
    section.questions.flatMap((question) =>
      question.fields
        .filter((path) => path.startsWith('answers.'))
        .map((path) => [path.slice('answers.'.length), question.text] as const),
    ),
  ),
);

/** The question a free-text answer belongs to, e.g. "Sport". */
export function answerLabel(key: string): string {
  return ANSWER_LABELS.get(key) ?? key;
}

/** Section title of the question catalogue for an answer key. */
export function answerSection(key: AnswerKey): string {
  return (
    QUESTIONNAIRE.sections.find((section) =>
      section.questions.some((q) => q.fields.includes(`answers.${key}`)),
    )?.title ?? ''
  );
}

export function customerName(customer: { firstName: string; lastName?: string }): string {
  return [customer.firstName, customer.lastName].filter(Boolean).join(' ');
}
