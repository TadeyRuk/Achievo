import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { Networks } from '@stellar/stellar-sdk';
import { getXlmBalance, fundWithFriendbot, StellarWalletsKit } from './wallet';
import { CONTRACT_ID, getTreasuryInfo, type TreasuryInfo } from './contract';
import { activityAgent, verificationAgent, rewardAgent, feedbackAgent } from './agents';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { ActivityForm } from './components/ActivityForm';
import { PipelineVisualizer, type PipelineStep } from './components/PipelineVisualizer';
import { WalletProfile } from './components/WalletProfile';
import { RewardCard } from './components/RewardCard';

type Tab = 'home' | 'pipeline' | 'wallet';

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
  const [xlmBalance, setXlmBalance]           = useState<string>("0");
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

  // ── Helpers ────────────────────────────────────────────────────────────────

  const fetchBalance = useCallback(async (address: string) => {
    try {
      const { balance, isFunded: funded } = await getXlmBalance(address);
      setXlmBalance(balance);
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
    (async () => {
      try {
        const { address } = await StellarWalletsKit.getAddress();
        if (address) { setWalletAddress(address); fetchBalance(address); }
      } catch { /* not connected */ }
    })();
    void loadTreasury();
  }, [fetchBalance, loadTreasury]);

  // ── Wallet actions ─────────────────────────────────────────────────────────

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const result = await StellarWalletsKit.authModal();
      if (result?.address) {
        setWalletAddress(result.address);
        fetchBalance(result.address);
        void loadTreasury();
      }
    } catch { /* user cancelled */ } finally { setIsConnecting(false); }
  };

  const handleDisconnect = async () => {
    try { await StellarWalletsKit.disconnect(); } catch { /* ignore */ }
    setWalletAddress(null);
    setXlmBalance("0");
    setIsFunded(true);
    setTreasuryInfo(null);
    setTxHash(null);
    setRewardXlm(null);
  };

  const handleFund = async () => {
    if (!walletAddress) return;
    try {
      await fundWithFriendbot(walletAddress);
      await fetchBalance(walletAddress);
    } catch { /* ignore */ }
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
    setTab('pipeline');

    try {
      // Step 0 — Activity Agent
      setStep(0, { status: 'running' });
      await delay(400);
      const actResult = activityAgent(activityText);
      if (!actResult.valid) {
        setStep(0, { status: 'error', detail: 'Could not classify activity' });
        setLogs(p => [...p, "❌ [Activity Agent] Unknown activity type"]);
        return;
      }
      setStep(0, { status: 'done', detail: `Classified: ${actResult.activity} · ${actResult.suggestedReward} XLM` });
      setLogs(p => [...p,
        `✓ [Activity Agent] "${actResult.activity}" → ${actResult.suggestedReward} XLM`,
        "🤖 [Verification Agent] Checking whitelist…",
      ]);

      // Step 1 — Verification Agent
      setStep(1, { status: 'running' });
      await delay(300);
      const verResult = verificationAgent(actResult.activity);
      if (verResult.status === 'rejected') {
        setStep(1, { status: 'error', detail: verResult.reason ?? 'Rejected' });
        setLogs(p => [...p, `❌ [Verification Agent] ${verResult.reason}`]);
        return;
      }
      setStep(1, { status: 'done', detail: 'Approved ✓' });
      setLogs(p => [...p,
        "✓ [Verification Agent] Whitelisted.",
        "🤖 [Reward Agent] Querying reward table…",
      ]);

      // Step 2 — Reward Agent
      setStep(2, { status: 'running' });
      await delay(300);
      const rwdResult = rewardAgent(actResult.activity);
      setRewardXlm(rwdResult.reward);
      setStep(2, { status: 'done', detail: `${rwdResult.reward} XLM assigned` });
      setLogs(p => [...p,
        `✓ [Reward Agent] ${rwdResult.reward} XLM allocated`,
        "🤖 [Stellar Agent] Generating challenge transaction…",
      ]);

      // Step 3 — Stellar Agent
      setStep(3, { status: 'running', detail: 'Requesting wallet ownership proof…' });
      setLogs(p => [...p, "⏳ [Stellar Agent] Fetching nonce…"]);
      let hash: string;
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

        setStep(3, { detail: 'Submitting reward to Stellar testnet…' });
        setLogs(p => [...p, "✓ [Stellar Agent] Signature received. Dispatching payout…"]);

        const apiRes = await fetch('/api/reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityType: actResult.activity,
            wallet: walletAddress,
            nonce: nonceData.nonce,
            expiry: nonceData.expiry,
            mac: nonceData.mac,
            signedXdr: signResult.signedTxXdr,
          }),
        });
        const data = await apiRes.json() as { txHash?: string; reward?: number; error?: string };
        if (!apiRes.ok || !data.txHash) throw new Error(data.error ?? `API error ${apiRes.status}`);
        hash = data.txHash;
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
      const fb = feedbackAgent({ success: true, txHash: hash, reward: rwdResult.reward });
      setStep(4, { status: 'done', detail: fb.message });
      setLogs(p => [...p,
        `✓ [Feedback Agent] ${fb.message}`,
        "🎉 [System] Payout complete.",
      ]);

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
      <div className="relative w-full max-w-[420px] bg-[var(--dah-bg)] sm:rounded-[3rem] sm:border-[10px] sm:border-[var(--dah-primary-container)] sm:h-[880px] h-[100dvh] flex flex-col overflow-hidden sm:shadow-2xl sm:shadow-[#00162b]/50">

        <Navbar />

        {/* Scrollable tab content */}
        <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
          <AnimatePresence mode="wait" initial={false}>
            {tab === 'home' && (
              <ActivityForm
                key="home"
                text={activityText}
                onChange={setActivityText}
                onSubmit={handleSubmit}
                isWalletConnected={!!walletAddress}
                isSubmitting={isRunning}
              />
            )}
            {tab === 'pipeline' && (
              <div key="pipeline" className="p-4 sm:p-6">
                <PipelineVisualizer steps={pipeline} logs={logs} />
                {txHash && rewardXlm !== null && (
                  <RewardCard reward={rewardXlm} txHash={txHash} />
                )}
              </div>
            )}
            {tab === 'wallet' && (
              <WalletProfile
                key="wallet"
                walletAddress={walletAddress}
                balance={xlmBalance}
                isFunded={isFunded}
                treasuryInfo={treasuryInfo}
                isConnecting={isConnecting}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onFund={handleFund}
              />
            )}
          </AnimatePresence>
        </div>

        <BottomNav activeTab={tab} onTabChange={setTab} />
      </div>
    </div>
  );
}
