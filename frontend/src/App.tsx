// This project is dedicated for Belle 🤍
import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import posthog from 'posthog-js';
import { Networks } from '@stellar/stellar-sdk';
import { Analytics } from '@vercel/analytics/react';
import { getXlmBalance, fundWithFriendbot, StellarWalletsKit, ensureWalletSession, clearWalletSession } from './wallet';
import {
  CONTRACT_ID,
  getTreasuryInfo,
  getRewardEvents,
  getRewardLedger,
  attachTxHashes,
  type TreasuryInfo,
  type RewardLedgerRecord,
} from './contract';
import { activityAgent, rewardAgent, feedbackAgent } from './agents';
import { ProgressionAgent, type StoredProgression } from './agents/progression';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { ActivityForm } from './ActivityForm';
import { PipelineVisualizer, type PipelineStep } from './PipelineVisualizer';
import { WalletProfile } from './WalletProfile';
import { RewardCard } from './RewardCard';
import { TransactionFeedback } from './TransactionFeedback';
import { hasSubmittedFeedback, type FeedbackPrompt } from './transactionFeedback';
import { RewardHistory, type RewardHistoryItem } from './RewardHistory';
import { RecentPayouts } from './RecentPayouts';
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

import { CheckCircle2, AlertTriangle } from 'lucide-react';


type Tab = 'home' | 'history' | 'wallet' | 'profile';

function loadStoredProgression(): StoredProgression {
  try {
    const saved = localStorage.getItem("achievo_progression");
    return saved ? (JSON.parse(saved) as StoredProgression) : {};
  } catch {
    return {};
  }
}

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

const makePipeline = (): PipelineStep[] => [
  { name: 'Activity Agent',     desc: 'Parsing your submission…',        status: 'idle' },
  { name: 'Verification Agent', desc: 'Checking activity whitelist…',    status: 'idle' },
  { name: 'Reward Agent',       desc: 'Calculating XLM reward…',         status: 'idle' },
  { name: 'Kouri Agent',      desc: 'Executing on-chain transaction…', status: 'idle' },
  { name: 'Feedback Agent',     desc: 'Formatting result…',              status: 'idle' },
];

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export default function App() {
  const devPreview = devFeedbackPreview();
  const [showSplash, setShowSplash] = useState<boolean>(() => !devPreview);
  const [bootstrapProgress, setBootstrapProgress] = useState<number>(0);
  const [showLogin, setShowLogin] = useState<boolean>(() => !hasUserName());
  const [userName, setUserNameState] = useState<string>(() => getUserName() ?? "");

  const [tab, setTab] = useState<Tab>('home');

  // User Avatar
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    return localStorage.getItem("achievo_user_avatar") || "/xander_avatar.webp";
  });

  const handleAvatarChange = (newAvatar: string) => {
    setUserAvatar(newAvatar);
    localStorage.setItem("achievo_user_avatar", newAvatar);
  };

  // Wallet
  const [walletAddress, setWalletAddress]     = useState<string | null>(null);
  const [walletId, setWalletId]               = useState<string | null>(() => {
    return localStorage.getItem("achievo_wallet_id");
  });
  const [isFunded, setIsFunded]               = useState<boolean>(true);
  const [isConnecting, setIsConnecting]       = useState<boolean>(false);

  // Treasury
  const [treasuryInfo, setTreasuryInfo] = useState<TreasuryInfo | null>(null);

  // Form
  const [activityText, setActivityText] = useState<string>("");
  const [showForm, setShowForm]         = useState<boolean>(false);
  const [showRefer, setShowRefer]       = useState<boolean>(false);

  // Pipeline
  const [pipeline, setPipeline]   = useState<PipelineStep[]>(makePipeline());
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [logs, setLogs]           = useState<string[]>([]);

  // Results
  const [rewardXlm, setRewardXlm] = useState<number | null>(null);
  const [txHash, setTxHash]       = useState<string | null>(null);
  // ScoringAgent + IntegrityAgent breakdown for the reward card (optional).
  const [rewardMeta, setRewardMeta] = useState<{
    base?: number; bonus?: number; effortScore?: number; reason?: string;
    flagged?: boolean; flagReason?: string;
  } | null>(null);
  const [feedbackPrompt, setFeedbackPrompt] = useState<FeedbackPrompt | null>(() => devPreview);
  const [showRewardCard, setShowRewardCard] = useState(false);
  const [lastPayoutActivity, setLastPayoutActivity] = useState<string | null>(null);

  // Reward History Local Storage - Lazy State Initialization
  const [history, setHistory] = useState<RewardHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("achievo_reward_history");
      return saved ? (JSON.parse(saved) as RewardHistoryItem[]) : [];
    } catch {
      return [];
    }
  });

  // ProgressionAgent persisted freeze state (streak freezes). Reconciled against
  // history + time whenever history changes; persisted so freezes survive reloads.
  const [progression, setProgression] = useState<StoredProgression>(loadStoredProgression);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgression((prev) => {
      const { storedNext } = ProgressionAgent.reconcile(history, prev);
      try { localStorage.setItem("achievo_progression", JSON.stringify(storedNext)); } catch { /* ignore */ }
      return storedNext;
    });
  }, [history]);

  // On-chain payout feed: durable ledger (get_history, contract storage — survives
  // past the RPC event-retention window) with tx hashes attached from getRewardEvents
  // where available (falls back to a ledger-sequence explorer link otherwise).
  const [payouts, setPayouts]           = useState<RewardLedgerRecord[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState<boolean>(false);
  const [payoutsError, setPayoutsError] = useState<string | null>(null);

  // Success modal states for wallet actions
  const [showConnectSuccess, setShowConnectSuccess] = useState<boolean>(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<boolean>(false);
  const [showDisconnectSuccess, setShowDisconnectSuccess] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);

  // Scroll reference for auto-scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const phoneFrameRef = useRef<HTMLDivElement>(null);

  const shellReady = !showSplash && !showLogin;
  const onboarding = useOnboarding({
    ready: shellReady,
    setTab: (t) => {
      setShowRefer(false);
      setShowForm(false);
      setTab(t);
    },
  });
  // Auto-scroll to bottom only when the pipeline is actively running
  useEffect(() => {
    if (isRunning && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [logs, isRunning]);

  // Reset scroll to top when changing tabs or toggling the submission form
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: "auto"
      });
    }
  }, [tab, showForm]);



  // ── Helpers ────────────────────────────────────────────────────────────────

  const fetchBalance = useCallback(async (address: string) => {
    try {
      const { isFunded: funded } = await getXlmBalance(address);
      setIsFunded(funded);
    } catch { /* ignore */ }
  }, []);

  const loadTreasury = useCallback(async () => {
    if ((CONTRACT_ID as string) === "PLACEHOLDER_DEPLOY_AND_UPDATE") return;
    try { setTreasuryInfo(await getTreasuryInfo(CONTRACT_ID)); } catch { /* ignore */ }
  }, []);

  const loadPayouts = useCallback(async () => {
    if (!walletAddress || (CONTRACT_ID as string) === "PLACEHOLDER_DEPLOY_AND_UPDATE") return;
    setPayoutsLoading(true);
    setPayoutsError(null);
    try {
      // get_history is the durable, read-only on-chain ledger (contract storage) —
      // unlike getRewardEvents it isn't bounded by RPC event retention, so past
      // rewards never disappear from view. getRewardEvents is still queried
      // alongside it purely to supply the tx hash (a contract can't observe its
      // own tx hash), joined in via attachTxHashes.
      const [ledger, chainEvents] = await Promise.all([
        getRewardLedger(),
        getRewardEvents(walletAddress),
      ]);
      const mine = ledger.filter((record) => record.recipient === walletAddress);
      const withHashes = attachTxHashes(mine, chainEvents)
        .sort((a, b) => b.timestamp - a.timestamp);
      setPayouts(withHashes);
    } catch (err) {
      setPayoutsError((err as Error).message ?? "Failed to load payouts");
    } finally {
      setPayoutsLoading(false);
    }
  }, [walletAddress]);

  const setStep = (i: number, patch: Partial<PipelineStep>) =>
    setPipeline(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    // 1. Auto-connect wallet — delay first tick so the bar renders at 0% first
    setTimeout(async () => {
      setBootstrapProgress(15);
      const storedWalletId = localStorage.getItem("achievo_wallet_id");
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

  // Flush submission states when wallet is disconnected
  useEffect(() => {
    if (!walletAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActivityText("");
      setShowForm(false);
      setIsRunning(false);
      setPipeline(makePipeline());
      setLogs([]);
      setTxHash(null);
      setRewardXlm(null);
    }
  }, [walletAddress]);

  // Poll on-chain reward events every 15 s while a wallet is connected
  useEffect(() => {
    if (!walletAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPayouts([]);
      setPayoutsError(null);
      return;
    }
    void loadPayouts();
    const id = setInterval(() => { void loadPayouts(); }, 15_000);
    return () => clearInterval(id);
  }, [walletAddress, loadPayouts]);

  // ── Wallet actions ─────────────────────────────────────────────────────────

  const handleConnect = async (id: string) => {
    setIsConnecting(true);
    try {
      const address = await ensureWalletSession(id);
      setWalletAddress(address);
      posthog.capture('wallet_connected', { wallet_type: id });
      setWalletId(id);
      localStorage.setItem("achievo_wallet_id", id);
      fetchBalance(address);
      void loadTreasury();
      setShowConnectSuccess(true);
    } catch { /* user cancelled or Freighter denied access */ } finally { setIsConnecting(false); }
  };

  const handleDisconnectRequest = () => {
    setShowDisconnectConfirm(true);
  };

  const handleDisconnectConfirm = async () => {
    setShowDisconnectConfirm(false);
    await clearWalletSession();
    setWalletAddress(null);
    setWalletId(null);
    setIsFunded(true);
    setTreasuryInfo(null);
    setTxHash(null);
    setRewardXlm(null);
    setShowDisconnectSuccess(true);
  };

  const handleFund = async () => {
    if (!walletAddress) return;
    try {
      await fundWithFriendbot(walletAddress);
      await fetchBalance(walletAddress);
    } catch { /* ignore */ }
  };

  const handleRefresh = async () => {
    if (walletAddress) {
      await fetchBalance(walletAddress);
    }
    await loadTreasury();
  };

  // ── Submit activity ────────────────────────────────────────────────────────

  const handleSubmit = async (overrideText?: string) => {
    const textToSubmit = overrideText ? overrideText.trim() : activityText.trim();
    if (!walletAddress || !textToSubmit || isRunning) return;

    posthog.capture('activity_submitted', { length: textToSubmit.length });

    setIsRunning(true);
    setTxHash(null);
    setRewardXlm(null);
    setPipeline(makePipeline());
    setLogs([
      "⚙️ Booting agent pipeline…",
      "🤖 [Activity Agent] Initializing…",
    ]);

    try {
      // Step 0 — Activity Agent (keyword hint only; Groq AI is authoritative)
      setStep(0, { status: 'running' });
      await delay(400);
      const actResult = activityAgent(textToSubmit);
      const hintLabel = actResult.valid
        ? `Hint: ${actResult.activity} · ${actResult.suggestedReward} XLM`
        : 'AI will classify';
      setStep(0, { status: 'done', detail: hintLabel });
      setLogs(p => [...p,
        actResult.valid
          ? `✓ [Activity Agent] Hint: "${actResult.activity}" — forwarding to AI…`
          : `✓ [Activity Agent] No keyword match — AI will classify`,
        "🤖 [Verification Agent] Checking activity whitelist…",
      ]);

      // Step 1 — Verification Agent (cosmetic; server AI is the real gate)
      setStep(1, { status: 'running' });
      await delay(300);
      setStep(1, { status: 'done', detail: 'Forwarding to AI evaluation…' });
      setLogs(p => [...p,
        "✓ [Verification Agent] Activity queued for AI review.",
        "🤖 [Reward Agent] Estimating reward…",
      ]);

      // Step 2 — Reward Agent (preview — server AI is authoritative)
      setStep(2, { status: 'running' });
      await delay(300);
      const rwdPreview = actResult.valid ? rewardAgent(actResult.activity) : { reward: 0, currency: 'XLM' as const };
      if (actResult.valid) setRewardXlm(rwdPreview.reward);
      const rewardHint = actResult.valid ? `~${rwdPreview.reward} XLM estimated` : 'AI will determine reward';
      setStep(2, { status: 'done', detail: rewardHint });
      setLogs(p => [...p,
        `✓ [Reward Agent] ${rewardHint}`,
        "🤖 [Kouri Agent] Generating challenge transaction…",
      ]);

      // Step 3 — Kouri Agent (nonce → sign → AI evaluate → send reward)
      setStep(3, { status: 'running', detail: 'Requesting wallet ownership proof…' });
      setLogs(p => [...p, "⏳ [Kouri Agent] Fetching nonce…"]);
      let hash: string;
      let serverReward: number = rwdPreview.reward;
      let serverActivity: string = actResult.activity;
      try {
        const nonceRes = await fetch(`/api/nonce?wallet=${encodeURIComponent(walletAddress)}`);
        const nonceRaw = await nonceRes.text();
        let nonceData: { nonce?: string; expiry?: number; mac?: string; challengeXdr?: string; error?: string };
        try { nonceData = JSON.parse(nonceRaw); }
        catch { throw new Error(`Nonce API error ${nonceRes.status}: server returned non-JSON`); }
        if (!nonceRes.ok || !nonceData.challengeXdr) {
          throw new Error(nonceData.error ?? `Nonce API error ${nonceRes.status}`);
        }

        setStep(3, { detail: 'Sign the challenge in your wallet…' });
        setLogs(p => [...p, "⏳ [Kouri Agent] Awaiting wallet signature…"]);
        if (!walletId) {
          throw new Error('Connect Freighter on the Wallet tab before submitting.');
        }
        const signingAddress = await ensureWalletSession(walletId);
        const signResult = await StellarWalletsKit.signTransaction(nonceData.challengeXdr, {
          networkPassphrase: Networks.TESTNET,
          address: signingAddress,
        });

        setStep(3, { detail: 'AI evaluating activity + submitting to Stellar…' });
        setLogs(p => [...p, "✓ [Kouri Agent] Signature received. AI evaluating + dispatching payout…"]);

        const apiRes = await fetch('/api/reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityText: textToSubmit,
            wallet: walletAddress,
            nonce: nonceData.nonce,
            expiry: nonceData.expiry,
            mac: nonceData.mac,
            signedXdr: signResult.signedTxXdr,
          }),
        });
        const rewardRaw = await apiRes.text();
        let data: { txHash?: string; reward?: number; base?: number; bonus?: number; effortScore?: number; activity?: string; reason?: string; flagged?: boolean; flagReason?: string; error?: string };
        try { data = JSON.parse(rewardRaw); }
        catch { throw new Error(`Reward API error ${apiRes.status}: server returned non-JSON`); }
        if (!apiRes.ok || !data.txHash) throw new Error(data.error ?? `Reward API error ${apiRes.status}`);
        hash = data.txHash;
        serverReward = data.reward ?? rwdPreview.reward;
        serverActivity = data.activity ?? actResult.activity;
        setRewardXlm(serverReward);
        setRewardMeta({
          base: data.base,
          bonus: data.bonus,
          effortScore: data.effortScore,
          reason: data.reason,
          flagged: data.flagged,
          flagReason: data.flagReason,
        });
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        setStep(3, { status: 'error', detail: 'Transaction failed.' });
        setLogs(p => [...p, `❌ [Kouri Agent] ${msg}`]);
        return;
      }

      setTxHash(hash);
      setLastPayoutActivity(serverActivity);
      posthog.capture('reward_paid', { amount: serverReward, activity: serverActivity, tx_hash: hash });
      setShowRewardCard(true);
      setStep(3, { status: 'done', detail: `Settled: ${hash.slice(0, 12)}…` });
      setLogs(p => [...p,
        `✓ [Kouri Agent] Hash: ${hash.slice(0, 16)}…`,
        "🤖 [Feedback Agent] Generating confirmation…",
      ]);

      // Step 4 — Feedback Agent
      setStep(4, { status: 'running' });
      await delay(200);
      const fb = feedbackAgent({ success: true, txHash: hash, reward: serverReward });
      setStep(4, { status: 'done', detail: fb.message });
      setLogs(p => [...p,
        `✓ [Feedback Agent] ${fb.message}`,
        "🎉 [System] Payout complete.",
      ]);

      // Add successful transaction to local history
      const newHistoryItem: RewardHistoryItem = {
        id: hash,
        activity: serverActivity,
        reward: serverReward,
        txHash: hash,
        timestamp: Date.now(),
      };
      setHistory(prev => {
        const next = [newHistoryItem, ...prev];
        try { localStorage.setItem("achievo_reward_history", JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });

      await fetchBalance(walletAddress);
      void loadTreasury();
      void loadPayouts();
      setActivityText("");

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

  // ── Render ─────────────────────────────────────────────────────────────────

  const sheetOpen = Boolean(showInfo || showFeedback || feedbackPrompt);
  const reduceMotion = useReducedMotion();
  const contentFrameMotion = reduceMotion
    ? { scale: 1, borderRadius: 0 }
    : {
        scale: sheetOpen ? iosContentScale : 1,
        borderRadius: sheetOpen ? 28 : 0,
      };

  return (
    <div className="min-h-[100dvh] bg-[var(--dah-surface-highest)] flex items-center justify-center">

      {/* Phone frame — navy bezel on desktop, full-bleed on mobile */}
      <div
        ref={phoneFrameRef}
        data-phone-frame
        className="relative w-full max-w-[420px] bg-[var(--dah-bg)] sm:rounded-[3rem] sm:border-[4px] sm:border-[var(--dah-primary-container)] sm:h-[880px] h-[100dvh] flex flex-col overflow-hidden sm:shadow-2xl sm:shadow-[#000666]/35"
      >

        {/* Startup splash screen — lives inside the phone frame */}
        <AnimatePresence>
          {showSplash && (
            <SplashScreen
              progress={bootstrapProgress}
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

        {/* App content — scales down behind iOS sheets */}
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
              transition={{ type: "spring", stiffness: 110, damping: 19 }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 60 }}
            >
              <Navbar onFeedbackClick={() => setShowFeedback(true)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable tab content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pt-[84px] pb-28 custom-scrollbar">
          <AnimatePresence mode="wait" initial={false}>
            {!showSplash && !showLogin && tab === 'home' && (
              isRunning || txHash || pipeline.some(step => step.status === 'error') ? (
                <div key="home-running" className="p-5 space-y-5">
                  <PipelineVisualizer steps={pipeline} logs={logs} />
                  
                  {txHash && !isRunning && (
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setTxHash(null);
                          setRewardXlm(null);
                          setPipeline(makePipeline());
                          setActivityText("");
                          setShowForm(true);
                        }}
                        className="w-full flex items-center justify-center py-4 bg-[var(--dah-primary)] hover:bg-[#061d32] text-white rounded-full font-extrabold text-[14px] font-display uppercase tracking-wider transition-all shadow-md shadow-[var(--dah-primary)]/15 active:scale-98 cursor-pointer"
                      >
                        Submit Another Activity
                      </button>
                      <button
                        onClick={() => {
                          setTxHash(null);
                          setRewardXlm(null);
                          setPipeline(makePipeline());
                          setActivityText("");
                          setShowForm(false);
                        }}
                        className="w-full flex items-center justify-center py-4 bg-[#f3f5fa] hover:bg-[#ebedf2] border border-[#e1e3e8]/40 text-[#00162b] rounded-full font-extrabold text-[14px] font-display uppercase tracking-wider transition-all active:scale-98 cursor-pointer"
                      >
                        Go to Dashboard
                      </button>
                    </div>
                  )}
                  
                  {!isRunning && pipeline.some(step => step.status === 'error') && (
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setPipeline(makePipeline());
                          setShowForm(true);
                        }}
                        className="w-full flex items-center justify-center py-4 bg-[var(--dah-primary)] hover:bg-[#061d32] text-white rounded-full font-extrabold text-[14px] font-display uppercase tracking-wider transition-all shadow-md shadow-[var(--dah-primary)]/15 active:scale-98 cursor-pointer"
                      >
                        Back to Form
                      </button>
                      <button
                        onClick={() => {
                          setPipeline(makePipeline());
                          setShowForm(false);
                        }}
                        className="w-full flex items-center justify-center py-4 bg-[#f3f5fa] hover:bg-[#ebedf2] border border-[#e1e3e8]/40 text-[#00162b] rounded-full font-extrabold text-[14px] font-display uppercase tracking-wider transition-all active:scale-98 cursor-pointer"
                      >
                        Go to Dashboard
                      </button>
                    </div>
                  )}
                </div>
              ) : showForm && walletAddress ? (
                <ActivityForm
                  key="home-form"
                  text={activityText}
                  onChange={setActivityText}
                  onSubmit={handleSubmit}
                  isWalletConnected={!!walletAddress}
                  isSubmitting={isRunning}
                  onBack={() => setShowForm(false)}
                />
              ) : (
                <Dashboard
                  key="home-dashboard"
                  userName={userName}
                  history={history}
                  progression={progression}
                  walletAddress={walletAddress}
                  onSubmitActivityClick={() => {
                    if (!walletAddress) {
                      setTab('wallet');
                    } else {
                      setShowForm(true);
                    }
                  }}
                  onConnectWalletClick={() => setTab('wallet')}
                  onInviteClick={() => setShowRefer(true)}
                />
              )
            )}
            {!showSplash && !showLogin && tab === 'history' && (
              <div key="history">
                <RecentPayouts
                  payouts={payouts}
                  loading={payoutsLoading}
                  error={payoutsError}
                  walletConnected={!!walletAddress}
                />
                <RewardHistory history={history} />
              </div>
            )}
            {!showSplash && !showLogin && tab === 'wallet' && (
              <WalletProfile
                key="wallet"
                walletAddress={walletAddress}
                walletId={walletId}
                isFunded={isFunded}
                treasuryInfo={treasuryInfo}
                isConnecting={isConnecting}
                onConnect={handleConnect}
                onDisconnect={handleDisconnectRequest}
                onFund={handleFund}
                onRefresh={handleRefresh}
                history={history}
              />
            )}
            {!showSplash && !showLogin && tab === 'profile' && (
              <StudentProfile
                key="profile"
                walletAddress={walletAddress}
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
              transition={{ type: "spring", stiffness: 110, damping: 19 }}
              className="absolute bottom-0 left-0 right-0 z-50"
            >
              <BottomNav activeTab={tab} onTabChange={(t) => { setShowRefer(false); setTab(t); }} />
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>

        {/* First-run onboarding — single presence so welcome exits before tour enters */}
        <AnimatePresence mode="wait">
          {shellReady && onboarding.phase === "welcome" && (
            <OnboardingWelcome
              key="onboarding-welcome"
              onStart={onboarding.startTour}
              onSkip={onboarding.skip}
            />
          )}
          {shellReady && onboarding.phase === "tour" && onboarding.currentStep && (
            <OnboardingTour
              key="onboarding-tour"
              containerRef={phoneFrameRef}
              step={onboarding.currentStep}
              stepIndex={onboarding.stepIndex}
              totalSteps={onboarding.totalSteps}
              isLastStep={onboarding.isLastStep}
              onNext={onboarding.next}
              onSkip={onboarding.skip}
            />
          )}
        </AnimatePresence>

        {/* Refer Friend Overlay Page */}
        <AnimatePresence>
          {showRefer && (
            <div className="absolute inset-0 z-50 overflow-y-auto">
              <ReferFriend
                userName={userName}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Reward Modal */}
        <AnimatePresence>
          {showRewardCard && txHash && rewardXlm !== null && (
            <RewardCard
              reward={rewardXlm}
              txHash={txHash}
              breakdown={rewardMeta ?? undefined}
              onClose={dismissRewardFlow}
            />
          )}
        </AnimatePresence>

        {/* Per-transaction user feedback */}
        <AnimatePresence>
          {feedbackPrompt && (
            <TransactionFeedback
              prompt={feedbackPrompt}
              walletAddress={walletAddress}
              onDone={(submitted, rating, hasComment) => {
                if (submitted) {
                  posthog.capture('transaction_feedback_submitted', {
                    tx_hash: feedbackPrompt.txHash,
                    rating,
                    has_comment: hasComment,
                  });
                } else {
                  posthog.capture('transaction_feedback_skipped', { tx_hash: feedbackPrompt.txHash });
                }
                finishFeedbackFlow();
              }}
            />
          )}
        </AnimatePresence>

        {/* Info Bottom Sheet */}
        <AnimatePresence>
          {showInfo && (
            <InfoSheet onDismiss={() => setShowInfo(false)} />
          )}
        </AnimatePresence>

        {/* General Feedback Sheet */}
        <AnimatePresence>
          {showFeedback && (
            <GeneralFeedback
              userName={userName}
              onClose={() => setShowFeedback(false)}
            />
          )}
        </AnimatePresence>

        {/* Wallet Connection Success Prompt Modal Overlay */}
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
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="bg-white rounded-[32px] p-6 text-center max-w-[300px] shadow-2xl space-y-4.5 border border-slate-100"
              >
                {/* Animated checkmark circle */}
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle2 className="w-9 h-9" />
                  </motion.div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-[20px] font-extrabold text-[#00162b] font-display">
                    Wallet Connected!
                  </h3>
                  <p className="text-[12.5px] text-[var(--dah-on-surface-variant)] leading-relaxed font-semibold">
                    Your Stellar account is linked successfully. Ready to earn XLM rewards for your achievements.
                  </p>
                </div>

                {/* Address Chip */}
                <div className="bg-[var(--dah-surface-low)] py-2 px-3 rounded-full border border-[var(--dah-outline-variant)]/30 font-mono text-[11px] text-[var(--dah-on-surface-variant)]">
                  {walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-10)}` : ""}
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

        {/* Wallet Disconnection Confirmation Prompt Modal Overlay */}
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
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="bg-white rounded-[32px] p-6 text-center max-w-[300px] shadow-2xl space-y-4.5 border border-slate-100"
              >
                {/* Warning icon */}
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500">
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                  >
                    <AlertTriangle className="w-9 h-9" />
                  </motion.div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-[20px] font-extrabold text-[#00162b] font-display">
                    Disconnect Wallet?
                  </h3>
                  <p className="text-[12.5px] text-[var(--dah-on-surface-variant)] leading-relaxed font-semibold">
                    Are you sure you want to disconnect your Stellar wallet? Academic reward payouts will be paused.
                  </p>
                </div>

                <div className="flex flex-col space-y-2 pt-2">
                  <button
                    onClick={handleDisconnectConfirm}
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

        {/* Wallet Disconnection Success Prompt Modal Overlay */}
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
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="bg-white rounded-[32px] p-6 text-center max-w-[300px] shadow-2xl space-y-4.5 border border-slate-100"
              >
                {/* Animated checkmark circle */}
                <div className="w-16 h-16 bg-slate-500/10 rounded-full flex items-center justify-center mx-auto text-slate-500">
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle2 className="w-9 h-9" />
                  </motion.div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-[20px] font-extrabold text-[#00162b] font-display">
                    Wallet Disconnected
                  </h3>
                  <p className="text-[12.5px] text-[var(--dah-on-surface-variant)] leading-relaxed font-semibold">
                    Your Stellar wallet has been safely disconnected. Academic reward payouts are paused until linked again.
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
