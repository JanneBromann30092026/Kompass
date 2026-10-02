/**
 * Question catalogue for a new customer. Source: 09_Vorlagen/Fragenkatalog, adapted to
 * Kompass: last name, phone and e-mail are optional here (they never leave the device).
 * Each question names the customer fields that answer it (see questionSchema).
 */
import type { LifePhase } from '../domain';
import type { Questionnaire } from './schemas';

/** People with an employer (not at school, not retired). */
const EMPLOYED: LifePhase[] = [
  'training',
  'careerStart',
  'movingOut',
  'partnership',
  'family',
  'property',
];

export const QUESTIONNAIRE: Questionnaire = {
  title: 'Fragenkatalog (neuer Kunde)',
  sections: [
    {
      key: 'person',
      title: 'Person',
      questions: [
        { key: 'birth', text: 'Geburtsdatum (oder Jahrgang)', fields: ['birthDate', 'birthYear'] },
        { key: 'maritalStatus', text: 'Familienstand', fields: ['maritalStatus'] },
        { key: 'children', text: 'Kinder', fields: ['children'] },
        {
          key: 'housing',
          text: 'Wohnsituation (Eltern / Miete / Eigentum)',
          fields: ['housing'],
        },
      ],
    },
    {
      key: 'job',
      title: 'Beruf',
      questions: [
        {
          key: 'occupation',
          text: 'Ausbildung, Studium oder Job',
          fields: ['lifePhase', 'occupation', 'employment'],
        },
        {
          key: 'period',
          text: 'Beginn und geplantes Ende',
          fields: ['trainingStart', 'trainingEnd'],
          onlyFor: ['training', 'studies'],
        },
        {
          key: 'takeover',
          text: 'Übernahme?',
          fields: ['answers.takeover'],
          onlyFor: ['training', 'studies'],
        },
        {
          key: 'employer',
          text: 'Zahlt der Arbeitgeber VL oder bAV?',
          fields: ['employerVl', 'employerBav'],
          onlyFor: EMPLOYED,
        },
      ],
    },
    {
      key: 'finances',
      title: 'Finanzen',
      questions: [
        { key: 'netIncome', text: 'Netto-Einkommen', fields: ['netIncome'] },
        { key: 'fixedCosts', text: 'Feste Ausgaben', fields: ['fixedCosts'] },
        { key: 'disposable', text: 'Monatlich frei verfügbar', fields: ['disposableIncome'] },
        { key: 'reserves', text: 'Rücklagen (ja/nein, grob)', fields: ['answers.reserves'] },
      ],
    },
    {
      key: 'goals',
      title: 'Ziele',
      questions: [
        {
          key: 'goalsShort',
          text: 'Kurzfristig (Führerschein, Auto, Reise)',
          fields: ['answers.goalsShort'],
        },
        {
          key: 'goalsMid',
          text: 'Mittelfristig (Auszug, Studium)',
          fields: ['answers.goalsMid'],
        },
        {
          key: 'goalsLong',
          text: 'Langfristig (Eigentum, Ruhestand)',
          fields: ['answers.goalsLong'],
        },
      ],
    },
    {
      key: 'contracts',
      title: 'Bestehende Verträge',
      questions: [
        { key: 'ownContracts', text: 'Eigene Verträge', fields: ['contracts'] },
        {
          key: 'viaParents',
          text: 'Über die Eltern mitversichert',
          fields: ['contracts'],
          onlyFor: ['school', 'training', 'studies', 'careerStart', 'movingOut'],
        },
      ],
    },
    {
      key: 'risks',
      title: 'Risiken & Hobbys',
      questions: [
        { key: 'sport', text: 'Sport', fields: ['answers.sport'] },
        { key: 'vehicles', text: 'Fahrzeuge', fields: ['answers.vehicles'] },
        { key: 'pets', text: 'Haustiere', fields: ['answers.pets'] },
        { key: 'travel', text: 'Auslandsreisen', fields: ['answers.travel'] },
      ],
    },
    {
      key: 'investment',
      title: 'Anlage',
      questions: [
        { key: 'experience', text: 'Erfahrung', fields: ['answers.experience'] },
        { key: 'riskProfile', text: 'Risikobereitschaft', fields: ['riskProfile'] },
        {
          key: 'horizon',
          text: 'Anlagehorizont (für die Geeignetheitsprüfung)',
          fields: ['answers.horizon'],
        },
      ],
    },
    {
      key: 'plans',
      title: 'Pläne in den nächsten 1–3 Jahren',
      questions: [
        { key: 'planMove', text: 'Umzug', fields: ['answers.planMove'] },
        { key: 'planJob', text: 'Jobwechsel', fields: ['answers.planJob'] },
        { key: 'planPartner', text: 'Partner', fields: ['answers.planPartner'] },
        { key: 'planEducation', text: 'Weiterbildung', fields: ['answers.planEducation'] },
      ],
    },
    {
      key: 'communication',
      title: 'Kommunikation',
      questions: [
        {
          key: 'channel',
          text: 'Bevorzugter Kanal und beste Zeit',
          fields: ['consents.contactChannel', 'answers.bestTime'],
        },
        {
          key: 'consents',
          text: 'Einwilligungen: Datenspeicherung, Werbung/Seminar-Einladung',
          fields: ['consents.dataStorage', 'consents.marketing'],
        },
      ],
    },
  ],
  missingAnswers:
    'Fehlt eine Antwort: Feld leer lassen und als offenen Punkt für das nächste Gespräch vermerken – nie raten.',
  doNotStore: {
    title: 'Nicht erfragen bzw. nicht speichern',
    items: [
      'Adresse',
      'IBAN',
      'Steuer-ID',
      'Vertragsnummern',
      'Gesundheitsdaten – nur „Gesundheitsprüfung erledigt: ja/nein“',
    ],
    optional:
      'Nachname, Telefon und E-Mail sind optional. Sie bleiben verschlüsselt auf dem iPad und gehen nie an die KI oder in Kalender-Exporte.',
  },
};
