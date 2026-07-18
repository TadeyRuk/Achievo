// This project is dedicated for Belle 🤍
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import posthog from 'posthog-js';
import { Analytics } from '@vercel/analytics/react';
import type { RewardHistoryItem } from '@achievo/shared';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { ActivityForm } from './ActivityForm';
import { PipelineVisualizer } from './PipelineVisualizer';
import { WalletProfile } from './WalletProfile';
import { RewardCard } from './RewardCard';
import { TransactionFeedback } from './TransactionFeedback';
import { RewardHistory } from './RewardHistory';
import { StudentProfile } from './StudentProfile';
import { Dashboard } from './Dashboard';
import { ReferFriend } from './ReferFriend';
import { SplashScreen } from './SplashScreen';
import { Login } from './Login';
import { GeneralFeedback } from './GeneralFeedback';
import { InfoSheet } from './InfoSheet';
import { iosContentScale, iosSpring, reducedMotionTransition } from './sheetMotion';
import { getUserName, hasUserName } from './userIdentity';
import { useOnboarding } from './onboarding/useOnboarding';
import { OnboardingWelcome } from './onboarding/OnboardingWelcome';
import { OnboardingTour } from './onboarding/OnboardingTour';
import { useWalletSession } from './hooks/useWalletSession';
import { useRewardHistory } from './hooks/useRewardHistory';
import { useProgression } from './hooks/useProgression';
import { useRewardPipeline } from './hooks/useRewardPipeline';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { FeedbackPrompt } from './transactionFeedback';

type Tab = 'home' | 'history' | 'wallet' | 'profile';

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

  return (
    <div className="min-h-[100dvh] bg-[var(--dah-surface-highest)] flex items-center justify-center">
      <div
        ref={phoneFrameRef}
        data-phone-frame
        className="relative w-full max-w-[420px] bg-[var(--dah-bg)] sm:rounded-[3rem] sm:border-[4px] sm:border-[var(--dah-primary-container)] sm:h-[880px] h-[100dvh] flex flex-col overflow-hidden sm:shadow-2xl sm:shadow-[#000666]/35"
      >
        <AnimatePresence>
          {showSplash && (
            <SplashScreen
              progress={wallet.bootstrapProgress}
              onDone={() => setShowSplash(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!showSplash && showLogin && (
            <Login
              onComplete={(name, avatar) => {
                setUserNameState(name);
                handleAvatarChange(avatar);
                setShowLogin(false);
              }}
            />
          )}
        </AnimatePresence>

        <motion.div
          className="relative flex flex-col flex-1 min-h-0 overflow-hidden origin-center"
          animate={contentFrameMotion}
          transition={reduceMotion ? reducedMotionTransition : iosSpring}
        >
          <AnimatePresence>
            {!showSplash && !showLogin && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 110, damping: 19 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60 }}
              >
                <Navbar onFeedbackClick={() => setShowFeedback(true)} />
              </motion.div>
            )}
          </AnimatePresence>

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto pt-[84px] pb-28 custom-scrollbar"
          >
            {statusBanner && !showSplash && !showLogin && (
              <div className="mx-5 mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-900">
                {statusBanner}
              </div>
            )}
            <AnimatePresence mode="wait" initial={false}>
              {!showSplash && !showLogin && tab === 'home' && (
                pipeline.isRunning ||
                pipeline.txHash ||
                pipeline.pipeline.some((step) => step.status === 'error') ? (
                  <div key="home-running" className="p-5 space-y-5">
                    <PipelineVisualizer steps={pipeline.pipeline} logs={pipeline.logs} />

                    {pipeline.txHash && !pipeline.isRunning && (
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            pipeline.resetPipeline();
                            setActivityText('');
                            setShowForm(true);
                          }}
                          className="w-full flex items-center justify-center py-4 bg-[var(--dah-primary)] hover:bg-[#061d32] text-white rounded-full font-extrabold text-[14px] font-display uppercase tracking-wider transition-all shadow-md shadow-[var(--dah-primary)]/15 active:scale-98 cursor-pointer"
                        >
                          Submit Another Activity
                        </button>
                        <button
                          onClick={() => {
                            pipeline.resetPipeline();
                            setActivityText('');
                            setShowForm(false);
                          }}
                          className="w-full flex items-center justify-center py-4 bg-[#f3f5fa] hover:bg-[#ebedf2] border border-[#e1e3e8]/40 text-[#00162b] rounded-full font-extrabold text-[14px] font-display uppercase tracking-wider transition-all active:scale-98 cursor-pointer"
                        >
                          Go to Dashboard
                        </button>
                      </div>
                    )}

                    {!pipeline.isRunning &&
                      pipeline.pipeline.some((step) => step.status === 'error') && (
                        <div className="space-y-3">
                          <button
                            onClick={() => {
                              pipeline.resetPipeline();
                              setShowForm(true);
                            }}
                            className="w-full flex items-center justify-center py-4 bg-[var(--dah-primary)] hover:bg-[#061d32] text-white rounded-full font-extrabold text-[14px] font-display uppercase tracking-wider transition-all shadow-md shadow-[var(--dah-primary)]/15 active:scale-98 cursor-pointer"
                          >
                            Back to Form
                          </button>
                          <button
                            onClick={() => {
                              pipeline.resetPipeline();
                              setShowForm(false);
                            }}
                            className="w-full flex items-center justify-center py-4 bg-[#f3f5fa] hover:bg-[#ebedf2] border border-[#e1e3e8]/40 text-[#00162b] rounded-full font-extrabold text-[14px] font-display uppercase tracking-wider transition-all active:scale-98 cursor-pointer"
                          >
                            Go to Dashboard
                          </button>
                        </div>
                      )}
                  </div>
                ) : showForm && wallet.walletAddress ? (
                  <ActivityForm
                    key="home-form"
                    text={activityText}
                    onChange={setActivityText}
                    onSubmit={pipeline.handleSubmit}
                    isWalletConnected={!!wallet.walletAddress}
                    isSubmitting={pipeline.isRunning}
                    onBack={() => setShowForm(false)}
                  />
                ) : (
                  <Dashboard
                    key="home-dashboard"
                    userName={userName}
                    history={history}
                    progression={progression}
                    walletAddress={wallet.walletAddress}
                    onSubmitActivityClick={() => {
                      if (!wallet.walletAddress) setTab('wallet');
                      else setShowForm(true);
                    }}
                    onConnectWalletClick={() => setTab('wallet')}
                    onInviteClick={() => setShowRefer(true)}
                  />
                )
              )}
              {!showSplash && !showLogin && tab === 'history' && (
                <RewardHistory
                  key="history"
                  history={history}
                  progression={progression}
                />
              )}
              {!showSplash && !showLogin && tab === 'wallet' && (
                <WalletProfile
                  key="wallet"
                  walletAddress={wallet.walletAddress}
                  walletId={wallet.walletId}
                  isFunded={wallet.isFunded}
                  treasuryInfo={wallet.treasuryInfo}
                  isConnecting={wallet.isConnecting}
                  onConnect={async (id) => {
                    const ok = await wallet.connect(id);
                    if (ok) setShowConnectSuccess(true);
                  }}
                  onDisconnect={() => setShowDisconnectConfirm(true)}
                  onFund={wallet.fund}
                  onRefresh={wallet.refresh}
                  history={history}
                />
              )}
              {!showSplash && !showLogin && tab === 'profile' && (
                <StudentProfile
                  key="profile"
                  walletAddress={wallet.walletAddress}
                  history={history}
                  progression={progression}
                  userAvatar={userAvatar}
                  onAvatarChange={handleAvatarChange}
                  userName={userName}
                  onShowInfoClick={() => setShowInfo(true)}
                  onShowTourClick={onboarding.replay}
                />
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {!showSplash && !showLogin && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 110, damping: 19 }}
                className="absolute bottom-0 left-0 right-0 z-50"
              >
                <BottomNav
                  activeTab={tab}
                  onTabChange={(t) => {
                    setShowRefer(false);
                    setTab(t);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence mode="wait">
          {shellReady && onboarding.phase === 'welcome' && (
            <OnboardingWelcome
              key="onboarding-welcome"
              onStart={onboarding.startTour}
              onSkip={onboarding.skip}
            />
          )}
          {shellReady && onboarding.phase === 'tour' && onboarding.currentStep && (
            <OnboardingTour
              key="onboarding-tour"
              containerRef={phoneFrameRef}
              step={onboarding.currentStep}
              stepIndex={onboarding.stepIndex}
              totalSteps={onboarding.totalSteps}
              isLastStep={onboarding.isLastStep}
              tabHop={onboarding.tabHop}
              onNext={onboarding.next}
              onSkip={onboarding.skip}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showRefer && (
            <div className="absolute inset-0 z-50 overflow-y-auto">
              <ReferFriend userName={userName} />
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pipeline.showRewardCard && pipeline.txHash && pipeline.rewardXlm !== null && (
            <RewardCard
              reward={pipeline.rewardXlm}
              txHash={pipeline.txHash}
              breakdown={pipeline.rewardMeta ?? undefined}
              onClose={pipeline.dismissRewardFlow}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pipeline.feedbackPrompt && (
            <TransactionFeedback
              prompt={pipeline.feedbackPrompt}
              walletAddress={wallet.walletAddress}
              onDone={(submitted, rating, hasComment) => {
                if (submitted) {
                  posthog.capture('transaction_feedback_submitted', {
                    tx_hash: pipeline.feedbackPrompt!.txHash,
                    rating,
                    has_comment: hasComment,
                  });
                } else {
                  posthog.capture('transaction_feedback_skipped', {
                    tx_hash: pipeline.feedbackPrompt!.txHash,
                  });
                }
                pipeline.finishFeedbackFlow();
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showInfo && <InfoSheet onDismiss={() => setShowInfo(false)} />}
        </AnimatePresence>

        <AnimatePresence>
          {showFeedback && (
            <GeneralFeedback userName={userName} onClose={() => setShowFeedback(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showConnectSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#00162b]/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="bg-white rounded-[32px] p-6 text-center max-w-[300px] shadow-2xl space-y-4.5 border border-slate-100"
              >
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-[20px] font-extrabold text-[#00162b] font-display">
                    Wallet Connected!
                  </h3>
                  <p className="text-[12.5px] text-[var(--dah-on-surface-variant)] leading-relaxed font-semibold">
                    Your Stellar account is linked successfully. Ready to earn XLM rewards for your
                    achievements.
                  </p>
                </div>
                <div className="bg-[var(--dah-surface-low)] py-2 px-3 rounded-full border border-[var(--dah-outline-variant)]/30 font-mono text-[11px] text-[var(--dah-on-surface-variant)]">
                  {wallet.walletAddress
                    ? `${wallet.walletAddress.slice(0, 10)}...${wallet.walletAddress.slice(-10)}`
                    : ''}
                </div>
                <button
                  onClick={() => setShowConnectSuccess(false)}
                  className="w-full py-3 bg-[var(--dah-primary)] hover:bg-[#061d32] text-white rounded-full font-extrabold text-[13px] font-display uppercase tracking-wider transition-all shadow-md active:scale-95"
                >
                  Got it
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDisconnectConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#00162b]/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="bg-white rounded-[32px] p-6 text-center max-w-[300px] shadow-2xl space-y-4.5 border border-slate-100"
              >
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500">
                  <AlertTriangle className="w-9 h-9" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-[20px] font-extrabold text-[#00162b] font-display">
                    Disconnect Wallet?
                  </h3>
                  <p className="text-[12.5px] text-[var(--dah-on-surface-variant)] leading-relaxed font-semibold">
                    Are you sure you want to disconnect your Stellar wallet? Academic reward payouts
                    will be paused.
                  </p>
                </div>
                <div className="flex flex-col space-y-2 pt-2">
                  <button
                    onClick={async () => {
                      setShowDisconnectConfirm(false);
                      await wallet.disconnect();
                      pipeline.resetPipeline();
                      setShowDisconnectSuccess(true);
                    }}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-extrabold text-[13px] font-display uppercase tracking-wider transition-all shadow-md active:scale-95"
                  >
                    Yes, Disconnect
                  </button>
                  <button
                    onClick={() => setShowDisconnectConfirm(false)}
                    className="w-full py-3 bg-[var(--dah-surface-low)] hover:bg-[var(--dah-surface-medium)] text-[var(--dah-primary)] rounded-full font-extrabold text-[13px] font-display uppercase tracking-wider transition-all border border-[var(--dah-outline-variant)]/30 active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDisconnectSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#00162b]/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="bg-white rounded-[32px] p-6 text-center max-w-[300px] shadow-2xl space-y-4.5 border border-slate-100"
              >
                <div className="w-16 h-16 bg-slate-500/10 rounded-full flex items-center justify-center mx-auto text-slate-500">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-[20px] font-extrabold text-[#00162b] font-display">
                    Wallet Disconnected
                  </h3>
                  <p className="text-[12.5px] text-[var(--dah-on-surface-variant)] leading-relaxed font-semibold">
                    Your Stellar wallet has been safely disconnected. Academic reward payouts are
                    paused until linked again.
                  </p>
                </div>
                <button
                  onClick={() => setShowDisconnectSuccess(false)}
                  className="w-full py-3 bg-[var(--dah-primary)] hover:bg-[#061d32] text-white rounded-full font-extrabold text-[13px] font-display uppercase tracking-wider transition-all shadow-md active:scale-95"
                >
                  Got it
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Analytics />
    </div>
  );
}
