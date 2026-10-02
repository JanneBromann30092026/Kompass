/**
 * Question catalogue logic: which questions a customer record answers, and the open points
 * for the unanswered ones ("nur Fakten speichern, Unbekanntes als offener Punkt").
 */
import type { LifePhase } from '@/data/domain';
import type { Question, Questionnaire, QuestionnaireSection } from '@/data/reference/schemas';

/** Value at a dotted path ("consents.marketing", "answers.sport"). */
export function valueAt(record: object, path: string): unknown {
  let node: unknown = record;
  for (const part of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function hasAnswer(path: string, value: unknown): boolean {
  // Contracts start as "open" for every line: answered once one is known.
  if (path === 'contracts') {
    return (
      typeof value === 'object' &&
      value !== null &&
      Object.values(value).some((status) => status !== 'open')
    );
  }
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  // Numbers (also 0 children) and booleans (also "no") are answers.
  return true;
}

/** Questions limited to some life phases are always asked while the phase is unknown. */
export function questionApplies(question: Question, lifePhase: LifePhase | undefined): boolean {
  return !question.onlyFor || !lifePhase || question.onlyFor.includes(lifePhase);
}

export function isQuestionAnswered(question: Question, record: object): boolean {
  return question.fields.some((path) => hasAnswer(path, valueAt(record, path)));
}

export function openPointText(section: QuestionnaireSection, question: Question): string {
  return `${section.title}: ${question.text}`;
}

interface Answerable {
  lifePhase?: LifePhase;
}

/** Open points for every applicable question the record does not answer. */
export function unansweredOpenPoints(record: Answerable, questionnaire: Questionnaire): string[] {
  return questionnaire.sections.flatMap((section) =>
    section.questions
      .filter((q) => questionApplies(q, record.lifePhase) && !isQuestionAnswered(q, record))
      .map((q) => openPointText(section, q)),
  );
}

/**
 * Open points after a change: points generated from the catalogue disappear once their
 * question is answered (or no longer applies); everything else stays as written.
 */
export function resolveOpenPoints(
  record: Answerable & { openPoints: readonly string[] },
  questionnaire: Questionnaire,
): string[] {
  const settled = new Set(
    questionnaire.sections.flatMap((section) =>
      section.questions
        .filter((q) => !questionApplies(q, record.lifePhase) || isQuestionAnswered(q, record))
        .map((q) => openPointText(section, q)),
    ),
  );
  return record.openPoints.filter((point) => !settled.has(point));
}

/** Open points for a new customer: own points first, then the unanswered questions. */
export function mergeOpenPoints(own: readonly string[], generated: readonly string[]): string[] {
  return [...new Set([...own, ...generated])];
}
