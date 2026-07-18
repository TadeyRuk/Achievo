import { useCallback, useEffect, useRef, useState } from 'react';
import type { RewardHistoryItem } from '@achievo/shared';
import { getWalletRewardHistory } from '@achievo/stellar';
import { mergeChainIntoLocal } from './mergeChainIntoLocal';

function loadLocalHistory(): RewardHistoryItem[] {
  try {
    const saved = localStorage.getItem('achievo_reward_history');
    return saved ? (JSON.parse(saved) as RewardHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function persistLocal(history: RewardHistoryItem[]) {
  try {
    localStorage.setItem('achievo_reward_history', JSON.stringify(history));
  } catch { /* ignore */ }
}

export type RewardHistoryViewModel = {
  history: RewardHistoryItem[];
  historyError: string | null;
  isSyncing: boolean;
  syncFromChain: () => Promise<void>;
  prependLocal: (item: RewardHistoryItem) => void;
};

export function useRewardHistory(walletAddress: string | null): RewardHistoryViewModel {
  const [history, setHistory] = useState<RewardHistoryItem[]>(loadLocalHistory);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const syncFromChain = useCallback(async () => {
    if (!walletAddress || syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const chain = await getWalletRewardHistory(walletAddress);
      setHistory((prev) => {
        const next = mergeChainIntoLocal(prev, chain);
        persistLocal(next);
        return next;
      });
      setHistoryError(null);
    } catch (err) {
      setHistoryError((err as Error).message ?? 'Failed to sync on-chain history');
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    // Sync on wallet change / mount — async; setState happens in the promise callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void syncFromChain();
  }, [syncFromChain]);

  useEffect(() => {
    if (!walletAddress) return;
    const id = window.setInterval(() => {
      void syncFromChain();
    }, 15_000);
    const onFocus = () => {
      void syncFromChain();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [walletAddress, syncFromChain]);

  const prependLocal = useCallback((item: RewardHistoryItem) => {
    setHistory((prev) => {
      const next = [item, ...prev.filter((h) => h.txHash !== item.txHash)];
      persistLocal(next);
      return next;
    });
  }, []);

  return {
    history,
    historyError,
    isSyncing,
    syncFromChain,
    prependLocal,
  };
}
