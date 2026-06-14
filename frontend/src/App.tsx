import { useState, useEffect, useCallback } from 'react';
import {
  getXlmBalance,
  fundWithFriendbot,
  StellarWalletsKit
} from './wallet';
import {
  CONTRACT_ID,
  getTreasuryInfo,
  type TreasuryInfo
} from './contract';
import {
  activityAgent,
  verificationAgent,
  rewardAgent,
  feedbackAgent
} from './agents';
import {
  Wallet,
  User,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Info,
  Settings,
  TrendingUp,
  ArrowRight,
  Send
} from 'lucide-react';

// ─── Pipeline step type ───────────────────────────────────────────────────────

type StepStatus = 'idle' | 'running' | 'done' | 'error';

interface PipelineStep {
  label: string;
  detail: string;
  status: StepStatus;
}

const INITIAL_PIPELINE: PipelineStep[] = [
  { label: 'Activity Agent',     detail: 'Parsing your submission...',        status: 'idle' },
  { label: 'Verification Agent', detail: 'Checking activity whitelist...',    status: 'idle' },
  { label: 'Reward Agent',       detail: 'Calculating XLM reward...',         status: 'idle' },
  { label: 'Stellar Agent',      detail: 'Executing on-chain transaction...', status: 'idle' },
  { label: 'Feedback Agent',     detail: 'Formatting result...',              status: 'idle' },
];

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  // Wallet state
  const [walletAddress, setWalletAddress]           = useState<string | null>(null);
  const [xlmBalance, setXlmBalance]                 = useState<string>("0");
  const [isFunded, setIsFunded]                     = useState<boolean>(true);
  const [isWalletConnecting, setIsWalletConnecting] = useState<boolean>(false);

  // Contract config
  const [currentContractId, setCurrentContractId]     = useState<string>(CONTRACT_ID);
  const [customContractInput, setCustomContractInput] = useState<string>("");
  const [showSettings, setShowSettings]               = useState<boolean>(false);

  // Treasury info
  const [treasuryInfo, setTreasuryInfo] = useState<TreasuryInfo | null>(null);

  // Derived: no separate state needed — avoids cascading setState in effects
  const isAdmin = walletAddress !== null && treasuryInfo !== null && walletAddress === treasuryInfo.admin;

  // Activity submission form
  const [activityText, setActivityText] = useState<string>("");

  // Pipeline state
  const [pipeline, setPipeline]   = useState<PipelineStep[]>(INITIAL_PIPELINE);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Result / feedback
  const [rewardXlm, setRewardXlm]         = useState<number | null>(null);
  const [txHash, setTxHash]               = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage]   = useState<string | null>(null);

  // ── Helpers (defined before useEffect hooks that reference them) ─────────────

  const fetchBalance = useCallback(async (address: string) => {
    try {
      const { balance, isFunded: funded } = await getXlmBalance(address);
      setXlmBalance(balance);
      setIsFunded(funded);
    } catch (e) {
      setErrorMessage(`Error fetching balance: ${(e as Error).message ?? String(e)}`);
    }
  }, []);

  const loadTreasuryInfo = useCallback(async (contractId: string) => {
    if (contractId === "PLACEHOLDER_DEPLOY_AND_UPDATE") {
      setTreasuryInfo(null);
      return null;
    }
    try {
      const info = await getTreasuryInfo(contractId);
      setTreasuryInfo(info);
      return info;
    } catch {
      setTreasuryInfo(null);
      return null;
    }
  }, []);

  const updateStep = (index: number, patch: Partial<PipelineStep>) => {
    setPipeline(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
  };

  // ── Effects ──────────────────────────────────────────────────────────────────

  // On mount: reconnect wallet if previously connected
  useEffect(() => {
    (async () => {
      try {
        const { address } = await StellarWalletsKit.getAddress();
        if (address) {
          setWalletAddress(address);
          fetchBalance(address);
        }
      } catch { /* not connected */ }
    })();
  }, [fetchBalance]);

  // Load treasury info when contract ID changes (async external fetch — setState inside is intentional)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTreasuryInfo(currentContractId);
  }, [currentContractId, loadTreasuryInfo]);

  // ── Wallet actions ────────────────────────────────────────────────────────────

  const handleConnect = async () => {
    setIsWalletConnecting(true);
    setErrorMessage(null);
    try {
      const result = await StellarWalletsKit.authModal();
      if (result?.address) {
        setWalletAddress(result.address);
        fetchBalance(result.address);
        void loadTreasuryInfo(currentContractId);
      }
    } catch (e) {
      setErrorMessage(`Wallet connection failed: ${(e as Error).message ?? String(e)}`);
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try { await StellarWalletsKit.disconnect(); } catch { /* ignore */ }
    setWalletAddress(null);
    setXlmBalance("0");
    setIsFunded(true);
    setTreasuryInfo(null);
    setStatusMessage(null);
    setTxHash(null);
    setErrorMessage(null);
  };

  const handleFundFaucet = async () => {
    if (!walletAddress) return;
    setStatusMessage("Requesting testnet XLM from Friendbot faucet...");
    setErrorMessage(null);
    try {
      await fundWithFriendbot(walletAddress);
      setStatusMessage("Account funded with 10,000 testnet XLM!");
      await fetchBalance(walletAddress);
    } catch (e) {
      setErrorMessage(`Friendbot funding failed: ${(e as Error).message ?? String(e)}`);
    } finally {
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleApplyContract = () => {
    const addr = customContractInput.trim();
    if (addr.length !== 56) {
      setErrorMessage("Contract ID must be 56 characters.");
      return;
    }
    setCurrentContractId(addr);
    setShowSettings(false);
    setStatusMessage("Contract configuration updated!");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // ── Main: submit activity through agent pipeline ──────────────────────────────

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress)       { setErrorMessage("Connect your wallet first."); return; }
    if (!activityText.trim()) { setErrorMessage("Enter an activity description."); return; }

    setIsRunning(true);
    setErrorMessage(null);
    setTxHash(null);
    setRewardXlm(null);
    setPipeline(INITIAL_PIPELINE);

    try {
      // ── Step 0: Activity Agent ────────────────────────────────────────────────
      updateStep(0, { status: 'running', detail: 'Parsing your submission...' });
      await delay(400);
      const actResult = activityAgent(activityText);
      if (!actResult.valid) {
        updateStep(0, { status: 'error', detail: `Unknown activity in: "${activityText}"` });
        setErrorMessage(`Activity Agent: could not classify your submission. Try mentioning: tutoring, workshop, volunteering, event, or participation.`);
        setIsRunning(false);
        return;
      }
      updateStep(0, { status: 'done', detail: `Classified as: ${actResult.activity} (${actResult.suggestedReward} XLM suggested)` });

      // ── Step 1: Verification Agent ────────────────────────────────────────────
      updateStep(1, { status: 'running', detail: 'Checking activity whitelist...' });
      await delay(300);
      const verResult = verificationAgent(actResult.activity);
      if (verResult.status === 'rejected') {
        updateStep(1, { status: 'error', detail: verResult.reason ?? 'Rejected' });
        setErrorMessage(`Verification Agent: ${verResult.reason}`);
        setIsRunning(false);
        return;
      }
      updateStep(1, { status: 'done', detail: 'Activity approved ✓' });

      // ── Step 2: Reward Agent ──────────────────────────────────────────────────
      updateStep(2, { status: 'running', detail: 'Calculating XLM reward...' });
      await delay(300);
      const rwdResult = rewardAgent(actResult.activity);
      setRewardXlm(rwdResult.reward);
      updateStep(2, { status: 'done', detail: `Reward assigned: ${rwdResult.reward} XLM` });

      // ── Step 3: Stellar Agent (server-side via Vercel API) ───────────────────
      updateStep(3, { status: 'running', detail: 'Sending reward via secure API...' });
      setStatusMessage("Submitting to Stellar testnet...");
      let hash: string;
      try {
        const apiRes = await fetch('/api/reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activity: activityText, wallet: walletAddress }),
        });
        const data = await apiRes.json() as { txHash?: string; reward?: number; error?: string };
        if (!apiRes.ok || !data.txHash) {
          throw new Error(data.error ?? `API error ${apiRes.status}`);
        }
        hash = data.txHash;
      } catch (err) {
        updateStep(3, { status: 'error', detail: 'Transaction failed.' });
        const msg = (err as Error).message ?? String(err);
        if (msg.toLowerCase().includes("insufficient")) {
          setErrorMessage("Transaction Error: Insufficient treasury balance to cover this reward.");
        } else if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
          setErrorMessage("Network Error: Contract or account not found on Stellar testnet.");
        } else if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
          setErrorMessage(`Rate Limit: ${msg}`);
        } else {
          setErrorMessage(`API Error: ${msg}`);
        }
        setIsRunning(false);
        return;
      }

      setTxHash(hash);
      updateStep(3, { status: 'done', detail: `Settled on-chain: ${hash.slice(0, 12)}...` });

      // ── Step 4: Feedback Agent ────────────────────────────────────────────────
      updateStep(4, { status: 'running', detail: 'Formatting result...' });
      await delay(200);
      const fb = feedbackAgent({ success: true, txHash: hash, reward: rwdResult.reward });
      updateStep(4, { status: 'done', detail: fb.message });

      setStatusMessage(null);
      await fetchBalance(walletAddress);
      void loadTreasuryInfo(currentContractId);
      setActivityText("");

    } catch (err) {
      setErrorMessage(`Unexpected error: ${(err as Error).message ?? String(err)}`);
    } finally {
      setIsRunning(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="app-container">

      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <TrendingUp className="brand-logo" />
          <div className="brand-texts">
            <h1 className="brand-title">Achievo</h1>
            <p className="brand-subtitle">AI Student Reward System · Stellar Testnet</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="settings-toggle-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Configure Contract Settings"
          >
            <Settings className="icon" />
          </button>

          {walletAddress ? (
            <div className="wallet-info-badge">
              <div className="wallet-balance">
                <span className="balance-val">{parseFloat(xlmBalance).toFixed(2)}</span>
                <span className="balance-lbl">XLM</span>
              </div>
              <div className="wallet-address" title={walletAddress}>
                <User className="icon" />
                <span>{walletAddress.slice(0, 5)}...{walletAddress.slice(-4)}</span>
                {isAdmin && <span className="badge active" style={{ marginLeft: 6, fontSize: '0.7rem' }}>Admin</span>}
              </div>
              <button className="btn-disconnect" onClick={handleDisconnect}>Disconnect</button>
            </div>
          ) : (
            <button
              className="btn-connect-wallet"
              onClick={handleConnect}
              disabled={isWalletConnecting}
            >
              <Wallet className="icon" />
              {isWalletConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      <main className="main-content">

        {/* Unfunded alert */}
        {walletAddress && !isFunded && (
          <div className="alert-banner warning">
            <ShieldAlert className="alert-icon" />
            <div className="alert-text">
              <h4>Unfunded Account</h4>
              <p>Your wallet has 0 XLM. Fund it with testnet XLM to send rewards.</p>
            </div>
            <button className="btn-alert-action" onClick={handleFundFaucet}>
              <RefreshCw className="icon" /> Faucet Fund (10,000 XLM)
            </button>
          </div>
        )}

        {/* Error banner */}
        {errorMessage && (
          <div className="alert-banner error">
            <XCircle className="alert-icon" />
            <div className="alert-text">
              <h4>Error</h4>
              <p>{errorMessage}</p>
            </div>
            <button className="btn-alert-close" onClick={() => setErrorMessage(null)}>×</button>
          </div>
        )}

        {/* Status banner */}
        {statusMessage && (
          <div className="alert-banner info">
            <Info className="alert-icon spin" />
            <div className="alert-text">
              <h4>Processing</h4>
              <p>{statusMessage}</p>
            </div>
          </div>
        )}

        {/* TX success banner */}
        {txHash && (
          <div className="alert-banner success">
            <CheckCircle className="alert-icon" />
            <div className="alert-text">
              <h4>Reward Sent! {rewardXlm !== null && `+${rewardXlm} XLM`}</h4>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-explorer-link"
              >
                View on StellarExpert <ExternalLink className="inline-icon" />
              </a>
            </div>
            <button className="btn-alert-close" onClick={() => setTxHash(null)}>×</button>
          </div>
        )}

        {/* Contract settings */}
        {showSettings && (
          <section className="dashboard-section settings-section animate-fade">
            <h3>⚙️ Treasury Contract Config</h3>
            <p className="description-text">Override the deployed treasury contract ID.</p>
            <div className="input-group">
              <input
                type="text"
                className="text-input"
                placeholder="Enter contract ID (C... 56 chars)"
                value={customContractInput}
                onChange={(e) => setCustomContractInput(e.target.value)}
              />
              <button className="btn-action" onClick={handleApplyContract}>Apply</button>
            </div>
            <p className="active-contract-indicator">
              Active: <code>{currentContractId}</code>
            </p>
            {treasuryInfo && (
              <p className="active-contract-indicator">
                Balance: <strong>{treasuryInfo.balance.toFixed(2)} XLM</strong> &nbsp;|&nbsp;
                Disbursed: <strong>{treasuryInfo.totalDisbursed.toFixed(2)} XLM</strong>
              </p>
            )}
          </section>
        )}

        <div className="dashboard-grid">

          {/* ── Column 1: Activity Submission ── */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2>Submit Your Activity</h2>
              <span className="badge">{walletAddress ? 'Ready' : 'Connect Wallet'}</span>
            </div>

            <form onSubmit={handleSubmitActivity} className="bill-setup-form">
              <div className="form-group">
                <label>What did you do?</label>
                <textarea
                  className="text-input"
                  rows={3}
                  required
                  placeholder="e.g. I helped tutor 2 classmates in Python"
                  value={activityText}
                  onChange={(e) => setActivityText(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
                <span className="info-text">
                  Recognized: tutoring, workshop, volunteering, event, participation
                </span>
              </div>

              <button
                type="submit"
                className="btn-submit-bill"
                disabled={!walletAddress || isRunning}
              >
                {isRunning
                  ? <><RefreshCw className="btn-icon spin-icon" /> Processing...</>
                  : <><Send className="btn-icon" /> Run Agent Pipeline <ArrowRight className="btn-icon" /></>
                }
              </button>

              {!walletAddress && (
                <p className="info-text" style={{ textAlign: 'center', marginTop: 8 }}>
                  Connect your wallet to submit activities and earn XLM.
                </p>
              )}
            </form>
          </section>

          {/* ── Column 2: Agent Pipeline Visualizer ── */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2>Agent Pipeline</h2>
              <span className={`badge ${isRunning ? 'active' : 'inactive'}`}>
                {isRunning ? 'Running' : txHash ? 'Completed' : 'Idle'}
              </span>
            </div>

            <div className="bill-status-list">
              <div className="status-scroller">
                {pipeline.map((step, idx) => (
                  <div
                    key={step.label}
                    className={`status-row ${step.status === 'done' ? 'paid' : step.status === 'error' ? 'pending' : ''}`}
                  >
                    <div className="row-user">
                      <span className="index-indicator">{idx + 1}</span>
                      <div>
                        <div className="address-lbl" style={{ fontWeight: 600 }}>{step.label}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                          {step.detail}
                        </div>
                      </div>
                    </div>
                    <div className="row-status">
                      {step.status === 'done'    && <span className="status-badge success"><CheckCircle className="icon" /> Done</span>}
                      {step.status === 'running' && <span className="status-badge pending"><RefreshCw className="icon spin" /> Running</span>}
                      {step.status === 'error'   && <span className="status-badge pending"><XCircle className="icon" /> Error</span>}
                      {step.status === 'idle'    && <span className="status-badge pending"><Info className="icon" /> Waiting</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reward result card */}
            {txHash && rewardXlm !== null && (
              <div className="bill-info-card animate-fade" style={{ marginTop: 16 }}>
                <div className="card-top">
                  <h3>Reward Sent!</h3>
                  <span className="total-badge">+{rewardXlm} XLM</span>
                </div>
                <div className="card-splits">
                  <div className="split-item">
                    <span className="lbl">Recipient</span>
                    <span className="val">{walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}` : '—'}</span>
                  </div>
                  <div className="split-item">
                    <span className="lbl">Amount</span>
                    <span className="val highlight">{rewardXlm} XLM</span>
                  </div>
                </div>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tx-explorer-link"
                  style={{ display: 'block', marginTop: 12 }}
                >
                  View transaction on StellarExpert <ExternalLink className="inline-icon" />
                </a>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}

export default App;
