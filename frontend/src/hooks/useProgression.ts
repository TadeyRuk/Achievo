import { useEffect, useState } from 'react';
import { ProgressionAgent, type StoredProgression } from '../features/earn/progression';
import type { RewardHistoryItem } from '@achievo/shared';
import { getIdentityId } from '../shared/lib/sessionIdentity';

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

export function useProgression(history: RewardHistoryItem[]) {
  const [progression, setProgression] = useState<StoredProgression>(loadStoredProgression);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgression((prev) => {
      const { storedNext } = ProgressionAgent.reconcile(history, prev);
      try {
        localStorage.setItem(progressionStorageKey(), JSON.stringify(storedNext));
      } catch { /* ignore */ }
      return storedNext;
    });
  }, [history]);

  return progression;
}
