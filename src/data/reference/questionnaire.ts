/**
 * Question catalogue for a new customer. Source: 09_Vorlagen/Fragenkatalog, adapted to
 * Kompass: last name, phone and e-mail are optional here (they never leave the device).
 */
import type { Questionnaire } from './schemas';

export const QUESTIONNAIRE: Questionnaire = {
  title: 'Fragenkatalog (neuer Kunde)',
  sections: [
    {
      key: 'person',
      title: 'Person',
      questions: [
        'Geburtsdatum (oder Jahrgang)',
        'Familienstand',
        'Kinder',
        'Wohnsituation (Eltern / Miete / Eigentum)',
      ],
    },
    {
      key: 'job',
      title: 'Beruf',
      questions: [
        'Ausbildung, Studium oder Job',
        'Beginn und geplantes Ende',
        'Übernahme?',
        'Zahlt der Arbeitgeber VL oder bAV?',
      ],
    },
    {
      key: 'finances',
      title: 'Finanzen',
      questions: [
        'Netto-Einkommen',
        'Feste Ausgaben',
        'Monatlich frei verfügbar',
        'Rücklagen (ja/nein, grob)',
      ],
    },
    {
      key: 'goals',
      title: 'Ziele',
      questions: [
        'Kurzfristig (Führerschein, Auto, Reise)',
        'Mittelfristig (Auszug, Studium)',
        'Langfristig (Eigentum, Ruhestand)',
      ],
    },
    {
      key: 'contracts',
      title: 'Bestehende Verträge',
      questions: ['Eigene Verträge', 'Über die Eltern mitversichert'],
    },
    {
      key: 'risks',
      title: 'Risiken & Hobbys',
      questions: ['Sport', 'Fahrzeuge', 'Haustiere', 'Auslandsreisen'],
    },
    {
      key: 'investment',
      title: 'Anlage',
      questions: [
        'Erfahrung',
        'Risikobereitschaft',
        'Anlagehorizont (für die Geeignetheitsprüfung)',
      ],
    },
    {
      key: 'plans',
      title: 'Pläne in den nächsten 1–3 Jahren',
      questions: ['Umzug', 'Jobwechsel', 'Partner', 'Weiterbildung'],
    },
    {
      key: 'communication',
      title: 'Kommunikation',
      questions: [
        'Bevorzugter Kanal und beste Zeit',
        'Einwilligungen: Datenspeicherung, Werbung/Seminar-Einladung',
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
