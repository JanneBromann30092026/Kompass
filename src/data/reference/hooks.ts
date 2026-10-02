/**
 * Conversation hooks: casual openers in du-form, matched to needs, life events and life
 * phases (selection in src/core/needs/hooks.ts). Source: the "Gesprächsaufhänger" of the
 * test customers in the Kunden-Wissensdatenbank, generalised. Tax points say "prüfen".
 */
import type { HookTemplate } from '@/core/needs/hooks';

export const HOOK_TEMPLATES: readonly HookTemplate[] = [
  // --- BU ---------------------------------------------------------------------------
  {
    id: 'bu-adjust-salary',
    when: {
      type: 'need',
      line: 'bu',
      groups: ['now'],
      reason: 'adjustAfterEvent',
      reasonEvent: 'salaryIncrease',
    },
    text: 'Neues Gehalt seit {month} – deine BU deckt noch das alte Niveau. Die Erhöhung geht ohne Gesundheitsfragen, aber nur befristet.',
  },
  {
    id: 'bu-adjust',
    when: { type: 'need', line: 'bu', groups: ['now'], reason: 'adjustAfterEvent' },
    text: 'Seit {month} hat sich bei dir einiges getan – deine BU-Rente können wir jetzt ohne neue Gesundheitsfragen erhöhen (Frist beachten).',
  },
  {
    id: 'bu-adjust-upcoming',
    when: { type: 'need', line: 'bu', groups: ['later'], reason: 'adjustUpcoming' },
    text: 'Zum Ereignis „{event}“ im {month} können wir deine BU ohne neue Gesundheitsfragen erhöhen – das nehmen wir dann gleich mit.',
  },
  {
    id: 'bu-offered',
    when: { type: 'need', line: 'bu', groups: ['now'], reason: 'offered' },
    text: 'Die BU liegt noch als Angebot da – jetzt ist der beste Zeitpunkt, sie fertig zu machen.',
  },
  {
    id: 'bu-before-training',
    when: { type: 'need', line: 'bu', groups: ['now'], reason: 'buBeforeTraining' },
    text: 'Ausbildung zugesagt – Glückwunsch! Mit einer BU noch vor dem Start bist du besonders günstig dabei.',
  },
  {
    id: 'bu-self-employed',
    when: { type: 'need', line: 'bu', groups: ['now'], reason: 'buSelfEmployed' },
    text: 'Wenn du ein halbes Jahr ausfällst – wer zahlt dann deine Rechnungen?',
  },
  {
    id: 'bu-loan',
    when: { type: 'need', line: 'bu', groups: ['now'], reason: 'buLoan' },
    text: 'Die Rate für die Wohnung läuft weiter, auch wenn du länger krank bist – lass uns dein Einkommen absichern.',
  },
  {
    id: 'bu-civil-servant',
    when: { type: 'need', line: 'bu', groups: ['now'], reason: 'buCivilServant' },
    text: 'Für die Beamtenlaufbahn brauchst du eine BU mit Dienstunfähigkeitsklausel – am besten noch vor der Verbeamtung.',
  },
  {
    id: 'bu-early',
    when: { type: 'need', line: 'bu', groups: ['now'], reason: 'buEarly' },
    text: 'Jetzt mit {age} ist der beste Zeitpunkt für die BU – jung und gesund heißt günstig und unkompliziert.',
  },
  {
    id: 'bu-income',
    when: { type: 'need', line: 'bu', groups: ['now'] },
    text: 'Was passiert mit deinem Einkommen, wenn du deinen Beruf länger nicht ausüben kannst?',
  },
  {
    id: 'bu-declined-recheck',
    when: {
      type: 'need',
      line: 'bu',
      groups: ['later'],
      reason: 'declinedRecheck',
      reasonEvent: 'parentalLeaveEnd',
    },
    text: 'Vor dem Wiedereinstieg schauen wir einmal, ob die BU jetzt ins Budget passt.',
  },

  // --- VL, fund savings, bAV, investment pension -----------------------------------------
  {
    id: 'vl-employer-pays',
    when: { type: 'need', line: 'capitalFormation', groups: ['now'], reason: 'vlEmployerPays' },
    text: 'Dein Arbeitgeber zahlt VL – hast du die schon? Sonst lässt du jeden Monat Geld liegen.',
  },
  {
    id: 'vl-ask',
    when: { type: 'need', line: 'capitalFormation', groups: ['now'], reason: 'vlAskEmployer' },
    text: 'Zahlt dein Arbeitgeber VL? Dann lohnt sich ein Sparvertrag sofort – sonst verschenkst du Geld.',
  },
  {
    id: 'vl-offered',
    when: { type: 'need', line: 'capitalFormation', groups: ['now'], reason: 'offered' },
    text: 'Mit dem VL-Angebot sicherst du dir das Geld vom Arbeitgeber ab dem nächsten Monat.',
  },
  {
    id: 'fund-child',
    when: { type: 'need', line: 'fundSavings', groups: ['now'], reason: 'fundChildDepot' },
    text: 'Für euer Kind schon mit 25 € im Monat anfangen – bis zum 18. kommt einiges zusammen.',
  },
  {
    id: 'fund-vl',
    when: { type: 'need', line: 'fundSavings', groups: ['now'], reason: 'fundWithVl' },
    text: 'Die VL vom Arbeitgeber passen gut in einen Fondssparplan – so arbeitet das Geld für dich weiter.',
  },
  {
    id: 'bav-employer-pays',
    when: { type: 'need', line: 'occupationalPension', groups: ['now'], reason: 'bavEmployerPays' },
    text: 'Dein Arbeitgeber legt bei der bAV etwas drauf – das holen wir ab.',
  },
  {
    id: 'ip-self-employed',
    when: { type: 'need', line: 'investmentPension', groups: ['now'], reason: 'ipSelfEmployed' },
    text: 'Ohne gesetzliche Rente brauchst du einen eigenen Baustein fürs Alter – die Basisrente kann auch steuerlich interessant sein (mit der Steuerberatung prüfen).',
  },
  {
    id: 'ip-career-start',
    when: { type: 'need', line: 'investmentPension', groups: ['now'], reason: 'ipCareerStart' },
    text: 'Mit dem ersten richtigen Gehalt ist der beste Moment, klein mit der Altersvorsorge anzufangen.',
  },
  {
    id: 'ip-pending',
    when: { type: 'need', line: 'investmentPension', groups: ['now'], kinds: ['pending'] },
    text: 'Das Angebot für deine Altersvorsorge liegt bereit – lass uns kurz schauen, ob die Rate noch passt.',
  },

  // --- Accident, liability, car, household ------------------------------------------------
  {
    id: 'accident-risky',
    when: { type: 'need', line: 'accident', groups: ['now'], reason: 'accidentRiskyHobby' },
    text: 'Dein Hobby ist super, aber nicht jede Unfallversicherung zahlt da – lass uns das Kleingedruckte checken.',
  },
  {
    id: 'accident-hobbies',
    when: { type: 'need', line: 'accident', groups: ['now'], reason: 'accidentHobbies' },
    text: 'Beim Sport und in der Freizeit bist du nicht über die Arbeit versichert – lass uns über eine Unfallversicherung sprechen.',
  },
  {
    id: 'accident-pending',
    when: { type: 'need', line: 'accident', groups: ['now'], kinds: ['pending'] },
    text: 'Nach Feierabend bist du nicht über die Arbeit versichert – lass uns die Unfallversicherung fertig machen.',
  },
  {
    id: 'liability-merge',
    when: { type: 'need', line: 'liability', reason: 'mergeAfterMarriage' },
    text: 'Hochzeit im {month}: Haftpflicht und Hausrat könnt ihr dann zusammenlegen und sparen.',
  },
  {
    id: 'liability-parents',
    when: {
      type: 'need',
      line: 'liability',
      groups: ['later'],
      reason: 'viaParents',
      reasonEvent: 'trainingEnd',
    },
    text: 'Nach der Ausbildung endet meistens die Haftpflicht über deine Eltern – das klären wir rechtzeitig.',
  },
  {
    id: 'liability-now',
    when: { type: 'need', line: 'liability', groups: ['now'] },
    text: 'Ein einziger Schaden an anderen kann richtig teuer werden – ist deine Haftpflicht schon geregelt?',
  },
  {
    id: 'car-license-upcoming',
    when: { type: 'need', line: 'car', groups: ['later'], reason: 'carLicenseUpcoming' },
    text: 'Führerschein im {month} – soll das Auto auf dich laufen oder bei deinen Eltern mit drauf?',
  },
  {
    id: 'car-license',
    when: { type: 'need', line: 'car', groups: ['now'], reason: 'carLicense' },
    text: 'Du hast den Führerschein – fährst du bei deinen Eltern mit oder brauchst du einen eigenen Vertrag?',
  },
  {
    id: 'household-adjust',
    when: { type: 'need', line: 'household', groups: ['now'], reason: 'householdAdjustMove' },
    text: 'Neue Wohnung: Stimmt die Wohnfläche in der Hausrat noch? Sonst droht Unterversicherung.',
  },
  {
    id: 'household-own-flat',
    when: { type: 'need', line: 'household', groups: ['now'], reason: 'householdOwnFlat' },
    text: 'Eigene Wohnung – Glückwunsch! Sind deine Sachen schon gegen Einbruch und Wasserschaden versichert?',
  },

  // --- Life events -------------------------------------------------------------------
  {
    id: 'event-training-end',
    when: { type: 'event', event: 'trainingEnd', window: 'upcoming' },
    text: 'In {months} Monaten bist du fertig – weißt du schon, ob du übernommen wirst? Dann lohnt sich ein Blick aufs neue Gehalt.',
  },
  {
    id: 'event-18',
    when: { type: 'event', event: 'eighteenthBirthday', window: 'upcoming' },
    text: 'Mit 18 laufen deine Verträge auf dich – das gehen wir dann einmal zusammen durch.',
  },
  {
    id: 'event-training-start',
    when: { type: 'event', event: 'trainingStart', window: 'upcoming' },
    text: 'Ab dem ersten Ausbildungsgehalt: Frag gleich im Betrieb nach VL.',
  },
  {
    id: 'event-parental-leave',
    when: { type: 'event', event: 'parentalLeaveEnd', window: 'upcoming' },
    text: 'Wenn du im {month} wieder einsteigst, schauen wir gemeinsam, was sich bei Budget und Verträgen ändert.',
  },
  {
    id: 'event-salary',
    when: { type: 'event', event: 'salaryIncrease', window: 'recent' },
    text: 'Glückwunsch zum neuen Gehalt! Passt deine Sparrate noch zu deinem Einkommen?',
  },
  {
    id: 'event-child',
    when: { type: 'event', event: 'childBirth', window: 'recent' },
    text: 'Glückwunsch zum Nachwuchs! Jetzt lohnt sich ein Blick auf Absicherung und Sparen für die Familie.',
  },
  {
    id: 'event-property',
    when: { type: 'event', event: 'propertyPurchase', window: 'upcoming' },
    text: 'Mit der eigenen Immobilie ändert sich viel – lass uns BU, Hausrat und Haftpflicht darauf abstimmen.',
  },
  {
    id: 'event-move',
    when: { type: 'event', event: 'move', window: 'upcoming' },
    text: 'Du ziehst im {month} um – denk an Hausrat und Haftpflicht für die neue Wohnung.',
  },
  {
    id: 'event-job-change',
    when: { type: 'event', event: 'jobChange', window: 'upcoming' },
    text: 'Neuer Job im {month} – frag gleich nach bAV-Zuschuss und VL, das ist Teil deines Gehalts.',
  },
  {
    id: 'event-marriage',
    when: { type: 'event', event: 'marriage', window: 'upcoming' },
    text: 'Hochzeit im {month} – Glückwunsch! Lass uns schauen, was ihr dann zusammenlegen könnt.',
  },

  // --- Life phases ---------------------------------------------------------------------
  {
    id: 'phase-retirement',
    when: { type: 'phase', phase: 'retirement' },
    text: 'Wie groß ist deine Rentenlücke? Bring die Renteninformation mit, dann rechnen wir.',
  },
  {
    id: 'phase-studies',
    when: { type: 'phase', phase: 'studies' },
    text: 'Was hast du nach dem Studium vor? Der Berufsstart ist ein guter Moment, alles neu aufzustellen.',
  },
  {
    id: 'phase-family',
    when: { type: 'phase', phase: 'family' },
    text: 'Passt eure Absicherung noch zur Familie, so wie sie heute ist?',
  },

  // --- Always ----------------------------------------------------------------------------
  {
    id: 'fallback-changes',
    when: { type: 'fallback' },
    text: 'Ein Jahr ist rum – hat sich bei dir etwas verändert (Job, Wohnung, Familie)?',
  },
  {
    id: 'fallback-sums',
    when: { type: 'fallback' },
    text: 'Passen deine Versicherungssummen noch zu heute?',
  },
  {
    id: 'fallback-plans',
    when: { type: 'fallback' },
    text: 'Was steht bei dir in den nächsten ein bis drei Jahren an – Umzug, Jobwechsel, Familie?',
  },
];
