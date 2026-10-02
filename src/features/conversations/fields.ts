/** The text sections of a conversation note, in display order. */
export const TEXT_FIELDS = ['discussed', 'results', 'openItems', 'nextSteps'] as const;
export type TextField = (typeof TEXT_FIELDS)[number];

export type ConversationValues = {
  date: string;
  title: string;
  participants: string;
  discussed: string;
  results: string;
  openItems: string;
  nextSteps: string;
  notes: string;
};
