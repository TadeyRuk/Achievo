import { useEffect, useState } from 'react';
import type { RewardHistoryItem } from '@achievo/shared';
import {
  ProgressionAgent,
  buildProgressionViewModel,
  getIdentityId,
  type ProgressionViewModel,
  type StoredProgression,
} from '../../shared/lib';

function progressionStorageKey(): string {
  const id = getIdentityId();
  return id ? `achievo_progression:${id}` : 'achievo_progression';
}

function loadStoredProgression(): StoredProgression {
  try {
    const saved = localStorage.getItem(progressionStorageKey());
    return saved ? (JSON.parse(saved) as StoredProgression) : {};
  } catch {
    return {};
  }
}

export type { ProgressionViewModel };

export function useProgression(history: RewardHistoryItem[]): ProgressionViewModel {
  const [stored, setStored] = useState<StoredProgression>(loadStoredProgression);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStored((prev) => {
      const { storedNext } = ProgressionAgent.reconcile(history, prev);
      try {
        localStorage.setItem(progressionStorageKey(), JSON.stringify(storedNext));
      } catch { /* ignore */ }
      return storedNext;
    });
  }, [history]);

  return buildProgressionViewModel(history, stored);
}
