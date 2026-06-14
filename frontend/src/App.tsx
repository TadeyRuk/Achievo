// This project is dedicated for Belle 🤍
import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Networks } from '@stellar/stellar-sdk';
import { getXlmBalance, fundWithFriendbot, StellarWalletsKit } from './wallet';
import { CONTRACT_ID, getTreasuryInfo, type TreasuryInfo } from './contract';
import { activityAgent, rewardAgent, feedbackAgent } from './agents';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { ActivityForm } from './ActivityForm';
import { PipelineVisualizer, type PipelineStep } from './PipelineVisualizer';
import { WalletProfile } from './WalletProfile';
import { RewardCard } from './RewardCard';
import { RewardHistory, type RewardHistoryItem } from './RewardHistory';
import { StudentProfile } from './StudentProfile';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { CustomWallet } from './customIcons';


type Tab = 'home' | 'history' | 'wallet' | 'profile';


const makePipeline = (): PipelineStep[] => [
  { name: 'Activity Agent',     desc: 'Parsing your submission…',        status: 'idle' },
  { name: 'Verification Agent', desc: 'Checking activity whitelist…',    status: 'idle' },
  { name: 'Reward Agent',       desc: 'Calculating XLM reward…',         status: 'idle' },
  { name: 'Stellar Agent',      desc: 'Executing on-chain transaction…', status: 'idle' },
  { name: 'Feedback Agent',     desc: 'Formatting result…',              status: 'idle' },
];

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export default function App() {
  const [tab, setTab] = useState<Tab>('home');

  // Wallet
  const [walletAddress, setWalletAddress]     = useState<string | null>(null);
  const [walletId, setWalletId]               = useState<string | null>(null);
  const [isFunded, setIsFunded]               = useState<boolean>(true);
  const [isConnecting, setIsConnecting]       = useState<boolean>(false);

  // Treasury
  const [treasuryInfo, setTreasuryInfo] = useState<TreasuryInfo | null>(null);

  // Form
  const [activityText, setActivityText] = useState<string>("");

  // Pipeline
  const [pipeline, setPipeline]   = useState<PipelineStep[]>(makePipeline());
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [logs, setLogs]           = useState<string[]>([]);

  // Results
  const [rewardXlm, setRewardXlm] = useState<number | null>(null);
  const [txHash, setTxHash]       = useState<string | null>(null);

  // Reward History Local Storage - Lazy State Initialization
  const [history, setHistory] = useState<RewardHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("achievo_reward_history");
      return saved ? (JSON.parse(saved) as RewardHistoryItem[]) : [];
    } catch {
      return [];
    }
  });

  // Success modal states for wallet actions
  const [showConnectSuccess, setShowConnectSuccess] = useState<boolean>(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<boolean>(false);
  const [showDisconnectSuccess, setShowDisconnectSuccess] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  // Scroll reference for auto-scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Ref for the RewardCard to auto-scroll into view when XLM is received
  const rewardCardRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as logs update
  useEffect(() => {
    if (scrollContainerRef.current && !txHash) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [logs, txHash]);

  // Auto-scroll to RewardCard when XLM reward arrives
  useEffect(() => {
    if (txHash && rewardXlm !== null && rewardCardRef.current) {
      setTimeout(() => {
        rewardCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    }
  }, [txHash, rewardXlm]);



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

  const setStep = (i: number, patch: Partial<PipelineStep>) =>
    setPipeline(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    // 1. Auto-connect wallet
    (async () => {
      try {
        const { address } = await StellarWalletsKit.getAddress();
        if (address) { setWalletAddress(address); fetchBalance(address); }
      } catch { /* not connected */ }
      void loadTreasury();
    })();
  }, [fetchBalance, loadTreasury]);

  // ── Wallet actions ─────────────────────────────────────────────────────────

  const handleConnect = async (id: string) => {
    setIsConnecting(true);
    try {
      StellarWalletsKit.setWallet(id);
      const result = await StellarWalletsKit.fetchAddress();
      if (result?.address) {
        setWalletAddress(result.address);
        setWalletId(id);
        fetchBalance(result.address);
        void loadTreasury();
        setShowConnectSuccess(true);
      }
    } catch { /* user cancelled */ } finally { setIsConnecting(false); }
  };

  const handleDisconnectRequest = () => {
    setShowDisconnectConfirm(true);
  };

  const handleDisconnectConfirm = async () => {
    setShowDisconnectConfirm(false);
    try { await StellarWalletsKit.disconnect(); } catch { /* ignore */ }
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

  const handleSubmit = async () => {
    if (!walletAddress || !activityText.trim() || isRunning) return;

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
      const actResult = activityAgent(activityText);
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
        "🤖 [Stellar Agent] Generating challenge transaction…",
      ]);

      // Step 3 — Stellar Agent (nonce → sign → AI evaluate → send reward)
      setStep(3, { status: 'running', detail: 'Requesting wallet ownership proof…' });
      setLogs(p => [...p, "⏳ [Stellar Agent] Fetching nonce…"]);
      let hash: string;
      let serverReward: number = rwdPreview.reward;
      let serverActivity: string = actResult.activity;
      try {
        const nonceRes = await fetch(`/api/nonce?wallet=${encodeURIComponent(walletAddress)}`);
        const nonceData = await nonceRes.json() as {
          nonce?: string; expiry?: number; mac?: string; challengeXdr?: string; error?: string;
        };
        if (!nonceRes.ok || !nonceData.challengeXdr) {
          throw new Error(nonceData.error ?? 'Failed to get wallet challenge');
        }

        setStep(3, { detail: 'Sign the challenge in your wallet…' });
        setLogs(p => [...p, "⏳ [Stellar Agent] Awaiting wallet signature…"]);
        const signResult = await StellarWalletsKit.signTransaction(nonceData.challengeXdr, {
          networkPassphrase: Networks.TESTNET,
          address: walletAddress,
        });

        setStep(3, { detail: 'AI evaluating activity + submitting to Stellar…' });
        setLogs(p => [...p, "✓ [Stellar Agent] Signature received. AI evaluating + dispatching payout…"]);

        const apiRes = await fetch('/api/reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityText: activityText.trim(),
            wallet: walletAddress,
            nonce: nonceData.nonce,
            expiry: nonceData.expiry,
            mac: nonceData.mac,
            signedXdr: signResult.signedTxXdr,
          }),
        });
        const data = await apiRes.json() as { txHash?: string; reward?: number; activity?: string; reason?: string; error?: string };
        if (!apiRes.ok || !data.txHash) throw new Error(data.error ?? `API error ${apiRes.status}`);
        hash = data.txHash;
        serverReward = data.reward ?? rwdPreview.reward;
        serverActivity = data.activity ?? actResult.activity;
        setRewardXlm(serverReward);
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        setStep(3, { status: 'error', detail: 'Transaction failed.' });
        setLogs(p => [...p, `❌ [Stellar Agent] ${msg}`]);
        return;
      }

      setTxHash(hash);
      setStep(3, { status: 'done', detail: `Settled: ${hash.slice(0, 12)}…` });
      setLogs(p => [...p,
        `✓ [Stellar Agent] Hash: ${hash.slice(0, 16)}…`,
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
      setActivityText("");

    } finally {
      setIsRunning(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-[var(--dah-surface-highest)] flex items-center justify-center">
      {/* Phone frame — navy bezel on desktop, full-bleed on mobile */}
      <div className="relative w-full max-w-[420px] bg-[var(--dah-bg)] sm:rounded-[3rem] sm:border-[10px] sm:border-[var(--dah-primary-container)] sm:h-[880px] h-[100dvh] flex flex-col overflow-hidden sm:shadow-2xl sm:shadow-[#000666]/35">

        <Navbar onInfoClick={() => setShowInfo(true)} />

        {/* Scrollable tab content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pt-[84px] pb-28 custom-scrollbar">
          <AnimatePresence mode="wait" initial={false}>
            {tab === 'home' && (
              !walletAddress ? (
                <div key="home-disconnected" className="flex flex-col items-center justify-center h-full min-h-[500px] p-8 text-center space-y-6">
                  {/* Gold circle with wallet icon */}
                  <div className="relative w-32 h-32 rounded-full bg-[#ffe8ab] flex items-center justify-center shadow-inner">
                    <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center shadow-md border border-white/10">
                      <CustomWallet className="w-10 h-10 text-[#00162b]" strokeWidth={2.2} />
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-w-[280px]">
                    <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--dah-primary)] font-display">
                      Wallet Disconnected
                    </h2>
                    <p className="text-[13px] text-[var(--dah-on-surface-variant)] leading-relaxed font-semibold">
                      To submit academic activities and earn on-chain rewards, you need to connect your wallet first.
                    </p>
                  </div>

                  <button
                    onClick={() => setTab('wallet')}
                    className="px-6 py-3.5 bg-[var(--dah-primary)] text-white hover:bg-[var(--dah-primary-container)] rounded-full font-extrabold text-[14px] shadow-md shadow-[var(--dah-primary)]/20 transition-all font-display uppercase tracking-wider active:scale-95"
                  >
                    Go to Wallet Tab
                  </button>
                </div>
              ) : isRunning || txHash || pipeline.some(step => step.status === 'error') ? (
                <div key="home-running" className="p-5 space-y-5">
                  <PipelineVisualizer steps={pipeline} logs={logs} />
                  
                  {txHash && rewardXlm !== null && (
                    <div ref={rewardCardRef}>
                      <RewardCard reward={rewardXlm} txHash={txHash} />
                    </div>
                  )}
                  
                  {txHash && !isRunning && (
                    <button
                      onClick={() => {
                        setTxHash(null);
                        setRewardXlm(null);
                        setPipeline(makePipeline());
                        setActivityText("");
                      }}
                      className="w-full flex items-center justify-center py-4 bg-[var(--dah-primary)] hover:bg-[#061d32] text-white rounded-full font-extrabold text-[14px] font-display uppercase tracking-wider transition-all shadow-md shadow-[var(--dah-primary)]/15 active:scale-98"
                    >
                      Submit Another Activity
                    </button>
                  )}
                  
                  {!isRunning && pipeline.some(step => step.status === 'error') && (
                    <button
                      onClick={() => {
                        setPipeline(makePipeline());
                      }}
                      className="w-full flex items-center justify-center py-4 bg-[var(--dah-primary)] hover:bg-[#061d32] text-white rounded-full font-extrabold text-[14px] font-display uppercase tracking-wider transition-all shadow-md shadow-[var(--dah-primary)]/15 active:scale-98"
                    >
                      Back to Form
                    </button>
                  )}
                </div>
              ) : (
                <ActivityForm
                  key="home"
                  text={activityText}
                  onChange={setActivityText}
                  onSubmit={handleSubmit}
                  isWalletConnected={!!walletAddress}
                  isSubmitting={isRunning}
                />
              )
            )}
            {tab === 'history' && (
              <div key="history" className="p-5">
                <RewardHistory history={history} />
              </div>
            )}
            {tab === 'wallet' && (
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
            {tab === 'profile' && (
              <div key="profile" className="p-5">
                <StudentProfile walletAddress={walletAddress} history={history} />
              </div>
            )}
          </AnimatePresence>
        </div>

        <BottomNav activeTab={tab} onTabChange={setTab} />

        {/* Info Bottom Sheet */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#00162b]/40 backdrop-blur-sm z-50 flex items-end"
              onClick={() => setShowInfo(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 260 }}
                className="w-full bg-white rounded-t-[28px] overflow-hidden max-h-[85%] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-10 h-1 rounded-full bg-[var(--dah-outline-variant)]" />
                </div>

                <div className="overflow-y-auto px-6 pb-8 pt-2 space-y-6">
                  {/* Title */}
                  <div>
                    <h2 className="text-[22px] font-extrabold text-[var(--dah-primary)] tracking-tight font-display">How Achievo Works</h2>
                    <p className="text-[13px] text-[var(--dah-on-surface-variant)] mt-1">AI pipeline + effort-based XLM rewards</p>
                  </div>

                  {/* Pipeline Steps */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--dah-outline)]">5-Agent Pipeline</p>
                    {[
                      { num: "1", name: "Activity Agent",     desc: "Keyword pre-scan of your submission for a fast category hint." },
                      { num: "2", name: "Verification Agent", desc: "Confirms the activity is on the approved whitelist." },
                      { num: "3", name: "Reward Agent",       desc: "Groq AI classifies the activity and scores your effort (0–1) to calculate final XLM." },
                      { num: "4", name: "Stellar Agent",      desc: "Admin key signs and submits send_reward() to the Soroban treasury contract on-chain." },
                      { num: "5", name: "Feedback Agent",     desc: "Returns your tx hash and reward amount for display." },
                    ].map(s => (
                      <div key={s.num} className="flex gap-3 items-start p-3 rounded-[16px] bg-[var(--dah-surface-low)]">
                        <div className="w-7 h-7 rounded-full bg-[var(--dah-primary)] text-white text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">{s.num}</div>
                        <div>
                          <p className="text-[13px] font-extrabold text-[var(--dah-on-surface)]">{s.name}</p>
                          <p className="text-[12px] text-[var(--dah-on-surface-variant)] leading-snug">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Effort Scoring */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--dah-outline)]">Effort-Based Scoring</p>

                    {/* Formula card */}
                    <div className="relative rounded-[20px] bg-[var(--dah-primary)] p-5 overflow-hidden">
                      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/50 mb-2">Formula</p>
                      <p className="text-[15px] font-extrabold text-white font-display">
                        reward = base + (effort × bonus)
                      </p>
                      <p className="text-[12px] text-white/65 mt-2 leading-relaxed">
                        AI scores 0.0–1.0 on specificity, duration, scope, and impact. Vague = low. Detailed + context = high.
                      </p>
                    </div>

                    {/* Activity table */}
                    <div className="rounded-[20px] overflow-hidden border border-[var(--dah-outline-variant)]/30">
                      {/* Header */}
                      <div className="grid grid-cols-[1fr_auto_auto] bg-[var(--dah-primary)] px-4 py-2.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/50">Activity</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/50 w-16 text-center">Base</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/50 w-16 text-center">Max</span>
                      </div>
                      {[
                        { a: "Volunteering",  emoji: "🤝", base: 10, max: 15 },
                        { a: "Tutoring",      emoji: "📚", base: 5,  max: 10 },
                        { a: "Workshop",      emoji: "🛠️", base: 2,  max: 5  },
                        { a: "Event",         emoji: "🎖️", base: 3,  max: 5  },
                        { a: "Participation", emoji: "⭐", base: 3,  max: 5  },
                      ].map((r, i) => (
                        <div
                          key={r.a}
                          className={`grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 ${i % 2 === 0 ? "bg-white" : "bg-[var(--dah-surface-low)]"}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{r.emoji}</span>
                            <span className="text-[13px] font-bold text-[var(--dah-on-surface)]">{r.a}</span>
                          </div>
                          <span className="text-[12px] text-[var(--dah-outline)] w-16 text-center">{r.base} XLM</span>
                          <div className="w-16 flex justify-center">
                            <span className="text-[12px] font-extrabold text-[var(--dah-primary)] bg-[#fff3cc] px-2 py-0.5 rounded-full">
                              {r.max} XLM
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowInfo(false)}
                    className="w-full py-3.5 rounded-full bg-[var(--dah-primary)] text-white font-extrabold text-[14px] font-display"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </motion.div>
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
    </div>
  );
}
