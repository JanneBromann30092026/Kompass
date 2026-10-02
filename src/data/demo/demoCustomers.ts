/**
 * The 12 invented test customers of the Kunden-Wissensdatenbank (01_Kunden, 08_Gespraeche)
 * as demo data. All persons are fictional; K-0001 got a different invented first name,
 * birth dates, last names and contact data are invented too (phone +49 000 …, e-mail
 * @example.com). Dates refer to DEMO_REFERENCE_DATE and are shifted to today on import.
 */
import type { FieldChange } from '@/core/history';
import type { LifeEventKind, ReminderKind } from '../domain';
import type { CustomerInput } from '../schemas';

/** "Today" of the source data. */
export const DEMO_REFERENCE_DATE = '2026-10-01';

export interface DemoReminder {
  dueDate: string;
  kind: ReminderKind;
  title: string;
  todo: string;
}

export interface DemoConversation {
  date: string;
  title: string;
  notes: string;
}

export interface DemoLifeEvent {
  kind: LifeEventKind;
  /** "JJJJ-MM" or "JJJJ-MM-TT". */
  date?: string;
  note?: string;
}

export interface DemoCustomer {
  key: string;
  /** First contact: the customer was created then. */
  since: string;
  customer: Omit<CustomerInput, 'demo'>;
  lifeEvents: DemoLifeEvent[];
  /**
   * Explicit reminders. Reminders for the end of training and the 18th birthday are
   * derived from the (shifted) facts instead, like the rules of step 6 will do.
   */
  reminders: DemoReminder[];
  conversations: DemoConversation[];
  /** Changes after the first contact (history "old → new"). */
  changes: { date: string; changes: FieldChange[] }[];
}

const consent = (date: string, granted = true) => ({ granted, date });

export const DEMO_CUSTOMERS: DemoCustomer[] = [
  {
    key: 'k01',
    since: '2026-09-15',
    customer: {
      firstName: 'Leon',
      birthDate: '2010-03-14',
      lifePhase: 'training',
      occupation: 'Bankkaufmann (Azubi)',
      employment: 'employee',
      trainingStart: '2026-08',
      trainingEnd: '2029-08',
      housing: 'parents',
      maritalStatus: 'single',
      children: 0,
      healthCheckDone: true,
      consents: { dataStorage: consent('2026-09-15') },
      parentalConsent: consent('2026-09-15'),
      contracts: {
        bu: 'concluded',
        liability: 'viaParents',
        car: 'notRelevant',
        accident: 'planned',
        investmentPension: 'planned',
        occupationalPension: 'open',
        capitalFormation: 'open',
        fundSavings: 'no',
        household: 'notRelevant',
      },
      potential: 'medium',
      tags: ['Azubi'],
      openPoints: [
        'Netto-Einkommen, Risikoprofil, Werbeeinwilligung und Kontaktkanal fehlen → nächstes Gespräch (mit Eltern).',
        'Termin für die geplanten Abschlüsse (Unfall, Investmentrente) vereinbaren.',
        'Zahlt die Bank VL? (prüfen)',
      ],
    },
    lifeEvents: [
      { kind: 'trainingStart', date: '2026-08' },
      { kind: 'trainingEnd', date: '2029-08' },
    ],
    reminders: [
      {
        dueDate: '2027-09-15',
        kind: 'annualReview',
        title: 'Jahresgespräch',
        todo: 'Unfall/Investmentrente-Stand, VL-Antwort der Bank',
      },
    ],
    conversations: [
      {
        date: '2026-09-15',
        title: 'Erstgespräch (mit Eltern)',
        notes: [
          'Besprochen:',
          '- Ausbildungsstart als Bankkaufmann (08/2026), wohnt bei den Eltern.',
          '- BU als erster Baustein; Gesundheitsprüfung erledigt (keine Details gespeichert).',
          '- Unfall und Investmentrente als nächste Schritte.',
          '',
          'Ergebnisse:',
          '- BU abgeschlossen (Zustimmung der Eltern liegt vor).',
          '- Unfall, Investmentrente: geplant.',
          '',
          'Offen:',
          '- VL beim Arbeitgeber erfragen. Werbeeinwilligung noch nicht erteilt.',
          '',
          'Nächste Schritte:',
          '- Termin für Unfall/Investmentrente vereinbaren.',
        ].join('\n'),
      },
    ],
    changes: [
      {
        date: '2026-09-15',
        changes: [
          { path: 'contracts.accident', from: 'open', to: 'planned' },
          { path: 'contracts.bu', from: 'open', to: 'concluded' },
          { path: 'contracts.investmentPension', from: 'open', to: 'planned' },
        ],
      },
    ],
  },
  {
    key: 'k02',
    since: '2026-09-28',
    customer: {
      firstName: 'Ben',
      lastName: 'Hartmann',
      phone: '+49 000 5550102',
      birthDate: '2007-10-05',
      lifePhase: 'training',
      occupation: 'Industriemechaniker (Azubi, 3. Jahr)',
      employment: 'employee',
      employerVl: true,
      answers: { sport: 'Fußball im Verein', vehicles: 'Führerschein-Prüfung 11/2026' },
      trainingStart: '2023-09',
      trainingEnd: '2027-01',
      housing: 'parents',
      maritalStatus: 'single',
      children: 0,
      netIncome: 950,
      riskProfile: 'balanced',
      healthCheckDone: false,
      consents: {
        dataStorage: consent('2026-09-28'),
        marketing: consent('2026-09-28'),
        contactChannel: { channel: 'whatsapp', date: '2026-09-28' },
      },
      contracts: {
        bu: 'offered',
        liability: 'viaParents',
        car: 'open',
        accident: 'no',
        investmentPension: 'no',
        occupationalPension: 'open',
        capitalFormation: 'open',
        fundSavings: 'no',
        household: 'notRelevant',
      },
      potential: 'high',
      tags: ['Azubi', 'Vereinsfußball'],
      openPoints: [
        'Übernahme nach der Ausbildung: offen.',
        'VL-Höhe beim Arbeitgeber (prüfen).',
        'Bietet der Arbeitgeber bAV mit Zuschuss an? (prüfen)',
      ],
    },
    lifeEvents: [
      { kind: 'trainingEnd', date: '2027-01', note: 'Übernahme noch offen' },
      { kind: 'driversLicense', date: '2026-11-15', note: 'Prüfung im November' },
    ],
    reminders: [
      {
        dueDate: '2026-11-15',
        kind: 'lifeEvent',
        title: 'Führerschein',
        todo: 'Kfz klären: eigenes Auto oder Eintrag im Vertrag der Eltern, SF-Übertragung prüfen',
      },
      {
        dueDate: '2027-09-28',
        kind: 'annualReview',
        title: 'Jahresgespräch',
        todo: 'Übernahme, Gehalt, Verträge prüfen',
      },
    ],
    conversations: [
      {
        date: '2026-09-28',
        title: 'Beratung BU',
        notes: [
          'Besprochen:',
          '- Ausbildungsende 01/2027, Übernahme noch offen.',
          '- Arbeitgeber zahlt laut Ben VL (Höhe prüfen).',
          '- Führerscheinprüfung im November.',
          '',
          'Ergebnisse:',
          '- BU angeboten, Entscheidung bis zum nächsten Termin.',
          '',
          'Nächste Schritte:',
          '- Ausbildungsende-Gespräch: Übernahme, Gehalt, BU, VL.',
        ].join('\n'),
      },
    ],
    changes: [
      { date: '2026-09-28', changes: [{ path: 'contracts.bu', from: 'open', to: 'offered' }] },
    ],
  },
  {
    key: 'k03',
    since: '2025-03-12',
    customer: {
      firstName: 'Clara',
      lastName: 'Wendt',
      email: 'clara.wendt@example.com',
      birthDate: '2004-05-22',
      lifePhase: 'studies',
      occupation: 'Studentin Lehramt (Master)',
      employment: 'civilServant',
      trainingStart: '2022-10',
      trainingEnd: '2027-09',
      housing: 'sharedFlat',
      maritalStatus: 'single',
      children: 0,
      netIncome: 600,
      riskProfile: 'conservative',
      healthCheckDone: false,
      consents: {
        dataStorage: consent('2025-03-12'),
        marketing: consent('2025-03-12'),
        contactChannel: { channel: 'email', date: '2025-03-12' },
      },
      contracts: {
        bu: 'planned',
        liability: 'viaParents',
        car: 'notRelevant',
        accident: 'no',
        investmentPension: 'no',
        occupationalPension: 'notRelevant',
        capitalFormation: 'notRelevant',
        fundSavings: 'concluded',
        household: 'viaParents',
      },
      potential: 'medium',
      tags: ['Studium', 'Lehramt'],
      openPoints: [
        'BU-Termin vereinbaren (geplant, noch kein Termin).',
        'Bedingungen der Eltern: Wie lange gilt die Mitversicherung? (prüfen)',
      ],
    },
    lifeEvents: [
      { kind: 'trainingEnd', date: '2027-09', note: 'Studienende, danach Referendariat (prüfen)' },
    ],
    reminders: [
      {
        dueDate: '2027-03-10',
        kind: 'annualReview',
        title: 'Jahresgespräch',
        todo: 'BU-Stand, Referendariatsort, Sparrate',
      },
    ],
    conversations: [
      {
        date: '2026-03-10',
        title: 'Jahresgespräch',
        notes:
          'Jahresgespräch, BU als nächster Schritt vereinbart (mit Dienstunfähigkeitsklausel – prüfen).',
      },
    ],
    changes: [
      { date: '2026-03-10', changes: [{ path: 'contracts.bu', from: 'open', to: 'planned' }] },
    ],
  },
  {
    key: 'k04',
    since: '2024-11-04',
    customer: {
      firstName: 'David',
      lastName: 'Albers',
      phone: '+49 000 5550104',
      email: 'david.albers@example.com',
      birthDate: '1998-12-03',
      lifePhase: 'careerStart',
      occupation: 'IT-Consultant (seit 04/2026)',
      employment: 'employee',
      employerVl: false,
      employerBav: true,
      housing: 'rent',
      maritalStatus: 'partnership',
      children: 0,
      netIncome: 3100,
      riskProfile: 'growth',
      healthCheckDone: true,
      consents: {
        dataStorage: consent('2024-11-04'),
        marketing: consent('2024-11-04'),
        contactChannel: { channel: 'email', date: '2024-11-04' },
      },
      contracts: {
        bu: 'concluded',
        liability: 'concluded',
        car: 'concluded',
        accident: 'no',
        investmentPension: 'offered',
        occupationalPension: 'open',
        capitalFormation: 'notRelevant',
        fundSavings: 'concluded',
        household: 'concluded',
      },
      potential: 'high',
      tags: ['Berufsstart', 'ETF-Erfahrung'],
      openPoints: [
        'Genaues Datum des Gehaltssprungs für die Nachversicherungsfrist (prüfen).',
        'Hobbys/Risiken noch nicht erfragt.',
      ],
    },
    lifeEvents: [
      {
        kind: 'salaryIncrease',
        date: '2026-04',
        note: 'Wechsel vom Werkstudenten zum IT-Consultant',
      },
      { kind: 'marriage', date: '2027-06' },
    ],
    reminders: [
      {
        dueDate: '2026-10-05',
        kind: 'lifeEvent',
        title: 'Gehaltssprung',
        todo: 'BU-Erhöhung über Nachversicherung (Frist prüfen!), bAV-Zuschuss klären',
      },
      {
        dueDate: '2027-03-01',
        kind: 'lifeEvent',
        title: 'Heirat',
        todo: 'Haftpflicht/Hausrat zusammenlegen, BU-Nachversicherung, Begünstigungen prüfen',
      },
      {
        dueDate: '2027-06-10',
        kind: 'annualReview',
        title: 'Jahresgespräch',
        todo: 'Investmentrente-Entscheidung, Sparrate',
      },
    ],
    conversations: [
      {
        date: '2026-06-10',
        title: 'Berufsstart',
        notes: [
          'Besprochen:',
          '- Neuer Job als IT-Consultant seit 04/2026, deutlich höheres Gehalt.',
          '- Heirat geplant 06/2027.',
          '- Arbeitgeber bietet bAV mit Zuschuss.',
          '',
          'Ergebnisse:',
          '- Investmentrente angeboten.',
          '',
          'Nächste Schritte:',
          '- BU-Erhöhung über Nachversicherung (Frist prüfen), bAV-Zuschuss klären.',
        ].join('\n'),
      },
    ],
    changes: [
      {
        date: '2026-06-10',
        changes: [
          { path: 'contracts.investmentPension', from: 'open', to: 'offered' },
          { path: 'lifePhase', from: 'studies', to: 'careerStart' },
          { path: 'netIncome', from: 1200, to: 3100 },
          { path: 'occupation', from: 'Werkstudent IT', to: 'IT-Consultant (seit 04/2026)' },
        ],
      },
    ],
  },
  {
    key: 'k05',
    since: '2023-11-14',
    customer: {
      firstName: 'Emma',
      phone: '+49 000 5550105',
      birthDate: '1995-10-07',
      lifePhase: 'family',
      occupation: 'Pflegefachfrau (Elternzeit bis 03/2027)',
      employment: 'employee',
      housing: 'rent',
      maritalStatus: 'married',
      children: 1,
      netIncome: 1400,
      riskProfile: 'conservative',
      healthCheckDone: false,
      consents: {
        dataStorage: consent('2023-11-14'),
        marketing: consent('2023-11-14', false),
        contactChannel: { channel: 'phone', date: '2023-11-14' },
      },
      contracts: {
        bu: 'declined',
        liability: 'concluded',
        car: 'concluded',
        accident: 'concluded',
        investmentPension: 'no',
        occupationalPension: 'open',
        capitalFormation: 'open',
        fundSavings: 'open',
        household: 'concluded',
      },
      potential: 'medium',
      tags: ['Familie', 'Elternzeit'],
      openPoints: ['VL-Anspruch und Zusatzversorgung beim Arbeitgeber (prüfen).'],
    },
    lifeEvents: [
      { kind: 'childBirth', date: '2025-05' },
      { kind: 'parentalLeaveEnd', date: '2027-03' },
    ],
    reminders: [
      {
        dueDate: '2026-11-20',
        kind: 'annualReview',
        title: 'Jahresgespräch',
        todo: 'Kinderdepot starten, VL-Anspruch klären',
      },
      {
        dueDate: '2027-01-01',
        kind: 'lifeEvent',
        title: 'Elternzeit-Ende',
        todo: 'BU erneut ansprechen, VL/bAV aktivieren, Sparrate prüfen',
      },
    ],
    conversations: [
      {
        date: '2025-11-20',
        title: 'Jahresgespräch',
        notes:
          'Jahresgespräch, BU-Angebot abgelehnt (Budget in der Elternzeit). Kinderdepot gewünscht.',
      },
    ],
    changes: [
      {
        date: '2025-11-20',
        changes: [{ path: 'contracts.bu', from: 'offered', to: 'declined' }],
      },
    ],
  },
  {
    key: 'k06',
    since: '2026-07-12',
    customer: {
      firstName: 'Finn',
      phone: '+49 000 5550106',
      // Only the year is known: the 18th birthday reminder falls on 1 January ("Datum prüfen").
      birthYear: 2009,
      lifePhase: 'school',
      occupation: 'Schüler (Ausbildung Elektroniker ab 08/2027 zugesagt)',
      trainingStart: '2027-08',
      trainingEnd: '2031-02',
      housing: 'parents',
      maritalStatus: 'single',
      children: 0,
      healthCheckDone: false,
      consents: {
        dataStorage: consent('2026-07-12'),
        marketing: consent('2026-07-12'),
        contactChannel: { channel: 'whatsapp', date: '2026-07-12' },
      },
      parentalConsent: consent('2026-07-12'),
      contracts: {
        bu: 'open',
        liability: 'viaParents',
        car: 'viaParents',
        accident: 'viaParents',
        investmentPension: 'notRelevant',
        occupationalPension: 'notRelevant',
        capitalFormation: 'notRelevant',
        fundSavings: 'no',
        household: 'notRelevant',
      },
      potential: 'medium',
      tags: ['Schule', 'BF17'],
      openPoints: ['Termin mit den Eltern für die BU vereinbaren.'],
    },
    lifeEvents: [
      { kind: 'driversLicense', date: '2026-07', note: 'Begleitetes Fahren (BF17)' },
      { kind: 'trainingStart', date: '2027-08', note: 'Ausbildung Elektroniker zugesagt' },
    ],
    reminders: [
      {
        dueDate: '2027-06-01',
        kind: 'lifeEvent',
        title: 'Ausbildungsbeginn',
        todo: 'BU (falls noch offen), VL beim Betrieb erfragen, kleiner Sparplan',
      },
      {
        dueDate: '2027-07-12',
        kind: 'annualReview',
        title: 'Jahresgespräch',
        todo: 'Ausbildungsstart, Verträge prüfen',
      },
    ],
    conversations: [
      {
        date: '2026-07-12',
        title: 'Gespräch mit Finn und Eltern',
        notes:
          'BF17 seit 07/2026, Ausbildungszusage als Elektroniker ab 08/2027. Eltern stimmen Beratung und Werbung zu.',
      },
    ],
    changes: [],
  },
  {
    key: 'k07',
    since: '2024-03-18',
    customer: {
      firstName: 'Greta',
      lastName: 'Sommer',
      phone: '+49 000 5550107',
      birthDate: '1990-02-11',
      lifePhase: 'property',
      occupation: 'Selbständige Grafikdesignerin (seit 2019)',
      employment: 'selfEmployed',
      answers: { vehicles: 'kein Auto (Carsharing)' },
      housing: 'owned',
      maritalStatus: 'single',
      children: 0,
      netIncome: 2800,
      riskProfile: 'balanced',
      healthCheckDone: false,
      consents: {
        dataStorage: consent('2024-03-18'),
        marketing: consent('2024-03-18'),
        contactChannel: { channel: 'phone', date: '2024-03-18' },
      },
      contracts: {
        bu: 'open',
        liability: 'concluded',
        car: 'notRelevant',
        accident: 'concluded',
        investmentPension: 'planned',
        occupationalPension: 'notRelevant',
        capitalFormation: 'notRelevant',
        fundSavings: 'concluded',
        household: 'concluded',
      },
      potential: 'high',
      tags: ['Selbständig'],
      openPoints: ['Rücklage für Auftragsflauten vorhanden? (Fragenkatalog Punkt 3)'],
    },
    lifeEvents: [
      { kind: 'propertyPurchase', date: '2024-03', note: 'Eigentumswohnung, Kredit läuft' },
    ],
    reminders: [
      {
        dueDate: '2026-10-20',
        kind: 'manual',
        title: 'Gesprächstermin',
        todo: 'BU-Angebot besprechen, Gesundheitsprüfung vorbereiten',
      },
      {
        dueDate: '2027-08-30',
        kind: 'annualReview',
        title: 'Jahresgespräch',
        todo: 'Basisrente-Stand, Einkommen, Kredit',
      },
    ],
    conversations: [
      {
        date: '2026-08-30',
        title: 'Vorsorge-Check',
        notes: [
          'Besprochen:',
          '- Selbständig, Eigentumswohnung mit laufendem Kredit, keine BU.',
          '- Basisrente als Altersvorsorge (steuerliche Wirkung prüfen).',
          '',
          'Ergebnisse:',
          '- Investmentrente (Basisrente) geplant.',
          '- Termin für das BU-Angebot vereinbart.',
          '',
          'Nächste Schritte:',
          '- BU-Angebot vorbereiten.',
        ].join('\n'),
      },
    ],
    changes: [
      {
        date: '2026-08-30',
        changes: [{ path: 'contracts.investmentPension', from: 'open', to: 'planned' }],
      },
    ],
  },
  {
    key: 'k08',
    since: '2023-08-21',
    customer: {
      firstName: 'Hannes',
      phone: '+49 000 5550108',
      birthDate: '2005-07-30',
      lifePhase: 'movingOut',
      occupation: 'Kfz-Mechatroniker (Azubi, 4. Jahr)',
      employment: 'employee',
      answers: { sport: 'Motocross', vehicles: 'eigenes Auto' },
      trainingStart: '2023-08',
      trainingEnd: '2027-02',
      housing: 'rent',
      maritalStatus: 'single',
      children: 0,
      netIncome: 1050,
      riskProfile: 'balanced',
      healthCheckDone: true,
      consents: {
        dataStorage: consent('2023-08-21'),
        marketing: consent('2023-08-21'),
        contactChannel: { channel: 'whatsapp', date: '2023-08-21' },
      },
      contracts: {
        bu: 'concluded',
        liability: 'viaParents',
        car: 'concluded',
        accident: 'offered',
        investmentPension: 'no',
        occupationalPension: 'open',
        capitalFormation: 'concluded',
        fundSavings: 'no',
        household: 'open',
      },
      potential: 'medium',
      tags: ['Azubi', 'Motocross'],
      openPoints: ['Haftpflicht der Eltern: Gilt sie nach dem Auszug weiter? (prüfen)'],
    },
    lifeEvents: [
      { kind: 'move', date: '2026-09', note: 'Eigene Mietwohnung' },
      { kind: 'trainingEnd', date: '2027-02' },
    ],
    reminders: [
      {
        dueDate: '2027-09-05',
        kind: 'annualReview',
        title: 'Jahresgespräch',
        todo: 'Verträge nach Übernahme prüfen',
      },
    ],
    conversations: [
      {
        date: '2026-09-05',
        title: 'Umzug',
        notes:
          'Umzug in die eigene Wohnung besprochen, Unfallversicherung angeboten (Motocross-Ausschluss prüfen).',
      },
    ],
    changes: [
      {
        date: '2026-09-05',
        changes: [
          { path: 'contracts.accident', from: 'open', to: 'offered' },
          { path: 'housing', from: 'parents', to: 'rent' },
          { path: 'lifePhase', from: 'training', to: 'movingOut' },
        ],
      },
    ],
  },
  {
    key: 'k09',
    since: '2018-05-07',
    customer: {
      firstName: 'Ilka',
      lastName: 'Brandt',
      email: 'ilka.brandt@example.com',
      birthDate: '1983-10-03',
      lifePhase: 'family',
      occupation: 'Teamleiterin Logistik',
      employment: 'employee',
      employerVl: true,
      employerBav: true,
      housing: 'owned',
      maritalStatus: 'married',
      children: 2,
      netIncome: 3400,
      riskProfile: 'balanced',
      healthCheckDone: true,
      consents: {
        dataStorage: consent('2018-05-07'),
        marketing: consent('2018-05-07'),
        contactChannel: { channel: 'email', date: '2018-05-07' },
      },
      contracts: {
        bu: 'concluded',
        liability: 'concluded',
        car: 'concluded',
        accident: 'concluded',
        investmentPension: 'concluded',
        occupationalPension: 'concluded',
        capitalFormation: 'concluded',
        fundSavings: 'concluded',
        household: 'concluded',
      },
      potential: 'low',
      tags: ['Familie'],
      openPoints: [],
    },
    lifeEvents: [],
    reminders: [
      {
        dueDate: '2026-09-20',
        kind: 'annualReview',
        title: 'Jahresgespräch',
        todo: 'Fakten aktualisieren, Summen prüfen, Kinder ansprechen',
      },
    ],
    conversations: [
      {
        date: '2025-09-20',
        title: 'Jahresgespräch',
        notes: [
          'Besprochen:',
          '- Keine Veränderungen, alle Verträge aktuell.',
          '',
          'Ergebnisse:',
          '- Keine neuen Abschlüsse.',
          '',
          'Nächste Schritte:',
          '- Jahresgespräch in einem Jahr.',
        ].join('\n'),
      },
    ],
    changes: [],
  },
  {
    key: 'k10',
    since: '2026-05-02',
    customer: {
      firstName: 'Jonas',
      email: 'jonas@example.com',
      birthDate: '2001-01-19',
      lifePhase: 'studies',
      occupation: 'Masterstudent Maschinenbau (Werkstudent)',
      trainingStart: '2020-10',
      trainingEnd: '2027-03',
      housing: 'sharedFlat',
      maritalStatus: 'partnership',
      children: 0,
      netIncome: 900,
      healthCheckDone: false,
      consents: {
        dataStorage: consent('2026-05-02'),
        contactChannel: { channel: 'email', date: '2026-05-02' },
      },
      contracts: {
        bu: 'open',
        liability: 'concluded',
        car: 'notRelevant',
        accident: 'no',
        investmentPension: 'no',
        occupationalPension: 'notRelevant',
        capitalFormation: 'notRelevant',
        fundSavings: 'concluded',
        household: 'no',
      },
      potential: 'medium',
      tags: ['Studium'],
      openPoints: ['Werbeeinwilligung erfragen.', 'Risikoprofil fehlt (Fragenkatalog Punkt 7).'],
    },
    lifeEvents: [{ kind: 'trainingEnd', date: '2027-03', note: 'Studienende, Jobzusage offen' }],
    reminders: [
      {
        dueDate: '2027-05-02',
        kind: 'annualReview',
        title: 'Jahresgespräch',
        todo: 'Berufsstart nachhalten',
      },
    ],
    conversations: [
      {
        date: '2026-05-02',
        title: 'Erstgespräch',
        notes: 'Erstgespräch, Fondssparplan bestätigt. BU vor dem Berufsstart ansprechen.',
      },
    ],
    changes: [],
  },
  {
    key: 'k11',
    since: '2022-04-25',
    customer: {
      firstName: 'Kaya',
      phone: '+49 000 5550111',
      birthDate: '1999-09-02',
      lifePhase: 'partnership',
      occupation: 'Erzieherin (öffentlicher Dienst)',
      employment: 'employee',
      employerVl: true,
      employerBav: true,
      housing: 'rent',
      maritalStatus: 'partnership',
      children: 0,
      netIncome: 2100,
      riskProfile: 'conservative',
      healthCheckDone: true,
      consents: {
        dataStorage: consent('2022-04-25'),
        marketing: consent('2022-04-25'),
        contactChannel: { channel: 'whatsapp', date: '2022-04-25' },
      },
      contracts: {
        bu: 'concluded',
        liability: 'concluded',
        car: 'notRelevant',
        accident: 'no',
        investmentPension: 'no',
        occupationalPension: 'concluded',
        capitalFormation: 'offered',
        fundSavings: 'no',
        household: 'concluded',
      },
      potential: 'medium',
      tags: ['Öffentlicher Dienst'],
      openPoints: [
        'Rückmeldung zum VL-Angebot.',
        'Wohnfläche der neuen Wohnung für den Hausrat (prüfen).',
      ],
    },
    lifeEvents: [
      { kind: 'move', date: '2026-07', note: 'Gemeinsame Wohnung mit Partner' },
      { kind: 'marriage', date: '2027-05' },
    ],
    reminders: [
      {
        dueDate: '2027-02-01',
        kind: 'lifeEvent',
        title: 'Heirat',
        todo: 'Haftpflicht/Hausrat zusammenlegen, BU-Nachversicherung (Heirat), Begünstigte prüfen',
      },
      {
        dueDate: '2027-07-20',
        kind: 'annualReview',
        title: 'Jahresgespräch',
        todo: 'Verträge nach Heirat prüfen',
      },
    ],
    conversations: [
      {
        date: '2026-07-20',
        title: 'Umzug',
        notes: 'Umzug mit Partner besprochen, VL angeboten (Arbeitgeber zahlt – Höhe prüfen).',
      },
    ],
    changes: [
      {
        date: '2026-07-20',
        changes: [
          { path: 'contracts.capitalFormation', from: 'open', to: 'offered' },
          { path: 'lifePhase', from: 'careerStart', to: 'partnership' },
          { path: 'maritalStatus', from: 'single', to: 'partnership' },
        ],
      },
    ],
  },
  {
    key: 'k12',
    since: '2019-02-11',
    customer: {
      firstName: 'Lars',
      lastName: 'Feldmann',
      phone: '+49 000 5550112',
      birthDate: '1972-11-24',
      lifePhase: 'retirement',
      occupation: 'Selbständiger Tischlermeister (Betrieb mit 4 Mitarbeitenden)',
      employment: 'selfEmployed',
      housing: 'owned',
      maritalStatus: 'married',
      children: 2,
      netIncome: 4200,
      riskProfile: 'balanced',
      healthCheckDone: false,
      consents: {
        dataStorage: consent('2019-02-11'),
        marketing: consent('2019-02-11'),
        contactChannel: { channel: 'phone', date: '2019-02-11' },
      },
      contracts: {
        bu: 'declined',
        liability: 'concluded',
        car: 'concluded',
        accident: 'concluded',
        investmentPension: 'offered',
        occupationalPension: 'notRelevant',
        capitalFormation: 'notRelevant',
        fundSavings: 'concluded',
        household: 'concluded',
      },
      potential: 'high',
      tags: ['Selbständig', 'Betriebsinhaber'],
      openPoints: ['Renteninformation liegt nicht vor.'],
    },
    lifeEvents: [],
    reminders: [
      {
        dueDate: '2026-11-30',
        kind: 'manual',
        title: 'Jahresende',
        todo: 'Basisrente: Entscheidung vor Jahresende, steuerliche Wirkung mit Steuerberater prüfen',
      },
      {
        dueDate: '2027-02-14',
        kind: 'annualReview',
        title: 'Jahresgespräch',
        todo: 'Rentenlücke mit Renteninformation berechnen',
      },
    ],
    conversations: [
      {
        date: '2026-02-14',
        title: 'Jahresgespräch',
        notes:
          'Jahresgespräch, Basisrente angeboten (steuerliche Wirkung prüfen). Ruhestand ab ca. 2039 geplant.',
      },
    ],
    changes: [
      {
        date: '2026-02-14',
        changes: [{ path: 'contracts.investmentPension', from: 'open', to: 'offered' }],
      },
    ],
  },
];
