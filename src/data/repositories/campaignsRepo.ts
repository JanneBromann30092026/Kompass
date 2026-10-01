import { nextTimestamp } from '@/core/time';
import { parseOrThrow } from '../errors';
import { campaignInputSchema, type Campaign } from '../schemas';
import { useDataStore } from '../store';
import { requireRecord, validateRecord } from './recordsRepo';
import { commit } from './rows';

type CampaignInput = Parameters<typeof campaignInputSchema.parse>[0];

/** Campaigns (seminars, invitations) are not tied to a single customer: no history. */
export const campaignsRepo = {
  list(): Campaign[] {
    return Object.values(useDataStore.getState().campaigns);
  },

  async create(input: CampaignInput): Promise<Campaign> {
    const fields = parseOrThrow(campaignInputSchema, input);
    const now = nextTimestamp(undefined);
    const record = validateRecord('campaigns', {
      ...fields,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
    await commit([{ table: 'campaigns', record }]);
    return record;
  },

  async update(id: string, patch: Partial<CampaignInput>): Promise<Campaign> {
    const current = requireRecord('campaigns', id);
    const record = validateRecord('campaigns', {
      ...current,
      ...patch,
      updatedAt: nextTimestamp(current.updatedAt),
    });
    await commit([{ table: 'campaigns', record }]);
    return record;
  },

  async remove(id: string): Promise<void> {
    await commit([], [{ table: 'campaigns', ids: [id] }]);
  },
};
