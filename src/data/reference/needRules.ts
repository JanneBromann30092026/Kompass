/**
 * Need rules per product line (evaluated by the need engine in step 5). Source:
 * 05_Bedarfslogik in the Kunden-Wissensdatenbank. General rules of thumb – tax and legal
 * points are marked "prüfen" and must be checked case by case.
 */
import type { ProductLine } from '../domain';
import type { NeedRule, PriorityLevel } from './schemas';

/** Shown with every rule. */
export const RULE_DISCLAIMER =
  'Allgemeine Faustregeln, keine Beratung als Tatsache. Steuerliche und rechtliche Punkte sind mit „prüfen“ markiert und im Einzelfall zu klären.';

const SUITABILITY =
  'Geeignetheitsprüfung (Erfahrung, Risikobereitschaft, Anlagehorizont) vor jeder Empfehlung.';

export const NEED_RULES: Readonly<Record<ProductLine, NeedRule>> = {
  bu: {
    productLine: 'bu',
    priority: 1,
    usefulWhen: [
      'Eigenes Einkommen vorhanden oder absehbar (auch in Ausbildung oder Studium).',
      'Möglichst früh: Alter und Gesundheit bestimmen Beitrag und Annahme.',
      'Angehende Beamte: Dienstunfähigkeitsklausel prüfen.',
    ],
    notUsefulWhen: [
      'Kein Erwerbseinkommen geplant.',
      'Kurz vor dem Ruhestand meist unwirtschaftlich (prüfen).',
    ],
    triggers: {
      events: [
        'trainingStart',
        'trainingEnd',
        'salaryIncrease',
        'marriage',
        'childBirth',
        'propertyPurchase',
      ],
      phases: [],
    },
    triggerNote:
      'Erhöhung über die Nachversicherungsgarantie ohne neue Gesundheitsprüfung – Fristen und Grenzen im Vertrag prüfen.',
    objections: [
      {
        objection: 'Ich bin jung und gesund.',
        answer: 'Genau deshalb jetzt: günstiger Einstieg, später nachversichern.',
      },
      {
        objection: 'Zu teuer.',
        answer: 'Mit kleiner Rente starten und über die Nachversicherung erhöhen.',
      },
      {
        objection: 'Mir passiert schon nichts.',
        answer: 'Die meisten Fälle sind Krankheiten, keine Unfälle.',
      },
    ],
    notes: [
      'Gesundheitsangaben werden nie in Kompass gespeichert – nur „Gesundheitsprüfung erledigt: ja/nein“.',
    ],
  },
  liability: {
    productLine: 'liability',
    priority: 1,
    usefulWhen: [
      'Immer, sobald keine Mitversicherung über die Eltern mehr besteht.',
      'Zusammenzug oder Heirat: Paar- bzw. Familientarif.',
    ],
    notUsefulWhen: [
      'Während der ersten Ausbildung bzw. des Erststudiums sind unverheiratete Kinder oft über die Familienhaftpflicht der Eltern mitversichert (Bedingungen der Eltern prüfen: Altersgrenze, Wartezeit zwischen Ausbildungen).',
    ],
    triggers: { events: ['trainingEnd', 'marriage', 'childBirth'], phases: ['movingOut'] },
    objections: [
      {
        objection: 'Ich passe doch auf.',
        answer: 'Ein einziger Personenschaden kann existenzbedrohend sein.',
      },
      {
        objection: 'Bin über meine Eltern versichert.',
        answer: 'Stimmt oft – aber nur bis zum Ende der Erstausbildung.',
      },
    ],
    notes: [],
  },
  car: {
    productLine: 'car',
    priority: 1,
    usefulWhen: [
      'Eigenes Fahrzeug (Haftpflicht ist Pflicht).',
      'Fahranfänger: als Fahrer im Vertrag der Eltern eintragen oder Zweitwagen-/SF-Regelung prüfen.',
    ],
    notUsefulWhen: ['Kein Führerschein bzw. kein eigenes Fahrzeug.'],
    triggers: { events: ['driversLicense', 'move'], phases: [] },
    triggerNote: 'Autokauf jederzeit; ein Umzug kann die Regionalklasse ändern.',
    objections: [
      { objection: 'Ich fahre kaum.', answer: 'Kilometerleistung korrekt angeben, Tarif prüfen.' },
    ],
    notes: [],
  },
  accident: {
    productLine: 'accident',
    priority: 2,
    usefulWhen: [
      'Aktive Hobbys oder Sport, Kinder und Jugendliche.',
      'Als Ergänzung, solange keine BU besteht oder keine möglich ist.',
    ],
    notUsefulWhen: [
      'Als Ersatz für eine BU (Krankheit ist nicht versichert).',
      'Bereits über einen Familientarif der Eltern mitversichert (prüfen).',
    ],
    triggers: { events: ['eighteenthBirthday'], phases: ['movingOut'] },
    triggerNote: 'Neues riskantes Hobby jederzeit; Ausschlüsse (z. B. Motorsport) prüfen.',
    objections: [
      {
        objection: 'Ich bin über die Arbeit versichert.',
        answer: 'Nur Arbeit und Arbeitsweg, nicht die Freizeit.',
      },
      {
        objection: 'Ich habe schon eine BU.',
        answer: 'Unfall ergänzt bei Invalidität ohne Berufsunfähigkeit.',
      },
    ],
    notes: [],
  },
  investmentPension: {
    productLine: 'investmentPension',
    priority: 2,
    usefulWhen: [
      'Langfristige Altersvorsorge, Rentenlücke vorhanden.',
      'Selbständige ohne gesetzliche Rente: Basisrente (steuerliche Wirkung prüfen).',
    ],
    notUsefulWhen: [
      'Keine Rücklage (Notgroschen) oder Konsumschulden – erst das klären.',
      'Kurzer Anlagehorizont. Kosten im Vergleich zum Fondssparplan prüfen.',
    ],
    triggers: { events: ['salaryIncrease', 'annualReview'], phases: ['careerStart'] },
    triggerNote: 'Erstes Gehalt, Gehaltssprung, Selbständigkeit.',
    objections: [
      {
        objection: 'Rente ist noch weit weg.',
        answer: 'Zeit ist der wichtigste Faktor beim Sparen.',
      },
      {
        objection: 'Ich will mich nicht binden.',
        answer: 'Flexibilität (Zuzahlung, Beitragspause, Entnahme) prüfen.',
      },
    ],
    notes: [SUITABILITY],
  },
  occupationalPension: {
    productLine: 'occupationalPension',
    priority: 2,
    usefulWhen: [
      'Arbeitgeber zahlt einen Zuschuss oder der Tarifvertrag sieht eine bAV vor.',
      'Stabile Anstellung.',
    ],
    notUsefulWhen: [
      'Selbständige.',
      'Öffentlicher Dienst mit Zusatzversorgung (ZVK/VBL) – eigene Regeln, prüfen.',
    ],
    triggers: { events: ['jobChange', 'salaryIncrease', 'trainingEnd'], phases: ['careerStart'] },
    triggerNote: 'Die Übernahme nach der Ausbildung ist ein guter Zeitpunkt.',
    objections: [
      {
        objection: 'Bei einem Jobwechsel ist das Geld weg.',
        answer: 'Mitnahme bzw. Portabilität prüfen.',
      },
    ],
    notes: ['Steuer- und Sozialversicherungswirkung sowie Zuschusshöhe: prüfen.'],
  },
  capitalFormation: {
    productLine: 'capitalFormation',
    priority: 2,
    usefulWhen: [
      'Arbeitgeber zahlt VL – sonst verschenkt man Geld vom Arbeitgeber.',
      'Arbeitnehmersparzulage je nach Einkommen möglich (Grenzen prüfen).',
    ],
    notUsefulWhen: ['Selbständige; der Arbeitgeber zahlt keine VL.'],
    triggers: { events: ['trainingStart', 'jobChange'], phases: ['careerStart'] },
    triggerNote: 'Verbindung zum Fondssparplan (VL-Fondssparplan, Laufzeit meist 7 Jahre).',
    objections: [
      {
        objection: 'Sind doch nur ein paar Euro.',
        answer: 'Ohne Vertrag verfällt der Anspruch – über 7 Jahre spürbar.',
      },
    ],
    notes: [],
  },
  fundSavings: {
    productLine: 'fundSavings',
    priority: 2,
    usefulWhen: [
      'Rücklage vorhanden, monatlich etwas frei, Anlagehorizont von mehreren Jahren.',
      'Kombinierbar mit VL.',
    ],
    notUsefulWhen: ['Keine Rücklage oder Konsumschulden.', 'Das Geld wird kurzfristig gebraucht.'],
    triggers: { events: ['trainingStart', 'salaryIncrease', 'childBirth'], phases: [] },
    triggerNote: 'Erstes Gehalt, VL-Anspruch, Kinderdepot.',
    objections: [
      {
        objection: 'Börse ist mir zu riskant.',
        answer: 'Laufzeit, Streuung und kleine Raten erklären (keine Renditeversprechen).',
      },
      {
        objection: 'Mit 25 € lohnt sich das nicht.',
        answer: 'Gewohnheit aufbauen, später erhöhen.',
      },
    ],
    notes: [SUITABILITY],
  },
  household: {
    productLine: 'household',
    priority: 3,
    usefulWhen: ['Eigene Wohnung mit nennenswertem Hausrat.'],
    notUsefulWhen: [
      'Wohnen bei den Eltern.',
      'WG-Zimmer oder Studentenwohnung: oft über die Außenversicherung der Eltern (Bedingungen prüfen).',
    ],
    triggers: { events: ['move', 'marriage', 'propertyPurchase'], phases: ['movingOut'] },
    triggerNote: 'Bei einem Umzug Wohnfläche und Versicherungssumme anpassen.',
    objections: [
      {
        objection: 'Ich habe nichts Wertvolles.',
        answer: 'Den Neuwert aller Sachen grob überschlagen.',
      },
    ],
    notes: [],
  },
};

/** Source: 05_Bedarfslogik/Priorisierung. */
export const PRIORITIZATION = {
  principle: 'Echter Bedarf vor Provision. Existenz vor Vermögen vor Komfort.',
  levels: [
    {
      level: 1,
      name: 'existenziell',
      description: 'Ohne Absicherung droht der finanzielle Ruin.',
    },
    {
      level: 2,
      name: 'wichtig',
      description: 'Vorsorge, Vermögensaufbau, Arbeitgeberleistungen nicht verschenken.',
    },
    { level: 3, name: 'optional', description: 'Sachwerte und Komfort.' },
  ] satisfies PriorityLevel[],
  deviation:
    'Die Stufe gilt als Ausgangspunkt. In der Kundenakte kann sie mit Begründung abweichen (z. B. Hausrat bei hochwertiger Einrichtung).',
  potential:
    'Das Provisionspotenzial (hoch, mittel, niedrig) darf zusätzlich angezeigt werden, ersetzt aber nie den Bedarf und bestimmt nie die Reihenfolge.',
} as const;
