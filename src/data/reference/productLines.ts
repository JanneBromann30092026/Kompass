/** Product lines (Sparten). Source: 02_Produkte in the Kunden-Wissensdatenbank. */
import type { ProductLine } from '../domain';
import type { ProductLineInfo } from './schemas';

export const PRODUCT_LINE_INFO: Readonly<Record<ProductLine, ProductLineInfo>> = {
  bu: {
    key: 'bu',
    name: 'BU',
    longName: 'Berufsunfähigkeitsversicherung',
    priority: 1,
    topics: ['incomeProtection'],
    description:
      'Zahlt eine monatliche Rente, wenn der Beruf aus gesundheitlichen Gründen dauerhaft (meist zu mindestens 50 %) nicht mehr ausgeübt werden kann.',
  },
  liability: {
    key: 'liability',
    name: 'Haftpflicht',
    longName: 'Privathaftpflichtversicherung',
    priority: 1,
    topics: ['liabilityAndProperty'],
    description:
      'Übernimmt Schäden, die man anderen zufügt, und wehrt unberechtigte Forderungen ab. Günstig, aber existenziell.',
  },
  car: {
    key: 'car',
    name: 'Kfz',
    longName: 'Kfz-Versicherung',
    priority: 1,
    topics: ['liabilityAndProperty'],
    description:
      'Kfz-Haftpflicht ist für jedes zugelassene Fahrzeug Pflicht; Teil- oder Vollkasko schützt das eigene Fahrzeug.',
  },
  accident: {
    key: 'accident',
    name: 'Unfall',
    longName: 'Private Unfallversicherung',
    priority: 2,
    topics: ['incomeProtection'],
    description:
      'Leistet bei dauerhafter Beeinträchtigung nach einem Unfall, rund um die Uhr. Die gesetzliche Unfallversicherung gilt nur für Arbeit, Schule und die Wege dorthin.',
  },
  investmentPension: {
    key: 'investmentPension',
    name: 'Investmentrente',
    longName: 'Fondsgebundene Rentenversicherung',
    priority: 2,
    topics: ['wealthBuilding', 'retirementProvision'],
    description:
      'Langfristige Altersvorsorge mit Fonds, am Ende lebenslange Rente oder Kapital. Varianten: privat, Basisrente (vor allem für Selbständige), als Durchführungsweg der bAV.',
  },
  occupationalPension: {
    key: 'occupationalPension',
    name: 'bAV',
    longName: 'Betriebliche Altersversorgung',
    priority: 2,
    topics: ['wealthBuilding', 'retirementProvision'],
    description:
      'Altersvorsorge über den Arbeitgeber, meist per Entgeltumwandlung, oft mit Arbeitgeberzuschuss.',
  },
  capitalFormation: {
    key: 'capitalFormation',
    name: 'VL',
    longName: 'Vermögenswirksame Leistungen',
    priority: 2,
    topics: ['wealthBuilding'],
    description:
      'Zuschuss des Arbeitgebers (je nach Tarif- oder Arbeitsvertrag) für eine vermögenswirksame Anlage, z. B. einen VL-Fondssparplan.',
  },
  fundSavings: {
    key: 'fundSavings',
    name: 'Fondssparplan',
    longName: 'Fondssparplan / ETF-Sparplan',
    priority: 2,
    topics: ['wealthBuilding'],
    description:
      'Regelmäßiges Sparen in Investmentfonds oder ETFs. Flexibel, mit Kursschwankungen.',
  },
  household: {
    key: 'household',
    name: 'Hausrat',
    longName: 'Hausratversicherung',
    priority: 3,
    topics: ['liabilityAndProperty'],
    description:
      'Ersetzt den eigenen Hausrat nach Feuer, Leitungswasser, Einbruchdiebstahl, Sturm und Hagel.',
  },
};
