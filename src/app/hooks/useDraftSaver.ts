import { useEffect, useRef } from 'react';
import { draftsRepo } from '@/data/repositories';
import type { Draft } from '@/data/schemas';

export interface DraftState {
  step: number;
  values: Record<string, unknown>;
}

/**
 * Saves a draft encrypted after every change; one write at a time, the latest state wins.
 * Returns a function that stops saving and resolves once pending writes are done (call it
 * before removing the draft, otherwise a pending write brings it back).
 */
export function useDraftSaver(
  id: string,
  kind: Draft['kind'],
  state: DraftState,
  enabled: boolean,
): () => Promise<void> {
  const chain = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef<DraftState | null>(null);
  const stopped = useRef(false);
  useEffect(() => {
    if (!enabled || stopped.current) return;
    latest.current = state;
    chain.current = chain.current.then(async () => {
      const current = latest.current;
      latest.current = null;
      if (!current || stopped.current) return;
      try {
        await draftsRepo.save(id, kind, current.step, current.values);
      } catch {
        // Locked meanwhile: the key is gone, the last saved state remains.
      }
    });
  }, [id, kind, state, enabled]);
  return () => {
    stopped.current = true;
    return chain.current;
  };
}
