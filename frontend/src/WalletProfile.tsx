import { Wallet, LogOut, ShieldCheck, RefreshCw, Database, TrendingUp, Users, BookOpen, Tent, Presentation } from "lucide-react";
import { motion } from "motion/react";
import type { TreasuryInfo } from "./contract";

interface WalletProfileProps {
  walletAddress: string | null;
  balance: string;
  isFunded: boolean;
  treasuryInfo: TreasuryInfo | null;
  isConnecting: boolean;
  onConnect: (walletId: string) => void;
  onDisconnect: () => void;
  onFund: () => void;
}

const REWARD_TABLE = [
  { icon: Tent,         label: "Volunteering",  xlm: 10 },
  { icon: Users,        label: "Tutoring",       xlm: 5  },
  { icon: Presentation, label: "Event / Participation", xlm: 3  },
  { icon: BookOpen,     label: "Workshop",       xlm: 2  },
];

/* Beautiful responsive chart with round bars and secondary accents */
function MiniBarChart({ balance }: { balance: string }) {
  const bal = parseFloat(balance) || 0;
  const bars = [3, 2, 5, 8, 4, 6, 3].map(v => ({ v, today: false }));
  bars[6] = { v: bal > 0 ? Math.min(bal, 12) : 5, today: true };
  const max = Math.max(...bars.map(b => b.v), 1);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex items-end gap-3 h-24 px-1 pt-4">
      {bars.map((bar, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
          <div className="relative group w-full flex justify-center">
            {/* Hover Tooltip */}
            <span className="absolute -top-7 scale-0 group-hover:scale-100 transition-all bg-[var(--dah-primary)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm pointer-events-none">
              {bar.v} XLM
            </span>
            <div
              className={`w-3.5 rounded-full transition-all duration-500 ${
                bar.today
                  ? "bg-gradient-to-t from-[var(--dah-secondary-container)] to-[#ffe699] shadow-sm"
                  : "bg-[var(--dah-primary-container)]/15 hover:bg-[var(--dah-primary-container)]/35"
              }`}
              style={{ height: `${(bar.v / max) * 85}%`, minHeight: "8px" }}
            />
          </div>
          <span className="text-[10px] text-[var(--dah-outline)] font-bold uppercase tracking-wider">{days[i]}</span>
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
      className="p-5 space-y-5"
    >
      {walletAddress ? (
        /* ── CONNECTED DASHBOARD STATE ── */
        <>
          {/* Balance Hero Card - 28px/32px corner radius, Level 1 elevation */}
          <div className="bg-[var(--dah-primary-container)] rounded-[28px] p-6 text-white relative overflow-hidden shadow-lg shadow-[var(--dah-primary-container)]/15">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />

            <div className="relative space-y-4">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[var(--dah-secondary-container)]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/60 font-display">
                  Wallet Balance
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-[44px] font-extrabold leading-none tracking-tight font-display">
                  {parseFloat(balance).toFixed(2)}
                </span>
                <span className="text-[18px] font-extrabold text-[var(--dah-on-primary-container)]">XLM</span>
              </div>

              {/* Wallet Address Chip - Pill-shaped */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 max-w-full overflow-hidden">
                <ShieldCheck className="w-4 h-4 text-[var(--dah-secondary-container)] shrink-0" />
                <span className="text-[12px] font-mono text-white/95 truncate">
                  {walletAddress.slice(0, 8)}…{walletAddress.slice(-8)}
                </span>
              </div>
            </div>
          </div>

          {/* Earnings Chart - 24px corner radius */}
          <div className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)] p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-extrabold text-[var(--dah-on-surface)] font-display">Weekly Activity</span>
              <span className="text-[11px] text-[var(--dah-outline)] font-bold uppercase tracking-[0.04em]">XLM Reward Volume</span>
            </div>
            <MiniBarChart balance={balance} />
          </div>

          {/* Funding Prompt for fresh testnet accounts */}
          {!isFunded && (
            <button
              onClick={onFund}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-full bg-[var(--dah-secondary-container)] text-[var(--dah-on-secondary-container)] font-extrabold text-[14px] hover:brightness-105 transition-all shadow-md shadow-[var(--dah-secondary-container)]/25 font-display uppercase tracking-[0.02em]"
            >
              <RefreshCw className="w-4 h-4" />
              Claim Friendbot Testnet XLM
            </button>
          )}

          {/* Reward Schedule List */}
          <div className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)] p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--dah-outline)] mb-4 font-display">
              Standard Reward Schedule
            </p>
            <ul className="space-y-3">
              {REWARD_TABLE.map(({ icon: Icon, label, xlm }) => (
                <li key={label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-[13px] font-semibold text-[var(--dah-on-surface-variant)]">
                    <span className="p-2 rounded-full bg-[var(--dah-surface-low)]">
                      <Icon className="w-4 h-4 text-[var(--dah-primary)]" />
                    </span>
                    {label}
                  </span>
                  <span className="text-[12px] font-extrabold text-[var(--dah-primary)] bg-[var(--dah-secondary-container)]/25 px-3 py-1 rounded-full">
                    {xlm} XLM
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Treasury Stats - Top-heavy shape styling */}
          <div className="bg-[var(--dah-primary)] rounded-[24px] p-5 text-white shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[var(--dah-on-primary-container)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/60 font-display">
                Smart Contract Treasury
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Available", value: treasuryInfo ? `${treasuryInfo.balance.toFixed(0)} XLM` : "—" },
                { label: "Disbursed", value: treasuryInfo ? `${treasuryInfo.totalDisbursed.toFixed(0)} XLM` : "—" },
              ].map(({ label, value }) => (
                /* Top-heavy corner styling (top corners 20px, bottom corners 8px) */
                <div key={label} className="bg-white/10 rounded-t-[20px] rounded-b-[8px] p-3.5 border border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/50 mb-1">{label}</p>
                  <p className="text-[16px] font-extrabold text-[var(--dah-secondary-container)] font-display">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Disconnect Button - Fully Rounded Pill */}
          <button
            onClick={onDisconnect}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-transparent border border-[var(--dah-outline-variant)] text-[var(--dah-on-surface-variant)] font-bold text-[14px] hover:border-[var(--dah-outline)] hover:text-[var(--dah-on-surface)] hover:bg-[var(--dah-surface-low)] transition-all font-display uppercase tracking-[0.02em]"
          >
            <LogOut className="w-4 h-4" />
            Disconnect Wallet
          </button>
        </>
      ) : (
        /* ── DISCONNECTED CONNECT WALLET STATE (STRICT MOCKUP LAYOUT) ── */
        <>
          {/* Hero Illustration Section */}
          <div className="flex flex-col items-center pt-4 pb-2">
            {/* Large gold circular background */}
            <div className="relative w-36 h-36 rounded-full bg-[#ffe8ab] flex items-center justify-center shadow-inner">
              {/* White rounded-square wallet container */}
              <div className="w-24 h-24 bg-white rounded-[28px] flex items-center justify-center shadow-md relative border border-white/10">
                <Wallet className="w-12 h-12 text-[#00162b]" strokeWidth={2.2} />
                
                {/* Overlapping gold pill badge: $ XLM */}
                <div className="absolute -bottom-1 -right-3.5 bg-[#ffbf21] text-[#6e4f00] text-[10px] font-extrabold px-3 py-1 rounded-full shadow-md whitespace-nowrap border-2 border-white font-display">
                  $ XLM
                </div>
              </div>
            </div>
          </div>

          {/* Headline and description */}
          <div className="text-center space-y-1.5 px-2">
            <h2 className="text-[24px] font-extrabold tracking-tight text-[#00162b] font-display">
              Connect Your Wallet
            </h2>
            <p className="text-[13px] text-[var(--dah-on-surface-variant)] leading-relaxed max-w-[280px] mx-auto font-semibold">
              Link your Stellar wallet to start receiving XLM rewards for your achievements.
            </p>
          </div>

          {/* Wallet Options List - Pill-shaped items */}
          <div className="space-y-3 pt-2">
            {/* Freighter Card */}
            <div className="flex items-center justify-between p-4 rounded-full bg-[var(--dah-surface-low)] border border-[var(--dah-outline-variant)]/40 hover:border-[var(--dah-primary)] transition-all shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-bold">
                    ⚓
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[14px] font-extrabold text-[var(--dah-on-surface)]">Freighter</span>
                    <span className="text-[8px] font-extrabold text-[#6e4f00] bg-[#ffbf21] px-1.5 py-0.5 rounded-full font-display">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--dah-on-surface-variant)] font-semibold truncate">Stellar Browser Extension</p>
                </div>
              </div>
              <button
                onClick={() => onConnect("freighter")}
                disabled={isConnecting}
                className="px-4.5 py-2.5 bg-[#00162b] hover:bg-[#061d32] text-white text-[13px] font-extrabold rounded-full transition-all shrink-0 font-display shadow-sm"
              >
                Connect
              </button>
            </div>

            {/* Albedo Card */}
            <button
              onClick={() => onConnect("albedo")}
              className="w-full flex items-center justify-between p-4 rounded-full bg-[var(--dah-surface-low)] border border-[var(--dah-outline-variant)]/40 hover:border-[var(--dah-primary)] transition-all text-left shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 text-blue-600 border border-slate-100">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.47 0-.89.09-1.3.27A6 6 0 0 0 3 13c0 3.3 2.7 6 6 6h8.5z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-extrabold text-[var(--dah-on-surface)] block">Albedo</span>
                  <p className="text-[10px] text-[var(--dah-on-surface-variant)] font-semibold">Web-based signer</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-[var(--dah-outline)] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* xBull Card */}
            <button
              onClick={() => onConnect("xbull")}
              className="w-full flex items-center justify-between p-4 rounded-full bg-[var(--dah-surface-low)] border border-[var(--dah-outline-variant)]/40 hover:border-[var(--dah-primary)] transition-all text-left shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 text-emerald-600 border border-slate-100">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-extrabold text-[var(--dah-on-surface)] block">xBull</span>
                  <p className="text-[10px] text-[var(--dah-on-surface-variant)] font-semibold">Secure mobile & desktop</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-[var(--dah-outline)] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Lobstr Card */}
            <button
              onClick={() => onConnect("lobstr")}
              className="w-full flex items-center justify-between p-4 rounded-full bg-[var(--dah-surface-low)] border border-[var(--dah-outline-variant)]/40 hover:border-[var(--dah-primary)] transition-all text-left shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 text-indigo-700 border border-slate-100">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-extrabold text-[var(--dah-on-surface)] block">Lobstr</span>
                  <p className="text-[10px] text-[var(--dah-on-surface-variant)] font-semibold">Popular mobile wallet</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-[var(--dah-outline)] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Promotion Card (New to Stellar?) */}
          <div className="p-5 rounded-[24px] bg-[var(--dah-surface-low)] border border-dashed border-[var(--dah-outline-variant)] text-center space-y-3.5 shadow-sm mt-2">
            <div className="space-y-1">
              <h3 className="text-[16px] font-extrabold text-[#00162b] font-display">New to Stellar?</h3>
              <p className="text-[12px] text-[var(--dah-on-surface-variant)] leading-relaxed font-semibold max-w-[260px] mx-auto">
                Create a wallet in 2 minutes and start earning rewards for your daily achievements.
              </p>
            </div>
            
            <a
              href="https://www.stellar.org/learn/wallets"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#ffbf21] hover:brightness-105 text-[#00162b] font-extrabold text-[13px] transition-all shadow-sm font-display uppercase tracking-wider"
            >
              <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[11px] font-black leading-none text-[#ffbf21]">+</span>
              <span>Create New Wallet</span>
            </a>
          </div>
        </>
      )}
    </motion.div>
  );
}
