import { useCallback, useState } from 'react';
import { activityAgent, feedbackAgent, rewardAgent } from '../features/earn/agents';
import { signChallengeXdr } from '../features/wallet/wallet';
import type { PipelineStep } from '../features/earn/PipelineVisualizer';
import type { RewardHistoryItem } from '@achievo/shared';
import { hasSubmittedFeedback, type FeedbackPrompt } from '../features/feedback/transactionFeedback';
import { trackActivitySubmitted, trackRewardPaid } from '../shared/analytics';
import { achievoClient } from '../shared/api/achievoClient';
import { persistIdentitySession } from '../shared/lib/sessionIdentity';

export function makePipeline(): PipelineStep[] {
  return [
    { name: 'Activity Agent', desc: 'Parsing your submission…', status: 'idle' },
    { name: 'Verification Agent', desc: 'Checking activity whitelist…', status: 'idle' },
    { name: 'Reward Agent', desc: 'Calculating XLM reward…', status: 'idle' },
    { name: 'Kouri Agent', desc: 'Executing on-chain transaction…', status: 'idle' },
    { name: 'Feedback Agent', desc: 'Formatting result…', status: 'idle' },
  ];
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type RewardMeta = {
  base?: number;
  bonus?: number;
  effortScore?: number;
  reason?: string;
  flagged?: boolean;
  flagReason?: string | null;
};

type Params = {
  walletAddress: string | null;
  walletId: string | null;
  activityText: string;
  setActivityText: (t: string) => void;
  onPayout: (item: RewardHistoryItem) => void;
  fetchBalance: (address: string) => Promise<void>;
  loadTreasury: () => Promise<void>;
};

export function useRewardPipeline({
  walletAddress,
  walletId,
  activityText,
  setActivityText,
  onPayout,
  fetchBalance,
  loadTreasury,
}: Params) {
  const [pipeline, setPipeline] = useState<PipelineStep[]>(makePipeline);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [rewardXlm, setRewardXlm] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [rewardMeta, setRewardMeta] = useState<RewardMeta | null>(null);
  const [showRewardCard, setShowRewardCard] = useState(false);
  const [lastPayoutActivity, setLastPayoutActivity] = useState<string | null>(null);
  const [feedbackPrompt, setFeedbackPrompt] = useState<FeedbackPrompt | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const setStep = (i: number, patch: Partial<PipelineStep>) =>
    setPipeline((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const resetPipeline = useCallback(() => {
    setPipeline(makePipeline());
    setLogs([]);
    setTxHash(null);
    setRewardXlm(null);
    setRewardMeta(null);
    setPipelineError(null);
    setLastPayoutActivity(null);
  }, []);

  const handleSubmit = async (overrideText?: string) => {
    const textToSubmit = overrideText ? overrideText.trim() : activityText.trim();
    if (!walletAddress || !textToSubmit || isRunning) return;

    trackActivitySubmitted(textToSubmit.length);

    setIsRunning(true);
    setTxHash(null);
    setRewardXlm(null);
    setPipelineError(null);
    setPipeline(makePipeline());
    setLogs(['⚙️ Booting agent pipeline…', '🤖 [Activity Agent] Initializing…']);

    try {
      setStep(0, { status: 'running' });
      await delay(400);
      const actResult = activityAgent(textToSubmit);
      const hintLabel = actResult.valid
        ? `Hint: ${actResult.activity} · up to ${actResult.maxReward} XLM`
        : 'AI will classify';
      setStep(0, { status: 'done', detail: hintLabel });
      setLogs((p) => [
        ...p,
        actResult.valid
          ? `✓ [Activity Agent] Hint: "${actResult.activity}" — forwarding to AI…`
          : '✓ [Activity Agent] No keyword match — AI will classify',
        '🤖 [Verification Agent] Checking activity whitelist…',
      ]);

      setStep(1, { status: 'running' });
      await delay(300);
      setStep(1, { status: 'done', detail: 'Forwarding to AI evaluation…' });
      setLogs((p) => [
        ...p,
        '✓ [Verification Agent] Activity queued for AI review.',
        '🤖 [Reward Agent] Estimating reward…',
      ]);

      setStep(2, { status: 'running' });
      await delay(300);
      const rwdPreview = actResult.valid
        ? rewardAgent(actResult.activity)
        : { reward: 0, currency: 'XLM' as const };
      if (actResult.valid) setRewardXlm(rwdPreview.reward);
      const rewardHint = actResult.valid
        ? `up to ~${rwdPreview.reward} XLM estimated`
        : 'AI will determine reward';
      setStep(2, { status: 'done', detail: rewardHint });
      setLogs((p) => [
        ...p,
        `✓ [Reward Agent] ${rewardHint}`,
        '🤖 [Kouri Agent] Generating challenge transaction…',
      ]);

      setStep(3, { status: 'running', detail: 'Requesting wallet ownership proof…' });
      setLogs((p) => [...p, '⏳ [Kouri Agent] Fetching nonce…']);

      let hash: string;
      let serverReward = rwdPreview.reward;
      let serverActivity = actResult.activity;

      try {
        const data = await achievoClient.submitActivity({
          wallet: walletAddress,
          activityText: textToSubmit,
          signChallenge: async (challengeXdr) => {
            if (!challengeXdr) {
              throw new Error('Nonce API error 200');
            }
            setStep(3, { detail: 'Sign the challenge in your wallet…' });
            setLogs((p) => [...p, '⏳ [Kouri Agent] Awaiting wallet signature…']);
            if (!walletId) {
              throw new Error('Connect Freighter on the Wallet tab before submitting.');
            }
            const signedXdr = await signChallengeXdr(walletId, challengeXdr);

            setStep(3, { detail: 'AI evaluating activity + submitting to Stellar…' });
            setLogs((p) => [
              ...p,
              '✓ [Kouri Agent] Signature received. AI evaluating + dispatching payout…',
            ]);
            return signedXdr;
          },
        });

        if (!data.txHash) {
          throw new Error('Reward API error 200');
        }
        hash = data.txHash;
        if (
          'identityId' in data
          && typeof data.identityId === 'string'
          && typeof data.sessionToken === 'string'
        ) {
          persistIdentitySession(data.identityId, data.sessionToken);
        }
        serverReward = data.reward ?? rwdPreview.reward;
        serverActivity = data.activity ?? actResult.activity;
        setRewardXlm(serverReward);
        setRewardMeta({
          base: 'base' in data ? data.base : undefined,
          bonus: 'bonus' in data ? data.bonus : undefined,
          effortScore: 'effortScore' in data ? data.effortScore : undefined,
          reason: 'reason' in data ? data.reason : undefined,
          flagged: 'flagged' in data ? data.flagged : undefined,
          flagReason: 'flagReason' in data ? data.flagReason : undefined,
        });
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        setPipelineError(msg);
        setStep(3, { status: 'error', detail: msg });
        setLogs((p) => [...p, `❌ [Kouri Agent] ${msg}`]);
        return;
      }

      setTxHash(hash);
      setLastPayoutActivity(serverActivity);
      trackRewardPaid({
        amount: serverReward,
        activity: serverActivity,
        txHash: hash,
      });
      setShowRewardCard(true);
      setStep(3, { status: 'done', detail: `Settled: ${hash.slice(0, 12)}…` });
      setLogs((p) => [
        ...p,
        `✓ [Kouri Agent] Hash: ${hash.slice(0, 16)}…`,
        '🤖 [Feedback Agent] Generating confirmation…',
      ]);

      setStep(4, { status: 'running' });
      await delay(200);
      const fb = feedbackAgent({ success: true, txHash: hash, reward: serverReward });
      setStep(4, { status: 'done', detail: fb.message });
      setLogs((p) => [...p, `✓ [Feedback Agent] ${fb.message}`, '🎉 [System] Payout complete.']);

      onPayout({
        id: hash,
        activity: serverActivity,
        reward: serverReward,
        txHash: hash,
        timestamp: Date.now(),
      });

      await fetchBalance(walletAddress);
      void loadTreasury();
      setActivityText('');
    } finally {
      setIsRunning(false);
    }
  };

  const dismissRewardFlow = useCallback(() => {
    setShowRewardCard(false);
    if (txHash && rewardXlm !== null && !hasSubmittedFeedback(txHash)) {
      setFeedbackPrompt({
        txHash,
        reward: rewardXlm,
        activity: lastPayoutActivity ?? 'activity',
      });
    } else {
      setTxHash(null);
      setRewardXlm(null);
      setRewardMeta(null);
      setLastPayoutActivity(null);
    }
  }, [txHash, rewardXlm, lastPayoutActivity]);

  const finishFeedbackFlow = useCallback(() => {
    setFeedbackPrompt(null);
    setTxHash(null);
    setRewardXlm(null);
    setRewardMeta(null);
    setLastPayoutActivity(null);
  }, []);

  return {
    pipeline,
    isRunning,
    logs,
    rewardXlm,
    txHash,
    rewardMeta,
    showRewardCard,
    feedbackPrompt,
    setFeedbackPrompt,
    pipelineError,
    handleSubmit,
    dismissRewardFlow,
    finishFeedbackFlow,
    resetPipeline,
    setTxHash,
    setRewardXlm,
    setShowRewardCard,
  };
}
