import { useCallback, useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { CONTRACT_ID, getTreasuryInfo, type TreasuryInfo } from '../contract';
import {
  clearWalletSession,
  ensureWalletSession,
  fundWithFriendbot,
  getXlmBalance,
} from '../wallet';

export function useWalletSession() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(() =>
    localStorage.getItem('achievo_wallet_id'),
  );
  const [isFunded, setIsFunded] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [treasuryInfo, setTreasuryInfo] = useState<TreasuryInfo | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [treasuryError, setTreasuryError] = useState<string | null>(null);
  const [bootstrapProgress, setBootstrapProgress] = useState(0);

  const fetchBalance = useCallback(async (address: string) => {
    try {
      const { isFunded: funded } = await getXlmBalance(address);
      setIsFunded(funded);
      setWalletError(null);
    } catch (err) {
      setWalletError((err as Error).message ?? 'Failed to load balance');
    }
  }, []);

  const loadTreasury = useCallback(async () => {
    if ((CONTRACT_ID as string) === 'PLACEHOLDER_DEPLOY_AND_UPDATE') return;
    try {
      setTreasuryInfo(await getTreasuryInfo(CONTRACT_ID));
      setTreasuryError(null);
    } catch (err) {
      setTreasuryError((err as Error).message ?? 'Failed to load treasury');
    }
  }, []);

  useEffect(() => {
    setTimeout(async () => {
      setBootstrapProgress(15);
      const storedWalletId = localStorage.getItem('achievo_wallet_id');
      if (storedWalletId) {
        setBootstrapProgress(35);
        try {
          const address = await ensureWalletSession(storedWalletId);
          setWalletAddress(address);
          setWalletId(storedWalletId);
          setBootstrapProgress(65);
          await fetchBalance(address);
        } catch {
          await clearWalletSession();
          setWalletAddress(null);
          setWalletId(null);
        }
      }
      setBootstrapProgress(85);
      await loadTreasury();
      setBootstrapProgress(100);
    }, 120);
  }, [fetchBalance, loadTreasury]);

  const connect = async (id: string) => {
    setIsConnecting(true);
    setWalletError(null);
    try {
      const address = await ensureWalletSession(id);
      setWalletAddress(address);
      posthog.capture('wallet_connected', { wallet_type: id });
      setWalletId(id);
      localStorage.setItem('achievo_wallet_id', id);
      await fetchBalance(address);
      void loadTreasury();
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      if (msg && !/cancel|denied|reject/i.test(msg)) {
        setWalletError(msg);
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    await clearWalletSession();
    setWalletAddress(null);
    setWalletId(null);
    setIsFunded(true);
    setTreasuryInfo(null);
    setWalletError(null);
  };

  const fund = async () => {
    if (!walletAddress) return;
    try {
      await fundWithFriendbot(walletAddress);
      await fetchBalance(walletAddress);
      setWalletError(null);
    } catch (err) {
      setWalletError((err as Error).message ?? 'Friendbot funding failed');
    }
  };

  const refresh = async () => {
    if (walletAddress) await fetchBalance(walletAddress);
    await loadTreasury();
  };

  return {
    walletAddress,
    walletId,
    isFunded,
    isConnecting,
    treasuryInfo,
    walletError,
    treasuryError,
    bootstrapProgress,
    fetchBalance,
    loadTreasury,
    connect,
    disconnect,
    fund,
    refresh,
    setWalletError,
  };
}
