import {
  conversationInputSchema,
  lifeEventInputSchema,
  needInputSchema,
  reminderInputSchema,
} from '../schemas';
import { createLinkedRepo } from './recordsRepo';

export { campaignsRepo } from './campaignsRepo';
export { customersRepo } from './customersRepo';
export { metaRepo, VaultExistsError } from './metaRepo';
export { settingsRepo } from './settingsRepo';

export const needsRepo = createLinkedRepo('needs', needInputSchema);
export const remindersRepo = createLinkedRepo('reminders', reminderInputSchema);
export const lifeEventsRepo = createLinkedRepo('lifeEvents', lifeEventInputSchema);
export const conversationsRepo = createLinkedRepo('conversations', conversationInputSchema);
export { demoRepo, isSynthetic, type DemoStats } from './demoRepo';
