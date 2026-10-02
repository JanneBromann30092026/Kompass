import {
  Ambulance,
  Armchair,
  ArrowLeftRight,
  Baby,
  Briefcase,
  Building2,
  Cake,
  CalendarCheck,
  Car,
  ChartLine,
  Coins,
  Flag,
  Gem,
  GraduationCap,
  Hammer,
  Heart,
  Hourglass,
  House,
  KeyRound,
  PiggyBank,
  Play,
  RotateCcw,
  Scale,
  School,
  ShieldCheck,
  Sofa,
  Sprout,
  TrendingUp,
  Truck,
  Umbrella,
  type LucideIcon,
} from 'lucide-react';
import type { LifeEventKind, LifePhase, ProductLine, Topic } from '@/data/domain';
import type { KnowledgeRef } from '@/data/reference';

const PRODUCT_ICONS: Record<ProductLine, LucideIcon> = {
  bu: ShieldCheck,
  liability: Scale,
  car: Car,
  accident: Ambulance,
  investmentPension: ChartLine,
  occupationalPension: Building2,
  capitalFormation: Coins,
  fundSavings: PiggyBank,
  household: Sofa,
};

const PHASE_ICONS: Record<LifePhase, LucideIcon> = {
  school: School,
  training: Hammer,
  studies: GraduationCap,
  careerStart: Briefcase,
  movingOut: Truck,
  partnership: Heart,
  family: Baby,
  property: House,
  retirement: Armchair,
};

const EVENT_ICONS: Record<LifeEventKind, LucideIcon> = {
  trainingStart: Play,
  trainingEnd: Flag,
  eighteenthBirthday: Cake,
  driversLicense: Car,
  salaryIncrease: TrendingUp,
  jobChange: ArrowLeftRight,
  move: Truck,
  marriage: Gem,
  childBirth: Baby,
  parentalLeaveEnd: RotateCcw,
  propertyPurchase: KeyRound,
  annualReview: CalendarCheck,
};

const TOPIC_ICONS: Record<Topic, LucideIcon> = {
  incomeProtection: ShieldCheck,
  liabilityAndProperty: Umbrella,
  wealthBuilding: Sprout,
  retirementProvision: Hourglass,
};

export function knowledgeIcon(ref: KnowledgeRef): LucideIcon {
  switch (ref.kind) {
    case 'product':
      return PRODUCT_ICONS[ref.key];
    case 'phase':
      return PHASE_ICONS[ref.key];
    case 'event':
      return EVENT_ICONS[ref.key];
    case 'topic':
      return TOPIC_ICONS[ref.key];
  }
}

export function knowledgePath(ref: KnowledgeRef): string {
  return `/knowledge/${ref.kind}/${ref.key}`;
}
