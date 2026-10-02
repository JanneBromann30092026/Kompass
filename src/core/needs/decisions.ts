/**
 * Suggestions vs. decisions: the engine suggests, the user accepts, dismisses or changes a
 * need. Decisions stay until the facts change the suggestion (then "neu prüfen").
 */
import { PRODUCT_LINES, type NeedTiming, type Priority, type ProductLine } from '@/data/domain';
import type { Need } from '@/data/schemas';
import type { NeedAssessment } from './types';

export type NeedState = 'suggested' | 'accepted' | 'adjusted' | 'dismissed';
export type NeedGroup = NeedTiming | 'dismissed' | 'covered';

export const NEED_GROUPS: readonly NeedGroup[] = [
  'now',
  'later',
  'notUseful',
  'dismissed',
  'covered',
];

export interface NeedView {
  line: ProductLine;
  assessment: NeedAssessment;
  decision?: Need;
  state: NeedState;
  group: NeedGroup;
  priority: Priority;
  /** The facts changed the suggestion since the decision. */
  recheck: boolean;
}

/** The latest decision per product line ("open" records count as no decision). */
export function latestDecisions(needs: readonly Need[]): Map<ProductLine, Need> {
  const latest = new Map<ProductLine, Need>();
  for (const need of needs) {
    if (need.status === 'open') continue;
    const current = latest.get(need.productLine);
    if (!current || need.updatedAt > current.updatedAt) latest.set(need.productLine, need);
  }
  return latest;
}

function stateOf(decision: Need | undefined): NeedState {
  if (!decision) return 'suggested';
  if (decision.status === 'dismissed') return 'dismissed';
  return decision.source === 'manual' ? 'adjusted' : 'accepted';
}

export function needViews(
  assessments: readonly NeedAssessment[],
  needs: readonly Need[],
): NeedView[] {
  const decisions = latestDecisions(needs);
  const views = assessments.map((assessment): NeedView => {
    const decision = decisions.get(assessment.line);
    const state = stateOf(decision);
    const covered = assessment.timing === 'covered';
    const group: NeedGroup = covered
      ? 'covered'
      : state === 'dismissed'
        ? 'dismissed'
        : state === 'suggested'
          ? assessment.timing
          : (decision?.timing ?? assessment.timing);
    return {
      line: assessment.line,
      assessment,
      decision,
      state,
      group,
      priority: state === 'adjusted' && decision ? decision.priority : assessment.priority,
      recheck:
        !covered &&
        decision !== undefined &&
        decision.basis !== undefined &&
        decision.basis !== assessment.basis,
    };
  });
  return views.sort(
    (a, b) =>
      NEED_GROUPS.indexOf(a.group) - NEED_GROUPS.indexOf(b.group) ||
      a.priority - b.priority ||
      PRODUCT_LINES.indexOf(a.line) - PRODUCT_LINES.indexOf(b.line),
  );
}

export function groupViews(views: readonly NeedView[]): Record<NeedGroup, NeedView[]> {
  const groups = Object.fromEntries(NEED_GROUPS.map((group) => [group, []])) as unknown as Record<
    NeedGroup,
    NeedView[]
  >;
  for (const view of views) groups[view.group].push(view);
  return groups;
}

/** Open needs "now" by priority (dashboard, list badges later). */
export function openNowCount(views: readonly NeedView[]): number {
  return views.filter((view) => view.group === 'now').length;
}
