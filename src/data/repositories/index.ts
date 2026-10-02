import {
  conversationInputSchema,
  lifeEventInputSchema,
  needInputSchema,
  reminderInputSchema,
} from '../schemas';
import { createLinkedRepo } from './recordsRepo';

export { campaignsRepo } from './campaignsRepo';
export { customersRepo } from './customersRepo';
export { conversationDraftId, draftsRepo, NEW_CUSTOMER_DRAFT_ID } from './draftsRepo';
export { metaRepo, VaultExistsError } from './metaRepo';
export { needDecisionsRepo, type NeedAdjustment } from './needDecisionsRepo';
export {
  AutomaticReminderError,
  reminderActionsRepo,
  type Completion,
  type ManualReminder,
} from './reminderActionsRepo';
export { settingsRepo } from './settingsRepo';

export const needsRepo = createLinkedRepo('needs', needInputSchema);
export const remindersRepo = createLinkedRepo('reminders', reminderInputSchema);
export const lifeEventsRepo = createLinkedRepo('lifeEvents', lifeEventInputSchema);
export const conversationsRepo = createLinkedRepo('conversations', conversationInputSchema);
