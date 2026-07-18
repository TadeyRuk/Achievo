// This project is dedicated for Belle 🤍
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { RewardHistoryItem } from '@achievo/shared';
import { ApiError, type HealthApiSuccess } from '@achievo/sdk';
import { iosContentScale } from '../shared/lib/sheetMotion';
import { achievoClient } from '../shared/api/achievoClient';
import { getUserName, hasUserName } from '../features/profile/userIdentity';
import { useOnboarding } from '../features/onboarding/useOnboarding';
import { useWalletSession } from '../hooks/useWalletSession';
import { useRewardHistory } from '../hooks/useRewardHistory';
import { useProgression } from '../hooks/useProgression';
import { useRewardPipeline } from '../hooks/useRewardPipeline';
import type { FeedbackPrompt } from '../features/feedback/transactionFeedback';
import { AppShell, type Tab } from './AppShell';

/** Dev-only: ?preview=feedback opens the post-payout feedback sheet with mock data. */
function devFeedbackPreview(): FeedbackPrompt | null {
  if (!import.meta.env.DEV) return null;
  if (new URLSearchParams(window.location.search).get('preview') !== 'feedback') return null;
  return {
    txHash: 'b'.repeat(64),
    reward: 12.5,
    activity: 'Completed math homework',
  };
}

export default function App() {
  const devPreview = devFeedbackPreview();
  const [showSplash, setShowSplash] = useState<boolean>(() => !devPreview);
  const [showLogin, setShowLogin] = useState<boolean>(() => !hasUserName());
  const [userName, setUserNameState] = useState<string>(() => getUserName() ?? '');
  const [tab, setTab] = useState<Tab>('home');
  const [userAvatar, setUserAvatar] = useState<string>(
    () => localStorage.getItem('achievo_user_avatar') || '/xander_avatar.webp',
  );
  const [activityText, setActivityText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showRefer, setShowRefer] = useState(false);
  const [showConnectSuccess, setShowConnectSuccess] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showDisconnectSuccess, setShowDisconnectSuccess] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [rewardsPaused, setRewardsPaused] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const phoneFrameRef = useRef<HTMLDivElement>(null);

  const wallet = useWalletSession();
  const { history, historyError, prependLocal, syncFromChain } = useRewardHistory(
    wallet.walletAddress,
  );
  const progression = useProgression(history);

  const pipeline = useRewardPipeline({
    walletAddress: wallet.walletAddress,
    walletId: wallet.walletId,
    activityText,
    setActivityText,
    onPayout: (item: RewardHistoryItem) => {
      prependLocal(item);
      void syncFromChain();
    },
    fetchBalance: wallet.fetchBalance,
    loadTreasury: wallet.loadTreasury,
  });

  useEffect(() => {
    if (devPreview) {
      pipeline.setFeedbackPrompt(devPreview);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAvatarChange = (newAvatar: string) => {
    setUserAvatar(newAvatar);
    localStorage.setItem('achievo_user_avatar', newAvatar);
  };

  const shellReady = !showSplash && !showLogin;
  const onboarding = useOnboarding({
    ready: shellReady,
    setTab: (t) => {
      setShowRefer(false);
      setShowForm(false);
      setTab(t);
    },
  });

  useEffect(() => {
    if (pipeline.isRunning && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [pipeline.logs, pipeline.isRunning]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [tab, showForm]);

  useEffect(() => {
    if (!wallet.walletAddress) {
      // Reset submission UI when the wallet disconnects.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActivityText('');
      setShowForm(false);
      pipeline.resetPipeline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.walletAddress]);

  const sheetOpen = Boolean(showInfo || showFeedback || pipeline.feedbackPrompt);
  const reduceMotion = useReducedMotion();
  const contentFrameMotion = reduceMotion
    ? { scale: 1, borderRadius: 0 }
    : {
        scale: sheetOpen ? iosContentScale : 1,
        borderRadius: sheetOpen ? 28 : 0,
      };

  const statusBanner =
    wallet.walletError || wallet.treasuryError || historyError || pipeline.pipelineError;

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      try {
        const data = await achievoClient.getHealth();
        if (!cancelled) setRewardsPaused(Boolean(data.rewardsPaused));
      } catch (error) {
        if (cancelled) return;
        const data = error instanceof ApiError ? error.body as Partial<HealthApiSuccess> : undefined;
        setRewardsPaused(Boolean(data?.rewardsPaused));
      }
    };
    void probe();
    const id = window.setInterval(probe, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <AppShell
      showSplash={showSplash}
      setShowSplash={setShowSplash}
      showLogin={showLogin}
      setShowLogin={setShowLogin}
      userName={userName}
      setUserNameState={setUserNameState}
      tab={tab}
      setTab={setTab}
      userAvatar={userAvatar}
      handleAvatarChange={handleAvatarChange}
      activityText={activityText}
      setActivityText={setActivityText}
      showForm={showForm}
      setShowForm={setShowForm}
      showRefer={showRefer}
      setShowRefer={setShowRefer}
      showConnectSuccess={showConnectSuccess}
      setShowConnectSuccess={setShowConnectSuccess}
      showDisconnectConfirm={showDisconnectConfirm}
      setShowDisconnectConfirm={setShowDisconnectConfirm}
      showDisconnectSuccess={showDisconnectSuccess}
      setShowDisconnectSuccess={setShowDisconnectSuccess}
      showInfo={showInfo}
      setShowInfo={setShowInfo}
      showFeedback={showFeedback}
      setShowFeedback={setShowFeedback}
      scrollContainerRef={scrollContainerRef}
      phoneFrameRef={phoneFrameRef}
      wallet={wallet}
      history={history}
      progression={progression}
      pipeline={pipeline}
      onboarding={onboarding}
      shellReady={shellReady}
      contentFrameMotion={contentFrameMotion}
      reduceMotion={reduceMotion}
      statusBanner={statusBanner}
      rewardsPaused={rewardsPaused}
    />
  );
}
