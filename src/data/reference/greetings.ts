/**
 * Birthday greetings (count as marketing: only offered with marketing consent). Placeholders:
 * {firstName}, {name} (first and last name). The user can still edit the text before sending.
 */
export const GREETING_FORMS = ['du', 'sie'] as const;
export type GreetingForm = (typeof GREETING_FORMS)[number];

export interface GreetingTemplate {
  subject: string;
  text: string;
}

export const BIRTHDAY_GREETINGS: Readonly<Record<GreetingForm, GreetingTemplate>> = {
  du: {
    subject: 'Alles Gute zum Geburtstag!',
    text: 'Hallo {firstName},\n\nalles Gute zum Geburtstag! Ich wünsche dir ein tolles neues Lebensjahr und einen schönen Tag.\n\nViele Grüße',
  },
  sie: {
    subject: 'Herzlichen Glückwunsch zum Geburtstag',
    text: 'Guten Tag {name},\n\nherzlichen Glückwunsch zum Geburtstag! Ich wünsche Ihnen alles Gute für das neue Lebensjahr und einen schönen Tag.\n\nMit freundlichen Grüßen',
  },
};

export function fillGreeting(
  template: string,
  person: { firstName: string; lastName?: string },
): string {
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ');
  return template.replaceAll('{firstName}', person.firstName).replaceAll('{name}', name);
}
