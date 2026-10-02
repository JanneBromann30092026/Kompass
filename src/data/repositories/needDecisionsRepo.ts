/**
 * Decisions on the need engine's suggestions: accept, dismiss, change (own timing, priority
 * and reason), reset. One decision record per customer and product line; it keeps the
 * fingerprint (`basis`) of the suggestion it was made on, so a later change of the facts
 * shows "Bedarf neu prüfen".
 */
import type { NeedAssessment } from '@/core/needs/types';
import type { NeedTiming, Priority, ProductLine } from '../domain';
import type { Need } from '../schemas';
import { useDataStore } from '../store';
import { createLinkedRepo } from './recordsRepo';
import { needInputSchema } from '../schemas';

const needsRepo = createLinkedRepo('needs', needInputSchema);

export interface NeedAdjustment {
  timing: NeedTiming;
  priority: Priority;
  reason?: string;
}

/** Decision records of a line (newest first); "open" records are no decision. */
function decisionsOf(customerId: string, line: ProductLine): Need[] {
  return Object.values(useDataStore.getState().needs)
    .filter(
      (need) =>
        need.customerId === customerId && need.productLine === line && need.status !== 'open',
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function suggestedTiming(assessment: NeedAssessment): NeedTiming {
  if (assessment.timing === 'covered') throw new Error('A covered line needs no decision.');
  return assessment.timing;
}

async function save(
  customerId: string,
  line: ProductLine,
  fields: Omit<Need, 'id' | 'customerId' | 'createdAt' | 'updatedAt' | 'productLine'>,
): Promise<Need> {
  const [current] = decisionsOf(customerId, line);
  if (current) return needsRepo.update(current.id, { ...fields, reason: fields.reason ?? '' });
  return needsRepo.create(customerId, { ...fields, productLine: line });
}

export const needDecisionsRepo = {
  /** Takes over the suggestion as it is. */
  accept(customerId: string, assessment: NeedAssessment): Promise<Need> {
    return save(customerId, assessment.line, {
      timing: suggestedTiming(assessment),
      priority: assessment.priority,
      status: 'accepted',
      source: 'rule',
      basis: assessment.basis,
    });
  },

  /** Rejects the suggestion (optionally with an own reason). */
  dismiss(customerId: string, assessment: NeedAssessment, reason?: string): Promise<Need> {
    return save(customerId, assessment.line, {
      timing: suggestedTiming(assessment),
      priority: assessment.priority,
      reason,
      status: 'dismissed',
      source: 'rule',
      basis: assessment.basis,
    });
  },

  /** Own assessment: timing, priority and reason differ from the suggestion. */
  adjust(customerId: string, assessment: NeedAssessment, change: NeedAdjustment): Promise<Need> {
    return save(customerId, assessment.line, {
      timing: change.timing,
      priority: change.priority,
      reason: change.reason?.trim() || undefined,
      status: 'accepted',
      source: 'manual',
      basis: assessment.basis,
    });
  },

  /** Keeps the decision although the facts changed (takes over the new fingerprint). */
  async keep(decision: Need, assessment: NeedAssessment): Promise<Need> {
    return needsRepo.update(decision.id, { basis: assessment.basis });
  },

  /** Removes the decision: the line shows the current suggestion again. */
  async reset(customerId: string, line: ProductLine): Promise<void> {
    for (const decision of decisionsOf(customerId, line)) await needsRepo.remove(decision.id);
  },
};
