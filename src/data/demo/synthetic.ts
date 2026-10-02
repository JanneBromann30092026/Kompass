/**
 * Synthetic customers for performance tests (developer mode). Plausible but random
 * combinations, deterministic for a seed. Marked as demo data with the tag "Synthetisch".
 */
import { addDays, addMonths, firstOfMonth } from '@/core/dates';
import { deterministicUuid } from '@/core/deterministicId';
import { diffRecords } from '@/core/history';
import { formatCustomerNumber } from '@/core/customerNumber';
import {
  CONTACT_CHANNELS,
  PRODUCT_LINES,
  RISK_PROFILES,
  type ContractStatus,
  type Housing,
  type LifePhase,
  type MaritalStatus,
  type ProductLine,
} from '../domain';
import type { Conversation, Customer, HistoryEntry, Reminder } from '../schemas';
import type { DemoBuild } from './buildDemo';

export const SYNTHETIC_TAG = 'Synthetisch';

const FIRST_NAMES = [
  'Alina',
  'Benedikt',
  'Carla',
  'Dennis',
  'Elif',
  'Fabian',
  'Gina',
  'Henrik',
  'Ida',
  'Jannik',
  'Kira',
  'Luca',
  'Merle',
  'Nils',
  'Olivia',
  'Paul',
  'Rieke',
  'Samuel',
  'Tara',
  'Uwe',
  'Vera',
  'Wiebke',
  'Yusuf',
  'Zoe',
  'Anton',
  'Bea',
  'Cem',
  'Dana',
  'Erik',
  'Frieda',
  'Gregor',
  'Hanna',
  'Ilias',
  'Jule',
  'Kai',
  'Lotta',
  'Moritz',
  'Nora',
  'Ole',
  'Pia',
];

const OCCUPATIONS: Record<LifePhase, string[]> = {
  school: ['Schülerin', 'Schüler'],
  training: ['Azubi Kauffrau für Büromanagement', 'Azubi Elektroniker', 'Azubi Pflegefachfrau'],
  studies: ['Studentin BWL', 'Student Informatik', 'Studentin Soziale Arbeit'],
  careerStart: ['Junior-Entwicklerin', 'Sachbearbeiter', 'Ingenieurin'],
  movingOut: ['Azubi Zimmerer', 'Verkäuferin', 'Mechatroniker'],
  partnership: ['Erzieherin', 'Projektmanager', 'Physiotherapeutin'],
  family: ['Lehrerin', 'Schichtleiter', 'Bankkaufmann'],
  property: ['Selbständiger Elektromeister', 'Teamleiterin', 'Architekt'],
  retirement: ['Selbständige Steuerberaterin', 'Meister im Ruhestand', 'Abteilungsleiter'],
};

/** Small seeded PRNG (mulberry32). */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function phaseForAge(age: number, r: () => number): LifePhase {
  if (age < 17) return 'school';
  if (age < 21) return r() < 0.7 ? 'training' : 'studies';
  if (age < 26)
    return (['studies', 'careerStart', 'movingOut'] as const)[Math.floor(r() * 3)] ?? 'careerStart';
  if (age < 32)
    return (
      (['careerStart', 'partnership', 'movingOut'] as const)[Math.floor(r() * 3)] ?? 'partnership'
    );
  if (age < 50)
    return (['family', 'property', 'partnership'] as const)[Math.floor(r() * 3)] ?? 'family';
  if (age < 60) return r() < 0.6 ? 'property' : 'family';
  return 'retirement';
}

const HOUSING: Record<LifePhase, Housing> = {
  school: 'parents',
  training: 'parents',
  studies: 'sharedFlat',
  careerStart: 'rent',
  movingOut: 'rent',
  partnership: 'rent',
  family: 'rent',
  property: 'owned',
  retirement: 'owned',
};

function contractStatus(young: boolean, r: () => number): ContractStatus {
  const roll = r();
  if (young && roll < 0.25) return 'viaParents';
  const weighted: [ContractStatus, number][] = [
    ['open', 0.3],
    ['concluded', 0.3],
    ['no', 0.1],
    ['notRelevant', 0.1],
    ['offered', 0.08],
    ['planned', 0.08],
    ['declined', 0.04],
  ];
  let sum = r();
  for (const [status, weight] of weighted) {
    sum -= weight;
    if (sum <= 0) return status;
  }
  return 'open';
}

export interface SyntheticOptions {
  today: string;
  now: string;
  /** Number of the first customer (counter value). */
  firstSequence: number;
  seed?: number;
}

/** `count` synthetic customers with a conversation, one or two reminders and history. */
export function buildSyntheticCustomers(count: number, options: SyntheticOptions): DemoBuild[] {
  const { today, now, firstSequence } = options;
  const r = random(options.seed ?? firstSequence);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(r() * list.length)] as T;
  const at = Date.parse(now) - 60_000;
  const stamp = (offsetMinutes: number) => new Date(at - offsetMinutes * 60_000).toISOString();
  const builds: DemoBuild[] = [];

  for (let index = 0; index < count; index += 1) {
    const sequence = firstSequence + index;
    const id = deterministicUuid(`kompass-synthetic:customer:${sequence}`);
    const age = 14 + Math.floor(r() * 62);
    const birthDate = addDays(today, -(age * 365 + Math.floor(r() * 360)));
    const phase = phaseForAge(age, r);
    const young = age < 25;
    const marital: MaritalStatus =
      age < 24
        ? 'single'
        : pick(['single', 'partnership', 'married', 'married', 'divorced'] as const);
    const contracts = Object.fromEntries(
      PRODUCT_LINES.map((line) => [line, contractStatus(young, r)]),
    ) as Record<ProductLine, ContractStatus>;
    const createdAt = stamp(60 * 24 * (30 + Math.floor(r() * 900)));
    const marketing = r();
    const lastConversation = addDays(today, -Math.floor(r() * 420));
    const customer: Customer = {
      id,
      number: formatCustomerNumber(sequence),
      firstName: pick(FIRST_NAMES),
      birthDate,
      lifePhase: phase,
      occupation: pick(OCCUPATIONS[phase]),
      housing: HOUSING[phase],
      maritalStatus: marital,
      children: phase === 'family' ? 1 + Math.floor(r() * 3) : 0,
      netIncome: young ? 400 + Math.floor(r() * 12) * 100 : 1500 + Math.floor(r() * 35) * 100,
      riskProfile: pick(RISK_PROFILES),
      healthCheckDone: r() < 0.5,
      consents: {
        dataStorage: { granted: true, date: createdAt.slice(0, 10) },
        ...(marketing < 0.85
          ? { marketing: { granted: marketing < 0.7, date: createdAt.slice(0, 10) } }
          : {}),
        contactChannel: { channel: pick(CONTACT_CHANNELS), date: createdAt.slice(0, 10) },
      },
      ...(age < 18 ? { parentalConsent: { granted: true, date: createdAt.slice(0, 10) } } : {}),
      contracts,
      potential: pick(['high', 'medium', 'medium', 'low'] as const),
      tags: [SYNTHETIC_TAG],
      openPoints: [],
      answers: {},
      archived: false,
      demo: true,
      createdAt,
      updatedAt: createdAt,
    };
    if (phase === 'training' || phase === 'studies') {
      customer.trainingEnd = addMonths(today, 2 + Math.floor(r() * 30)).slice(0, 7);
    }
    const linked = (kind: string, n: number) =>
      deterministicUuid(`kompass-synthetic:${kind}:${sequence}:${n}`);
    const conversation: Conversation = {
      id: linked('conversation', 0),
      customerId: id,
      date: lastConversation,
      title: 'Jahresgespräch',
      notes: 'Synthetisches Gespräch für Performance-Tests.',
      createdAt,
      updatedAt: createdAt,
    };
    const reminders: Reminder[] = [
      {
        id: linked('reminder', 0),
        customerId: id,
        dueDate: addMonths(lastConversation, 12),
        kind: 'annualReview',
        title: 'Jahresgespräch',
        dateToCheck: false,
        done: false,
        createdAt,
        updatedAt: createdAt,
      },
    ];
    if (customer.trainingEnd) {
      reminders.push({
        id: linked('reminder', 1),
        customerId: id,
        dueDate: firstOfMonth(addMonths(`${customer.trainingEnd}-01`, -3)),
        kind: 'trainingEnd',
        title: phase === 'studies' ? 'Studienende' : 'Ausbildungsende',
        dateToCheck: false,
        done: false,
        createdAt,
        updatedAt: createdAt,
      });
    }
    const history: HistoryEntry[] = [
      {
        id: linked('history', 0),
        customerId: id,
        updatedAt: createdAt,
        entity: 'customer',
        entityId: id,
        action: 'created',
        changes: diffRecords({}, customer),
      },
    ];
    builds.push({ customer, lifeEvents: [], reminders, conversations: [conversation], history });
  }
  return builds;
}

/** Default size of a synthetic batch in the developer tools. */
export const SYNTHETIC_COUNT = 500;
