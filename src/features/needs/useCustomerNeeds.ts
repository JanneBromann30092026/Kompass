import { useMemo } from 'react';
import { useToday } from '@/app/hooks/useToday';
import { needViews, type NeedView } from '@/core/needs/decisions';
import { assessNeeds } from '@/core/needs/engine';
import { needFacts, type NeedFacts } from '@/core/needs/facts';
import { selectHooks, type Hook } from '@/core/needs/hooks';
import { LIFE_EVENT_KINDS, type LifeEventKind } from '@/data/domain';
import { HOOK_TEMPLATES, LIFE_EVENT_INFO } from '@/data/reference';
import type { Customer } from '@/data/schemas';
import { useDataStore } from '@/data/store';

const EVENT_NAMES = Object.fromEntries(
  LIFE_EVENT_KINDS.map((kind) => [kind, LIFE_EVENT_INFO[kind].name]),
) as Record<LifeEventKind, string>;

export interface CustomerNeeds {
  facts: NeedFacts;
  views: NeedView[];
  hooks: Hook[];
}

/** Suggestions of the need engine merged with the decisions, plus the conversation hooks. */
export function useCustomerNeeds(customer: Customer): CustomerNeeds {
  const today = useToday();
  const lifeEvents = useDataStore((state) => state.lifeEvents);
  const needs = useDataStore((state) => state.needs);
  return useMemo(() => {
    const facts = needFacts(customer, Object.values(lifeEvents), today);
    const own = Object.values(needs).filter((need) => need.customerId === customer.id);
    const views = needViews(assessNeeds(facts), own);
    const hooks = selectHooks(facts, views, HOOK_TEMPLATES, { eventNames: EVENT_NAMES });
    return { facts, views, hooks };
  }, [customer, lifeEvents, needs, today]);
}
