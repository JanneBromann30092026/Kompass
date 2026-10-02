/**
 * Text building blocks for the reasons of the need engine (src/core/needs). Domain
 * content, therefore data and not UI texts. Tax and legal points always say "prüfen".
 */
import { formatCalendarDate } from '@/core/format';
import type { NeedReason, ReasonCode } from '@/core/needs/types';
import { LIFE_EVENT_INFO } from './lifeEvents';

const eventName = (r: NeedReason) => (r.event ? LIFE_EVENT_INFO[r.event].name : 'Anlass');
const dated = (r: NeedReason) => (r.date ? ` (${formatCalendarDate(r.date)})` : '');
const eventAt = (r: NeedReason) => `${eventName(r)}${dated(r)}`;
/** Inside parentheses: "Ausbildungsende 01/2027". */
const eventPlain = (r: NeedReason) =>
  r.date ? `${eventName(r)} ${formatCalendarDate(r.date)}` : eventName(r);

export const NEED_REASON_TEXTS: Readonly<Record<ReasonCode, (reason: NeedReason) => string>> = {
  planned: () => 'Bereits geplant – Termin für den Abschluss vereinbaren.',
  offered: () => 'Angebot liegt vor – Entscheidung herbeiführen.',
  declinedRecheck: (r) =>
    r.event
      ? `Abgelehnt – zum ${eventAt(r)} erneut ansprechen.`
      : 'Abgelehnt – bei einem neuen Anlass erneut ansprechen.',
  declinedFinal: () => 'Vom Kunden abgelehnt – nicht erneut drängen.',
  viaParents: (r) =>
    r.event === 'eighteenthBirthday'
      ? 'Läuft über die Eltern – zum 18. Geburtstag prüfen, ob die Mitversicherung endet.'
      : r.event
        ? `Läuft über die Eltern – eigene Police spätestens ab ${eventAt(r)}; Bedingungen der Eltern prüfen.`
        : 'Läuft über die Eltern – Bedingungen der Mitversicherung prüfen.',
  notRelevantNow: () =>
    'In der Akte als „nicht relevant“ markiert – erst später wieder ansprechen.',
  minorParents: () => 'Minderjährig: Beratung und Abschluss nur mit Zustimmung der Eltern.',

  buEarly: () => 'Möglichst früh abschließen: Alter und Gesundheit bestimmen Beitrag und Annahme.',
  buIncome: () => 'Das Einkommen ist die Lebensgrundlage – bei Berufsunfähigkeit fehlt es.',
  buSelfEmployed: () => 'Selbständig: keine gesetzliche Absicherung des Einkommens.',
  buCivilServant: () => 'Beamtenlaufbahn: Dienstunfähigkeitsklausel prüfen.',
  buLoan: () => 'Eigentum: Kredit und laufende Kosten laufen auch bei Berufsunfähigkeit weiter.',
  buBeforeTraining: (r) => `Vor dem ${eventAt(r)} abschließen: günstiger Einstieg als Schüler.`,
  buLater: () => 'Sinnvoll, sobald eigenes Einkommen absehbar ist (Ausbildung, Studium, Job).',
  buTooOld: () => 'Kurz vor dem Ruhestand meist unwirtschaftlich (prüfen).',
  adjustAfterEvent: (r) =>
    `${eventAt(r)}: BU-Rente über die Nachversicherungsgarantie ohne neue Gesundheitsprüfung erhöhen – Frist prüfen (oft 6 Monate).`,
  adjustUpcoming: (r) =>
    `${eventAt(r)}: dann die BU-Rente über die Nachversicherungsgarantie anpassen (Bedingungen prüfen).`,

  liabilityAlways: () =>
    'Existenziell: Ein einziger Personenschaden kann ruinieren – der Beitrag ist gering.',
  parentsLikelyCover: () =>
    'Während der ersten Ausbildung oft über die Eltern mitversichert – Bedingungen der Eltern prüfen.',
  mergeAfterMarriage: (r) =>
    `${eventAt(r)}: Verträge zusammenlegen (Paar- bzw. Familientarif) und doppelte Beiträge sparen.`,

  carLicenseUpcoming: (r) =>
    `${eventAt(r)}: eigenes Auto oder als Fahrer im Vertrag der Eltern eintragen (SF-Regelung prüfen).`,
  carLicense: () =>
    'Führerschein vorhanden: eigenes Fahrzeug versichern oder als Fahrer bei den Eltern eintragen.',
  carNotYet: () => 'Erst mit Führerschein bzw. eigenem Fahrzeug.',
  carNoCar: () => 'Kein eigenes Fahrzeug.',
  carAsk: () => 'Führerschein und Fahrzeug erfragen.',

  accidentHobbies: () => 'Sport und Freizeit sind nicht über die Arbeit versichert.',
  accidentRiskyHobby: () => 'Riskantes Hobby: Ausschlüsse in den Bedingungen prüfen.',
  accidentAskHobbies: () => 'Bei Bedarf – Hobbys und Sport erfragen.',

  ipSelfEmployed: () =>
    'Selbständig ohne gesetzliche Rente: Basisrente als Baustein (steuerliche Wirkung prüfen).',
  ipFirstSalary: (r) =>
    r.event
      ? `Mit dem ersten vollen Gehalt nach dem ${eventAt(r)}.`
      : 'Mit dem ersten vollen Gehalt.',
  ipParentalLeave: (r) => `Wenn wieder volles Gehalt da ist (${eventPlain(r)}).`,
  ipCareerStart: () => 'Berufsstart: mit kleiner Rate und langem Horizont beginnen.',
  ipPensionGap: () => 'Rentenlücke berechnen (aktuelle Renteninformation) und dann entscheiden.',
  ipTooLate: () => 'Kurzer Anlagehorizont – Kosten und Nutzen prüfen.',
  reservesFirst: () => 'Erst eine Rücklage (Notgroschen) aufbauen.',

  bavEmployerPays: () =>
    'Arbeitgeber gibt einen Zuschuss – Höhe sowie Steuer- und Sozialversicherungswirkung prüfen.',
  bavNoSubsidy: () => 'Kein Arbeitgeberzuschuss bekannt – Tarifvertrag prüfen.',
  bavAskEmployer: () => 'Beim Arbeitgeber erfragen, ob es eine bAV mit Zuschuss gibt (prüfen).',
  bavTakeover: (r) =>
    r.event
      ? `Bei der Übernahme bzw. beim neuen Arbeitgeber klären (${eventPlain(r)}).`
      : 'Bei der Übernahme bzw. beim neuen Arbeitgeber klären.',
  bavSelfEmployed: () => 'Selbständig – keine bAV.',
  bavCivilServant: () =>
    'Beamtenlaufbahn bzw. Zusatzversorgung im öffentlichen Dienst – eigene Regeln, prüfen.',
  bavNoEmployer: () => 'Noch bzw. nicht mehr bei einem Arbeitgeber.',
  parentalLeave: (r) => `Nach der Elternzeit klären (${eventPlain(r)}).`,

  vlEmployerPays: () => 'Arbeitgeber zahlt VL – ohne Vertrag verfällt das Geld.',
  vlAskEmployer: () => 'Prüfen, ob der Arbeitgeber VL zahlt – sonst wird Geld verschenkt.',
  vlNoVl: () => 'Arbeitgeber zahlt keine VL.',
  vlSelfEmployed: () => 'Selbständig – keine VL.',
  vlCivilServant: () => 'Beamtenlaufbahn – eigene Regeln, prüfen.',
  vlTrainingStart: (r) => `Ab dem ${eventAt(r)} (erstes Gehalt).`,
  vlNewEmployer: (r) =>
    r.event
      ? `Beim neuen Arbeitgeber erfragen (${eventPlain(r)}).`
      : 'Beim neuen Arbeitgeber erfragen.',
  vlNoEmployer: () => 'Noch kein Arbeitgeber.',

  fundWithVl: () => 'Als VL-Fondssparplan kombinieren.',
  fundChildDepot: () => 'Kinderdepot mit kleiner Rate.',
  fundFirstSalary: (r) =>
    r.event ? `Ab dem ${eventAt(r)} mit kleiner Rate.` : 'Mit dem ersten Gehalt, kleine Rate.',
  fundWealth: () => 'Wenn eine Rücklage da ist und monatlich etwas frei bleibt.',

  householdParents: () => 'Wohnt bei den Eltern – erst mit eigener Wohnung.',
  householdSharedFlat: () =>
    'WG bzw. Studentenwohnung: oft über die Außenversicherung der Eltern – Bedingungen prüfen.',
  householdOwnFlat: () => 'Eigene Wohnung mit eigenem Hausrat.',
  householdAsk: () => 'Wohnsituation erfragen.',
  householdAdjustMove: (r) =>
    `${eventAt(r)}: Wohnfläche und Versicherungssumme prüfen (Unterversicherung vermeiden).`,
  recentMove: (r) => `${eventAt(r)}: guter Zeitpunkt, den Hausrat zu versichern.`,
};

export function reasonText(reason: NeedReason): string {
  return NEED_REASON_TEXTS[reason.code](reason);
}
