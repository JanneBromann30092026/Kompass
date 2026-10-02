/** Topics (Themen). Source: 06_Themen in the Kunden-Wissensdatenbank. */
import type { Topic } from '../domain';
import type { TopicInfo } from './schemas';

export const TOPIC_INFO: Readonly<Record<Topic, TopicInfo>> = {
  incomeProtection: {
    key: 'incomeProtection',
    name: 'Arbeitskraftabsicherung',
    description: 'Einkommen absichern, wenn Krankheit oder Unfall die Arbeit unmöglich machen.',
    products: ['bu', 'accident'],
  },
  liabilityAndProperty: {
    key: 'liabilityAndProperty',
    name: 'Haftung und Sachwerte',
    description: 'Schäden an anderen und am eigenen Besitz.',
    products: ['liability', 'household', 'car'],
  },
  wealthBuilding: {
    key: 'wealthBuilding',
    name: 'Vermögensaufbau',
    description: 'Regelmäßig Vermögen bilden – mit eigenem Geld und Arbeitgeberleistungen.',
    products: ['fundSavings', 'investmentPension', 'capitalFormation', 'occupationalPension'],
  },
  retirementProvision: {
    key: 'retirementProvision',
    name: 'Altersvorsorge',
    description: 'Die Lücke zwischen gesetzlicher Rente und gewünschtem Lebensstandard schließen.',
    products: ['investmentPension', 'occupationalPension'],
  },
};
