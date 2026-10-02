/** Life phases. Source: 03_Lebensphasen in the Kunden-Wissensdatenbank. */
import type { LifePhase } from '../domain';
import type { LifePhaseInfo } from './schemas';

export const LIFE_PHASE_INFO: Readonly<Record<LifePhase, LifePhaseInfo>> = {
  school: {
    key: 'school',
    name: 'Schule',
    description: 'Schüler, meist minderjährig, wohnen bei den Eltern.',
    note: 'Minderjährige: Abschlüsse und Werbung nur mit Zustimmung der Eltern.',
    typicalProducts: ['accident', 'liability', 'bu'],
    typicalEvents: ['eighteenthBirthday', 'driversLicense', 'trainingStart'],
    relatedPhases: [],
  },
  training: {
    key: 'training',
    name: 'Ausbildung',
    description: 'Erstes eigenes Geld, meist noch bei den Eltern und dort mitversichert.',
    typicalProducts: ['bu', 'accident', 'capitalFormation', 'fundSavings', 'investmentPension'],
    typicalEvents: ['trainingStart', 'trainingEnd', 'eighteenthBirthday', 'driversLicense'],
    relatedPhases: ['movingOut'],
  },
  studies: {
    key: 'studies',
    name: 'Studium',
    description:
      'Wenig Einkommen, oft WG oder Studentenwohnung, häufig noch über die Eltern versichert.',
    typicalProducts: ['bu', 'liability', 'household', 'fundSavings'],
    typicalEvents: ['trainingEnd'],
    relatedPhases: ['movingOut', 'careerStart'],
  },
  careerStart: {
    key: 'careerStart',
    name: 'Berufsstart',
    description: 'Erstes volles Gehalt, eigene Verträge werden wichtig.',
    typicalProducts: [
      'bu',
      'occupationalPension',
      'capitalFormation',
      'investmentPension',
      'fundSavings',
      'liability',
    ],
    typicalEvents: ['salaryIncrease', 'jobChange', 'move'],
    relatedPhases: [],
  },
  movingOut: {
    key: 'movingOut',
    name: 'Auszug',
    description: 'Eigene Wohnung – Haushalt und Haftung werden eigenständig.',
    typicalProducts: ['household', 'liability'],
    typicalEvents: ['move', 'trainingEnd'],
    relatedPhases: [],
  },
  partnership: {
    key: 'partnership',
    name: 'Partnerschaft und Heirat',
    description: 'Zusammenziehen, Heirat – Verträge zusammenlegen, gegenseitig absichern.',
    typicalProducts: ['liability', 'household', 'bu'],
    typicalEvents: ['marriage', 'move', 'childBirth'],
    relatedPhases: [],
  },
  family: {
    key: 'family',
    name: 'Familie mit Kind',
    description: 'Verantwortung für andere, Einkommen der Familie absichern, für Kinder sparen.',
    typicalProducts: ['bu', 'liability', 'fundSavings', 'accident'],
    typicalEvents: ['childBirth', 'parentalLeaveEnd', 'propertyPurchase'],
    relatedPhases: [],
  },
  property: {
    key: 'property',
    name: 'Immobilie',
    description: 'Eigentum gekauft oder geplant – Finanzierung und Einkommen absichern.',
    typicalProducts: ['bu', 'household', 'investmentPension'],
    typicalEvents: ['propertyPurchase', 'move'],
    relatedPhases: [],
  },
  retirement: {
    key: 'retirement',
    name: 'Ruhestand',
    description: 'Vorbereitung auf den Ruhestand und Ruhestand selbst.',
    note: 'Rentenlücke mit aktueller Renteninformation berechnen.',
    typicalProducts: ['investmentPension', 'accident'],
    typicalEvents: ['annualReview'],
    relatedPhases: [],
  },
};
