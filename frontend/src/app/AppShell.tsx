import {
  lazy,
  Suspense,
  type RefObject,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import posthog from 'posthog-js';
import { Analytics } from '@vercel/analytics/react';
import type { RewardHistoryItem } from '@achievo/shared';
import { Navbar } from '../shared/ui/Navbar';
import { BottomNav } from '../shared/ui/BottomNav';
import { ActivityForm } from '../features/earn/ActivityForm';
import { PipelineVisualizer } from '../features/earn/PipelineVisualizer';
import { WalletProfile } from '../features/wallet/WalletProfile';
import { RewardCard } from '../features/history/RewardCard';
import { TransactionFeedback } from '../features/feedback/TransactionFeedback';
import { RewardHistory } from '../features/history/RewardHistory';
import { StudentProfile } from '../features/profile/StudentProfile';
import { Dashboard } from '../features/dashboard/Dashboard';
import { ReferFriend } from '../features/profile/ReferFriend';
import { SplashScreen } from './SplashScreen';
import { Login } from './Login';
import { GeneralFeedback } from '../features/feedback/GeneralFeedback';
import { InfoSheet } from '../shared/ui/InfoSheet';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';
import { iosSpring, reducedMotionTransition } from '../shared/lib/sheetMotion';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

const OnboardingWelcome = lazy(() =>
  import('../features/onboarding/OnboardingWelcome').then((m) => ({
    default: m.OnboardingWelcome,
  })),
);
const OnboardingTour = lazy(() =>
  import('../features/onboarding/OnboardingTour').then((m) => ({
    default: m.OnboardingTour,
  })),
);

import type { StoredProgression } from '../shared/lib/progression';
import type { useRewardPipeline } from '../hooks/useRewardPipeline';
import type { useWalletSession } from '../hooks/useWalletSession';
import type { useOnboarding } from '../features/onboarding/useOnboarding';

export type Tab = 'home' | 'history' | 'wallet' | 'profile';

type Pipeline = ReturnType<typeof useRewardPipeline>;
type Wallet = ReturnType<typeof useWalletSession>;
type Onboarding = ReturnType<typeof useOnboarding>;

export type AppShellProps = {
  showSplash: boolean;
  setShowSplash: Dispatch<SetStateAction<boolean>>;
  showLogin: boolean;
  setShowLogin: Dispatch<SetStateAction<boolean>>;
  userName: string;
  setUserNameState: Dispatch<SetStateAction<string>>;
  tab: Tab;
  setTab: Dispatch<SetStateAction<Tab>>;
  userAvatar: string;
  handleAvatarChange: (avatar: string) => void;
  activityText: string;
  setActivityText: Dispatch<SetStateAction<string>>;
  showForm: boolean;
  setShowForm: Dispatch<SetStateAction<boolean>>;
  showRefer: boolean;
  setShowRefer: Dispatch<SetStateAction<boolean>>;
  showConnectSuccess: boolean;
  setShowConnectSuccess: Dispatch<SetStateAction<boolean>>;
  showDisconnectConfirm: boolean;
  setShowDisconnectConfirm: Dispatch<SetStateAction<boolean>>;
  showDisconnectSuccess: boolean;
  setShowDisconnectSuccess: Dispatch<SetStateAction<boolean>>;
  showInfo: boolean;
  setShowInfo: Dispatch<SetStateAction<boolean>>;
  showFeedback: boolean;
  setShowFeedback: Dispatch<SetStateAction<boolean>>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  phoneFrameRef: RefObject<HTMLDivElement | null>;
  wallet: Wallet;
  history: RewardHistoryItem[];
  progression: StoredProgression;
  pipeline: Pipeline;
  onboarding: Onboarding;
  shellReady: boolean;
  contentFrameMotion: { scale: number; borderRadius: number };
  reduceMotion: boolean | null;
  statusBanner: string | null;
  rewardsPaused?: boolean;
};

export function AppShell(props: AppShellProps) {
  const {
    showSplash, setShowSplash, showLogin, setShowLogin, userName, setUserNameState,
    tab, setTab, userAvatar, handleAvatarChange, activityText, setActivityText,
    showForm, setShowForm, showRefer, setShowRefer, showConnectSuccess, setShowConnectSuccess,
    showDisconnectConfirm, setShowDisconnectConfirm, showDisconnectSuccess, setShowDisconnectSuccess,
    showInfo, setShowInfo, showFeedback, setShowFeedback, scrollContainerRef, phoneFrameRef,
    wallet, history, progression, pipeline, onboarding, shellReady, contentFrameMotion,
    reduceMotion, statusBanner, rewardsPaused = false,
  } = props;

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
            {rewardsPaused && !showSplash && !showLogin && (
              <div className="mx-5 mb-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-900">
                Rewards temporarily paused — history and profile still work.
              </div>
            )}
            <AnimatePresence mode="wait" initial={false}>
              {!showSplash && !showLogin && tab === 'home' && (
              <ErrorBoundary name="earn">
                {pipeline.isRunning ||
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
                      if (rewardsPaused) return;
                      if (!wallet.walletAddress) setTab('wallet');
                      else setShowForm(true);
                    }}
                    onConnectWalletClick={() => setTab('wallet')}
                    onInviteClick={() => setShowRefer(true)}
                  />
                )}
              </ErrorBoundary>
              )}
              {!showSplash && !showLogin && tab === 'history' && (
                <ErrorBoundary name="history">
                  <RewardHistory
                    key="history"
                    history={history}
                    progression={progression}
                  />
                </ErrorBoundary>
              )}
              {!showSplash && !showLogin && tab === 'wallet' && (
                <ErrorBoundary name="wallet">
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
                </ErrorBoundary>
              )}
              {!showSplash && !showLogin && tab === 'profile' && (
                <ErrorBoundary name="profile">
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
                </ErrorBoundary>
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
            <Suspense fallback={null}>
              <OnboardingWelcome
                key="onboarding-welcome"
                onStart={onboarding.startTour}
                onSkip={onboarding.skip}
              />
            </Suspense>
          )}
          {shellReady && onboarding.phase === 'tour' && onboarding.currentStep && (
            <Suspense fallback={null}>
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
            </Suspense>
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
