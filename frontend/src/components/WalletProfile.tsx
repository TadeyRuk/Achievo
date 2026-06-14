import { Wallet, LogOut, ShieldCheck, RefreshCw, Database, TrendingUp, Users, BookOpen, Tent, Presentation } from "lucide-react";
import { motion } from "motion/react";
import type { TreasuryInfo } from "../contract";

interface WalletProfileProps {
  walletAddress: string | null;
  balance: string;
  isFunded: boolean;
  treasuryInfo: TreasuryInfo | null;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onFund: () => void;
}

const REWARD_TABLE = [
  { icon: Tent,         label: "Volunteering",  xlm: 10 },
  { icon: Users,        label: "Tutoring",       xlm: 5  },
  { icon: Presentation, label: "Event / Participation", xlm: 3  },
  { icon: BookOpen,     label: "Workshop",       xlm: 2  },
];

/* Simple mock mini-chart — 7 day bars in gold */
function MiniBarChart({ balance }: { balance: string }) {
  const bal = parseFloat(balance) || 0;
  const bars = [3, 0, 5, 10, 0, 2, 3].map(v => ({ v, today: false }));
  bars[6] = { v: bal > 0 ? Math.min(bal, 10) : 3, today: true };
  const max = Math.max(...bars.map(b => b.v), 1);
  const days = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="flex items-end gap-1.5 h-14">
      {bars.map((bar, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={`w-full rounded-t-[2px] transition-all ${
              bar.today
                ? "bg-[var(--dah-secondary-container)]"
                : bar.v > 0
                ? "bg-[var(--dah-secondary-container)]/50"
                : "bg-[var(--dah-surface-high)]"
            }`}
            style={{ height: `${(bar.v / max) * 100}%`, minHeight: "4px" }}
          />
          <span className="text-[9px] text-[var(--dah-outline)] font-medium">{days[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function WalletProfile({
  walletAddress, balance, isFunded, treasuryInfo,
  isConnecting, onConnect, onDisconnect, onFund
}: WalletProfileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 sm:p-5 space-y-4"
    >
      {walletAddress ? (
        /* ── CONNECTED STATE ── */
        <>
          {/* Balance hero — navy card */}
          <div className="bg-[var(--dah-primary-container)] rounded-[12px] p-5 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/5 rounded-full pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-1.5 mb-4">
                <TrendingUp className="w-3.5 h-3.5 text-[var(--dah-secondary-container)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-white/60">
                  Wallet Balance
                </span>
              </div>

              <div className="flex items-end gap-2 mb-1">
                <span className="text-[42px] font-extrabold leading-none tracking-[-0.02em]">
                  {parseFloat(balance).toFixed(2)}
                </span>
                <span className="text-[18px] font-bold text-[var(--dah-on-primary-container)] pb-1">XLM</span>
              </div>

              {/* Wallet address chip */}
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 max-w-full overflow-hidden">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--dah-secondary-container)] shrink-0" />
                <span className="text-[12px] font-mono text-white/80 truncate">
                  {walletAddress.slice(0, 6)}…{walletAddress.slice(-6)}
                </span>
              </div>
            </div>
          </div>

          {/* Earnings chart */}
          <div className="bg-white rounded-[12px] border border-[var(--dah-outline-variant)] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold text-[var(--dah-on-surface)]">7-Day Activity</span>
              <span className="text-[11px] text-[var(--dah-outline)] font-medium">XLM earned</span>
            </div>
            <MiniBarChart balance={balance} />
          </div>

          {/* Funding prompt */}
          {!isFunded && (
            <button
              onClick={onFund}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[8px] bg-[var(--dah-secondary-container)] text-[var(--dah-on-secondary-container)] font-bold text-[14px] hover:brightness-105 transition-all shadow-md shadow-[var(--dah-secondary-container)]/25"
            >
              <RefreshCw className="w-4 h-4" />
              Get Testnet XLM via Friendbot
            </button>
          )}

          {/* Reward table */}
          <div className="bg-white rounded-[12px] border border-[var(--dah-outline-variant)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--dah-outline)] mb-3">
              Reward Schedule
            </p>
            <ul className="space-y-2.5">
              {REWARD_TABLE.map(({ icon: Icon, label, xlm }) => (
                <li key={label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13px] text-[var(--dah-on-surface-variant)]">
                    <span className="p-1 rounded-[4px] bg-[var(--dah-surface-low)]">
                      <Icon className="w-3.5 h-3.5 text-[var(--dah-primary)]" />
                    </span>
                    {label}
                  </span>
                  <span className="text-[13px] font-bold text-[var(--dah-primary)] bg-[var(--dah-secondary-container)]/20 px-2 py-0.5 rounded-[4px]">
                    {xlm} XLM
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Treasury stats */}
          <div className="bg-[var(--dah-primary)] rounded-[12px] p-4 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-3.5 h-3.5 text-[var(--dah-on-primary-container)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/60">
                Contract Treasury
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Balance",   value: treasuryInfo ? `${treasuryInfo.balance.toFixed(0)} XLM` : "—" },
                { label: "Disbursed", value: treasuryInfo ? `${treasuryInfo.totalDisbursed.toFixed(0)} XLM` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/8 rounded-[8px] p-3 border border-white/10">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-white/50 mb-1">{label}</p>
                  <p className="text-[15px] font-bold text-[var(--dah-secondary-container)]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Disconnect */}
          <button
            onClick={onDisconnect}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[8px] bg-transparent border border-[var(--dah-outline-variant)] text-[var(--dah-on-surface-variant)] font-semibold text-[14px] hover:border-[var(--dah-outline)] hover:text-[var(--dah-on-surface)] hover:bg-[var(--dah-surface-low)] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Disconnect Wallet
          </button>
        </>
      ) : (
        /* ── DISCONNECTED STATE — Connect Wallet (with Logo) ── */
        <>
          {/* Hero */}
          <div className="bg-[var(--dah-primary-container)] rounded-[12px] p-8 text-white text-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-[var(--dah-secondary-container)]/8 rounded-full pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/4 rounded-full pointer-events-none" />

            {/* Logo mark */}
            <div className="relative w-16 h-16 bg-[var(--dah-primary)] rounded-[12px] flex items-center justify-center mx-auto mb-5 shadow-xl shadow-black/30">
              <span className="text-[var(--dah-secondary-container)] font-extrabold text-[28px] leading-none tracking-tight">A</span>
            </div>

            <h2 className="text-[24px] font-extrabold tracking-[-0.02em] mb-2">Connect Wallet</h2>
            <p className="text-[13px] text-white/60 leading-relaxed max-w-[240px] mx-auto">
              Link your Stellar testnet wallet to start earning XLM for academic activities.
            </p>
          </div>

          {/* Connect CTA */}
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-[8px] bg-[var(--dah-primary)] text-white font-bold text-[15px] tracking-[-0.01em] hover:bg-[var(--dah-primary-container)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-[var(--dah-primary)]/25"
          >
            <Wallet className="w-5 h-5" />
            {isConnecting ? "Connecting…" : "Connect Stellar Wallet"}
          </button>

          {/* Reward preview */}
          <div className="bg-white rounded-[12px] border border-[var(--dah-outline-variant)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--dah-outline)] mb-3">
              What you can earn
            </p>
            <ul className="space-y-2.5">
              {REWARD_TABLE.map(({ icon: Icon, label, xlm }) => (
                <li key={label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13px] text-[var(--dah-on-surface-variant)]">
                    <span className="p-1 rounded-[4px] bg-[var(--dah-surface-low)]">
                      <Icon className="w-3.5 h-3.5 text-[var(--dah-primary)]" />
                    </span>
                    {label}
                  </span>
                  <span className="text-[13px] font-bold text-[var(--dah-primary)] bg-[var(--dah-secondary-container)]/20 px-2 py-0.5 rounded-[4px]">
                    {xlm} XLM
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </motion.div>
  );
}
