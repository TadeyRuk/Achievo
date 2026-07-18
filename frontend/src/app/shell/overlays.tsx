import { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  trackTransactionFeedbackSkipped,
  trackTransactionFeedbackSubmitted,
} from '../../shared/analytics';
import { InfoSheet } from '../../shared/ui';
import { RewardCard } from '../../features/history';
import { TransactionFeedback, GeneralFeedback } from '../../features/feedback';
import { ReferFriend } from '../../features/profile';
import type { ShellEarn, ShellNavigation, ShellOverlays, ShellSession } from './types';

const OnboardingWelcome = lazy(() =>
  import('../../features/onboarding/lazy').then((m) => ({
    default: m.OnboardingWelcome,
  })),
);
const OnboardingTour = lazy(() =>
  import('../../features/onboarding/lazy').then((m) => ({
    default: m.OnboardingTour,
  })),
);

type ShellOverlaysLayerProps = {
  navigation: Pick<ShellNavigation, 'shellReady' | 'phoneFrameRef'>;
  session: Pick<ShellSession, 'userName' | 'wallet' | 'onboarding'>;
  earn: Pick<ShellEarn, 'pipeline'>;
  overlays: ShellOverlays;
};

export function ShellOverlaysLayer({
  navigation,
  session,
  earn,
  overlays,
}: ShellOverlaysLayerProps) {
  const { shellReady, phoneFrameRef } = navigation;
  const { userName, wallet, onboarding } = session;
  const { pipeline } = earn;
  const {
    showRefer,
    showConnectSuccess,
    setShowConnectSuccess,
    showDisconnectConfirm,
    setShowDisconnectConfirm,
    showDisconnectSuccess,
    setShowDisconnectSuccess,
    showInfo,
    setShowInfo,
    showFeedback,
    setShowFeedback,
  } = overlays;

  return (
    <>
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
                trackTransactionFeedbackSubmitted({
                  txHash: pipeline.feedbackPrompt!.txHash,
                  rating,
                  hasComment,
                });
              } else {
                trackTransactionFeedbackSkipped(pipeline.feedbackPrompt!.txHash);
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
    </>
  );
}
