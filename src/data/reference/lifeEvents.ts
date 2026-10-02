/**
 * Life events with their reminder rule (derived automatically in step 6). Source:
 * 04_Lebensereignisse in the Kunden-Wissensdatenbank and CLAUDE.md "Wiedervorlagen".
 */
import type { LifeEventKind } from '../domain';
import type { LifeEventInfo } from './schemas';

export const LIFE_EVENT_INFO: Readonly<Record<LifeEventKind, LifeEventInfo>> = {
  trainingStart: {
    key: 'trainingStart',
    name: 'Ausbildungsbeginn',
    aliases: ['Ausbildungsstart'],
    description: 'Erstes Gehalt, Arbeitgeberleistungen.',
    reminder: { anchor: 'eventDate', offsetMonths: -2, firstOfMonth: false },
    reminderText: 'Bei bekanntem Datum 2 Monate vorher.',
    talkingPoints: [
      'BU früh abschließen',
      'VL beim Arbeitgeber erfragen',
      'Kleinen Fondssparplan starten',
    ],
  },
  trainingEnd: {
    key: 'trainingEnd',
    name: 'Ausbildungsende',
    aliases: ['Studienende'],
    description: 'Übernahme, Gehalt, Ende der Mitversicherung bei den Eltern.',
    reminder: { anchor: 'eventDate', offsetMonths: -3, firstOfMonth: true },
    reminderText:
      '3 Monate vor dem geplanten Ende, am 1. des Monats (gilt auch für das Studienende).',
    talkingPoints: [
      'Übernahme? Gehalt?',
      'BU-Rente erhöhen',
      'Sparrate erhöhen',
      'Haftpflicht eigenständig?',
    ],
  },
  eighteenthBirthday: {
    key: 'eighteenthBirthday',
    name: '18. Geburtstag',
    aliases: ['Volljährigkeit'],
    description: 'Der Kunde wird volljährig.',
    reminder: { anchor: 'birthday', age: 18 },
    reminderText:
      'Am 18. Geburtstag. Ist nur der Jahrgang bekannt: 1. Januar des Jahres, Datum prüfen.',
    talkingPoints: [
      'Verträge auf den Kunden selbst umstellen',
      'Werbeeinwilligung neu einholen',
      'Kinder-Unfallversicherung der Eltern prüfen',
    ],
  },
  driversLicense: {
    key: 'driversLicense',
    name: 'Führerschein',
    aliases: ['BF17'],
    description: 'Führerschein bzw. begleitetes Fahren.',
    reminder: { anchor: 'eventDate', offsetMonths: 0, firstOfMonth: false },
    reminderText: 'Zum genannten Prüfungstermin.',
    talkingPoints: [
      'Kfz: eigenes Auto oder Eintrag im Vertrag der Eltern',
      'SF-Übertragung prüfen',
    ],
  },
  salaryIncrease: {
    key: 'salaryIncrease',
    name: 'Gehaltssprung',
    aliases: [],
    description: 'Deutlich mehr Einkommen (Übernahme, Beförderung, Jobwechsel).',
    reminder: { anchor: 'immediately' },
    reminderText: 'Sofort – Nachversicherungsfristen beginnen mit dem Ereignis.',
    talkingPoints: [
      'BU über die Nachversicherungsgarantie erhöhen (Frist prüfen!)',
      'Sparrate erhöhen',
      'bAV prüfen',
    ],
  },
  jobChange: {
    key: 'jobChange',
    name: 'Jobwechsel',
    aliases: [],
    description: 'Neuer Arbeitgeber.',
    reminder: { anchor: 'eventDate', offsetMonths: -1, firstOfMonth: false },
    reminderText: '1 Monat vor dem Wechsel.',
    talkingPoints: [
      'bAV mitnehmen oder neu abschließen',
      'VL beim neuen Arbeitgeber',
      'BU-Beruf aktualisieren (prüfen)',
    ],
  },
  move: {
    key: 'move',
    name: 'Umzug',
    aliases: [],
    description: 'Neue Wohnung.',
    reminder: { anchor: 'eventDate', offsetMonths: 0, firstOfMonth: false },
    reminderText: 'Zum Umzugsdatum.',
    talkingPoints: [
      'Hausrat: Wohnfläche und Versicherungssumme anpassen',
      'Kfz: Regionalklasse',
      'Adressänderung bei den Versicherern (die Adresse nicht in Kompass speichern)',
    ],
  },
  marriage: {
    key: 'marriage',
    name: 'Heirat',
    aliases: ['Hochzeit'],
    description: 'Heirat oder eingetragene Partnerschaft.',
    reminder: { anchor: 'eventDate', offsetMonths: -3, firstOfMonth: false },
    reminderText: '3 Monate vor dem Termin.',
    talkingPoints: [
      'Haftpflicht und Hausrat zusammenlegen',
      'BU-Nachversicherung (Heirat)',
      'Begünstigungen prüfen',
    ],
  },
  childBirth: {
    key: 'childBirth',
    name: 'Geburt eines Kindes',
    aliases: [],
    description: 'Familienzuwachs.',
    reminder: { anchor: 'eventDate', offsetMonths: 0, firstOfMonth: false },
    reminderText: 'Zum genannten Termin.',
    talkingPoints: [
      'Familientarif Haftpflicht',
      'BU-Nachversicherung',
      'Kinderdepot bzw. Fondssparplan',
    ],
  },
  parentalLeaveEnd: {
    key: 'parentalLeaveEnd',
    name: 'Elternzeit-Ende',
    aliases: ['Wiedereinstieg'],
    description: 'Rückkehr in den Beruf.',
    reminder: { anchor: 'eventDate', offsetMonths: -2, firstOfMonth: false },
    reminderText: '2 Monate vor dem Wiedereinstieg.',
    talkingPoints: ['BU erneut ansprechen', 'VL und bAV wieder aktivieren', 'Sparrate prüfen'],
  },
  propertyPurchase: {
    key: 'propertyPurchase',
    name: 'Immobilienkauf',
    aliases: [],
    description: 'Kauf oder Bau einer Immobilie.',
    reminder: { anchor: 'eventDate', offsetMonths: 0, firstOfMonth: false },
    reminderText: 'Zum genannten Termin.',
    talkingPoints: ['BU-Nachversicherung', 'Hausrat anpassen', 'Gebäudeversicherung (prüfen)'],
  },
  annualReview: {
    key: 'annualReview',
    name: 'Jahresgespräch',
    aliases: [],
    description: 'Regelmäßiger Kontakt.',
    reminder: { anchor: 'lastConversation', offsetMonths: 12 },
    reminderText: '12 Monate nach dem letzten Gespräch.',
    talkingPoints: ['Fakten aktualisieren', 'Bedarf neu bewerten', 'Einwilligungen prüfen'],
  },
};
