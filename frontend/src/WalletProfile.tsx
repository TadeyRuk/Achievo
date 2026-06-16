import { useState, type ReactNode } from "react";
import { LogOut, ShieldCheck, RefreshCw, Database, TrendingUp, Check, Clock } from "lucide-react";
import { motion } from "motion/react";
import type { TreasuryInfo } from "./contract";
import type { RewardHistoryItem } from "./RewardHistory";
import { CustomWallet } from "./customIcons";
import { StellarWalletsKit } from "./wallet";

interface WalletProfileProps {
  walletAddress: string | null;
  walletId: string | null;
  isFunded: boolean;
  treasuryInfo: TreasuryInfo | null;
  isConnecting: boolean;
  onConnect: (walletId: string) => void;
  onDisconnect: () => void;
  onFund: () => void;
  onRefresh?: () => Promise<void>;
  history: RewardHistoryItem[];
}

const WALLET_ICONS: Record<string, string> = {
  freighter: "https://stellar.creit.tech/wallet-icons/freighter.png",
  albedo:    "https://stellar.creit.tech/wallet-icons/albedo.png",
  xbull:     "https://stellar.creit.tech/wallet-icons/xbull.png",
  lobstr:    "https://stellar.creit.tech/wallet-icons/lobstr.png",
};

const WALLET_META: Record<string, { name: string; icon: ReactNode; color: string }> = {
  freighter: {
    name: "Freighter",
    color: "#1a1a2e",
    icon: <img src={WALLET_ICONS.freighter} alt="Freighter" className="w-4 h-4 rounded-sm object-contain" />,
  },
  albedo: {
    name: "Albedo",
    color: "#2563eb",
    icon: <img src={WALLET_ICONS.albedo} alt="Albedo" className="w-4 h-4 rounded-sm object-contain" />,
  },
  xbull: {
    name: "xBull",
    color: "#059669",
    icon: <img src={WALLET_ICONS.xbull} alt="xBull" className="w-4 h-4 rounded-sm object-contain" />,
  },
  lobstr: {
    name: "Lobstr",
    color: "#4338ca",
    icon: <img src={WALLET_ICONS.lobstr} alt="Lobstr" className="w-4 h-4 rounded-sm object-contain" />,
  },
};


/* Smooth bezier curve line chart for weekly earnings trend */
function WeeklyEarningsTrendChart({ history }: { history: RewardHistoryItem[] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // 1. Get day index from Monday (0) to Sunday (6)
  const getDayIndex = (date: Date) => {
    const day = date.getDay();
    return day === 0 ? 6 : day - 1;
  };

  const today = new Date();
  const currentDayIndex = getDayIndex(today);

  // 2. Monday of the current week at 00:00:00 local time
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - currentDayIndex);
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfWeekMs = startOfWeek.getTime();

  // 3. Populate daily earnings
  const dailyEarnings = [0, 0, 0, 0, 0, 0, 0];
  if (history && history.length > 0) {
    history.forEach(item => {
      const itemDate = new Date(item.timestamp);
      if (item.timestamp >= startOfWeekMs) {
        const idx = getDayIndex(itemDate);
        if (idx >= 0 && idx < 7) {
          dailyEarnings[idx] += item.reward;
        }
      }
    });
  }

  // 4. Calculate scaling values (minimum max value of 10 XLM)
  const maxVal = Math.max(...dailyEarnings, 10);
  const midVal = maxVal / 2;

  // 5. Generate coordinates
  const points = dailyEarnings.map((val, i) => {
    const x = 10 + i * (280 / 6);
    const y = 110 - (val / maxVal) * 100;
    return { x, y };
  });

  // 6. Generate cubic bezier spline path
  const getBezierPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 3;
      const cp1y = p0.y;
      const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = getBezierPath(points);
  const fillPath = `${linePath} L ${points[points.length - 1].x} 110 L ${points[0].x} 110 Z`;
  const todayPoint = points[currentDayIndex];

  return (
    <div className="space-y-4">
      {/* Chart container */}
      <div className="relative flex items-stretch h-36">
        {/* Y Axis Labels */}
        <div className="w-12 shrink-0 flex flex-col justify-between text-[10px] font-bold text-[var(--dah-outline)] pr-2 py-1 select-none text-right">
          <span>{maxVal.toFixed(0)} XLM</span>
          <span>{midVal.toFixed(0)} XLM</span>
          <span>0 XLM</span>
        </div>
        
        {/* SVG Curve Line Chart */}
        <div className="flex-1 relative">
          <svg viewBox="0 0 300 120" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
              {/* Gradient for the fill area under the line */}
              <linearGradient id="chart-fill-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbd44" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#fbbd44" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Grid Line guides */}
            <line x1="0" y1="10" x2="300" y2="10" stroke="#f1f3ff" strokeDasharray="3 3" />
            <line x1="0" y1="60" x2="300" y2="60" stroke="#f1f3ff" strokeDasharray="3 3" />
            <line x1="0" y1="110" x2="300" y2="110" stroke="#e9edff" strokeWidth="1" />
            
            {/* Area under the curve */}
            <path
              d={fillPath}
              fill="url(#chart-fill-gradient)"
            />
            {/* Smooth Bezier Line Stroke */}
            <path
              d={linePath}
              fill="none"
              stroke="#ffbf21"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Highlight point on the peak */}
            <circle cx={todayPoint.x} cy={todayPoint.y} r="4.5" fill="var(--dah-primary)" stroke="#ffbf21" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* X Axis Day Labels */}
      <div className="flex items-center text-[11px] font-bold text-[var(--dah-outline)] select-none">
        {/* Spacer to match Y Axis Labels width */}
        <div className="w-12 shrink-0 pr-2" />
        
        {/* Labels container matching SVG chart width */}
        <div className="flex-1 relative h-5">
          {days.map((day, i) => {
            const pct = ((10 + i * (280 / 6)) / 300) * 100;
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 text-center"
                style={{ left: `${pct}%` }}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Bottom label section */}
      <div className="pt-2 border-t border-slate-100 flex flex-col items-center">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--dah-outline)] font-display">
          Day of Week
        </span>
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0,
      delayChildren: 0,
    }
  }
};

const itemVariants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    y: 20,
  },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 110,
      damping: 19,
      mass: 0.9,
    }
  }
};

export function WalletProfile({
  walletAddress, walletId, isFunded, treasuryInfo,
  isConnecting, onConnect, onDisconnect, onFund, onRefresh, history
}: WalletProfileProps) {
  const isMobile = typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const totalEarned = history ? history.reduce((sum, item) => sum + item.reward, 0) : 0;

  const handleRefreshClick = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // ── Weekly earnings trend vs last week ───────────────────────────────────
  const weeklyTrendLabel = (() => {
    const getDayIndex = (d: Date) => { const day = d.getDay(); return day === 0 ? 6 : day - 1; };
    const today = new Date();
    const currentDayIndex = getDayIndex(today);

    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - currentDayIndex);
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const startOfThisWeekMs = startOfThisWeek.getTime();
    const startOfLastWeekMs = startOfLastWeek.getTime();

    let thisWeek = 0, lastWeek = 0;
    (history ?? []).forEach(item => {
      if (item.timestamp >= startOfThisWeekMs) thisWeek += item.reward;
      else if (item.timestamp >= startOfLastWeekMs) lastWeek += item.reward;
    });

    if (lastWeek === 0) {
      return thisWeek > 0 ? "New this week" : "No data yet";
    }
    const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    return pct >= 0 ? `+${pct}% vs last week` : `${pct}% vs last week`;
  })();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="p-5 space-y-5"
    >
      {walletAddress ? (
        /* ── CONNECTED DASHBOARD STATE ── */
        <>
          {/* Header with Title and Refresh Button */}
          <motion.div variants={itemVariants} className="flex items-center justify-between px-1">
            <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--dah-primary)] font-display">
              My Wallet
            </h2>
            <button
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="p-2 rounded-full hover:bg-[var(--dah-surface-low)] text-[var(--dah-primary)] transition-all flex items-center justify-center disabled:opacity-50"
              title="Refresh Balance"
            >
              <RefreshCw className={`w-4.5 h-4.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </motion.div>

          {/* Balance Hero Card - 28px/32px corner radius, Level 1 elevation */}
          <motion.div
            variants={itemVariants}
            className="bg-[var(--dah-primary-container)] rounded-[28px] p-6 text-white relative overflow-hidden shadow-lg shadow-[var(--dah-primary-container)]/15"
          >
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />

            <div className="relative space-y-4">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[var(--dah-secondary-container)]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/60 font-display">
                  Total Earned
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-[44px] font-extrabold leading-none tracking-tight font-display">
                  {totalEarned.toFixed(2)}
                </span>
                <span className="text-[18px] font-extrabold text-[var(--dah-on-primary-container)]">XLM</span>
              </div>

              {/* Wallet name / address toggle chip */}
              <button
                onClick={() => setShowAddress(v => !v)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 max-w-full overflow-hidden hover:bg-white/20 transition-colors active:scale-95"
              >
                <ShieldCheck className="w-4 h-4 text-[var(--dah-secondary-container)] shrink-0" />
                <span className="text-[12px] font-mono text-white/95 truncate">
                  {showAddress
                    ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-8)}`
                    : (() => {
                        try {
                          const name = StellarWalletsKit.selectedModule.productName;
                          if (name) return name;
                        } catch {}
                        return walletId && WALLET_META[walletId] ? WALLET_META[walletId].name : "Stellar Wallet";
                      })()
                  }
                </span>
              </button>
            </div>
          </motion.div>
          {/* Weekly Earnings Trend Card - 24px corner radius */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)] p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-extrabold text-[var(--dah-on-surface)] font-display">Weekly Earnings Trend</span>
              <span className="flex items-center gap-1 text-[11.5px] text-[var(--dah-primary)] font-bold font-display">
                <TrendingUp className="w-3.5 h-3.5" />
                {weeklyTrendLabel}
              </span>
            </div>
            <WeeklyEarningsTrendChart history={history} />
          </motion.div>

          {/* Funding Prompt for fresh testnet accounts */}
          {!isFunded && (
            <motion.button
              variants={itemVariants}
              onClick={onFund}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-full bg-[var(--dah-secondary-container)] text-[var(--dah-on-secondary-container)] font-extrabold text-[14px] hover:brightness-105 transition-colors duration-200 shadow-md shadow-[var(--dah-secondary-container)]/25 font-display uppercase tracking-[0.02em]"
            >
              <RefreshCw className="w-4 h-4" />
              Claim Friendbot Testnet XLM
            </motion.button>
          )}

          {/* Performance Section */}
          <motion.div
            variants={itemVariants}
            className="space-y-3"
          >
            <h3 className="text-[20px] font-extrabold text-[var(--dah-primary)] font-display px-1">
              Performance
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Total Earned Card */}
              <div className="bg-[var(--dah-surface-low)] rounded-[24px] p-4 flex flex-col items-center justify-center border border-[var(--dah-outline-variant)]/30 text-center shadow-sm">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--dah-outline)]">
                  <Check className="w-3.5 h-3.5 stroke-[2.5] text-[var(--dah-primary)]" />
                  <span>Total Earned</span>
                </div>
                <div className="flex items-baseline gap-1 mt-1.5 font-display">
                  <span className="text-[26px] font-extrabold text-[var(--dah-primary)] leading-none">
                    {totalEarned.toFixed(1)}
                  </span>
                  <span className="text-[12px] font-bold text-[var(--dah-outline)]">XLM</span>
                </div>
              </div>

              {/* Pending Card */}
              <div className="bg-[var(--dah-surface-low)] rounded-[24px] p-4 flex flex-col items-center justify-center border border-[var(--dah-outline-variant)]/30 text-center shadow-sm">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--dah-outline)]">
                  <Clock className="w-3.5 h-3.5 stroke-[2.5] text-[var(--dah-primary)]" />
                  <span>Pending</span>
                </div>
                <div className="flex items-baseline gap-1 mt-1.5 font-display">
                  <span className="text-[26px] font-extrabold text-[var(--dah-secondary)] leading-none">
                    0.0
                  </span>
                  <span className="text-[12px] font-bold text-[var(--dah-outline)]">XLM</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Treasury Stats - Top-heavy shape styling */}
          <motion.div
            variants={itemVariants}
            className="bg-[var(--dah-primary)] rounded-[24px] p-5 text-white shadow-sm space-y-4"
          >
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
          </motion.div>

          {/* Disconnect Button - Fully Rounded Pill */}
          <motion.button
            variants={itemVariants}
            onClick={onDisconnect}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-transparent border border-[var(--dah-error)] text-[var(--dah-error)] font-bold text-[14px] hover:bg-[var(--dah-error-container)] transition-colors duration-200 font-display uppercase tracking-[0.02em]"
          >
            <LogOut className="w-4 h-4" />
            Disconnect Wallet
          </motion.button>
        </>
      ) : (
        /* ── DISCONNECTED CONNECT WALLET STATE (STRICT MOCKUP LAYOUT) ── */
        <>
          {/* Hero Illustration Section */}
          <motion.div variants={itemVariants} className="flex flex-col items-center pt-4 pb-2">
            {/* Large gold circular background */}
            <div className="relative w-36 h-36 rounded-full bg-[#ffe8ab] flex items-center justify-center shadow-inner">
              {/* White rounded-square wallet container */}
              <div className="w-24 h-24 bg-white rounded-[28px] flex items-center justify-center shadow-md relative border border-white/10">
                <CustomWallet className="w-12 h-12 text-[#00162b]" strokeWidth={2.2} />
                
                {/* Overlapping gold pill badge: $ XLM */}
                <div className="absolute -bottom-1 -right-3.5 bg-[#ffbf21] text-[#6e4f00] text-[10px] font-extrabold px-3 py-1 rounded-full shadow-md whitespace-nowrap border-2 border-white font-display">
                  $ XLM
                </div>
              </div>
            </div>
          </motion.div>

          {/* Headline and description */}
          <motion.div variants={itemVariants} className="text-center space-y-1.5 px-2">
            <h2 className="text-[24px] font-extrabold tracking-tight text-[#00162b] font-display">
              Connect Your Wallet
            </h2>
            <p className="text-[13px] text-[var(--dah-on-surface-variant)] leading-relaxed max-w-[280px] mx-auto font-semibold">
              Link your Stellar wallet to start receiving XLM rewards for your achievements.
            </p>
          </motion.div>

          {/* Wallet Options List - Pill-shaped items */}
          <div className="space-y-3 pt-2">
            {/* Freighter Card */}
            <motion.div
              variants={itemVariants}
              className={`flex items-center justify-between p-4 rounded-full bg-[var(--dah-surface-low)] border border-[var(--dah-outline-variant)]/45 transition-colors duration-200 shadow-sm ${
                isMobile ? "opacity-60" : "hover:border-[var(--dah-primary)]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-slate-100">
                  <img src={WALLET_ICONS.freighter} alt="Freighter" className="w-6 h-6 rounded-sm object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[14px] font-extrabold text-[var(--dah-on-surface)]">Freighter</span>
                    {!isMobile && (
                      <span className="text-[8px] font-extrabold text-[#6e4f00] bg-[#ffbf21] px-1.5 py-0.5 rounded-full font-display">
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--dah-on-surface-variant)] font-semibold truncate">
                    {isMobile ? "Extension unavailable on mobile" : "Stellar Browser Extension"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onConnect("freighter")}
                disabled={isConnecting || isMobile}
                className={`px-4.5 py-2.5 text-[13px] font-extrabold rounded-full transition-all shrink-0 font-display shadow-sm ${
                  isMobile
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                    : "bg-[#00162b] hover:bg-[#061d32] text-white"
                }`}
              >
                {isMobile ? "N/A" : "Connect"}
              </button>
            </motion.div>

            {/* Albedo Card */}
            <motion.div
              variants={itemVariants}
              className="w-full flex items-center justify-between p-4 rounded-[28px] bg-[var(--dah-surface-low)] border border-[var(--dah-outline-variant)]/40 hover:border-[var(--dah-primary)] transition-colors duration-200 text-left shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-slate-100">
                  <img src={WALLET_ICONS.albedo} alt="Albedo" className="w-6 h-6 rounded-sm object-contain" />
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-extrabold text-[var(--dah-on-surface)] block">Albedo</span>
                  <p className="text-[10px] text-[var(--dah-on-surface-variant)] font-semibold">Web-based signer</p>
                </div>
              </div>
              <button
                onClick={() => onConnect("albedo")}
                disabled={isConnecting}
                className="px-4.5 py-2.5 text-[13px] font-extrabold rounded-full transition-all bg-[#00162b] hover:bg-[#061d32] text-white shrink-0 shadow-sm font-display cursor-pointer"
              >
                Connect
              </button>
            </motion.div>

            {/* xBull Card */}
            <motion.div
              variants={itemVariants}
              className="w-full flex items-center justify-between p-4 rounded-[28px] bg-[var(--dah-surface-low)] border border-[var(--dah-outline-variant)]/40 hover:border-[var(--dah-primary)] transition-colors duration-200 text-left shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-slate-100">
                  <img src={WALLET_ICONS.xbull} alt="xBull" className="w-6 h-6 rounded-sm object-contain" />
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-extrabold text-[var(--dah-on-surface)] block">xBull</span>
                  <p className="text-[10px] text-[var(--dah-on-surface-variant)] font-semibold">Secure mobile & desktop</p>
                </div>
              </div>
              <button
                onClick={() => onConnect("xbull")}
                disabled={isConnecting}
                className="px-4.5 py-2.5 text-[13px] font-extrabold rounded-full transition-all bg-[#00162b] hover:bg-[#061d32] text-white shrink-0 shadow-sm font-display cursor-pointer"
              >
                Connect
              </button>
            </motion.div>

            {/* Lobstr Card */}
            <motion.div
              variants={itemVariants}
              className="w-full flex items-center justify-between p-4 rounded-[28px] bg-[var(--dah-surface-low)] border border-[var(--dah-outline-variant)]/40 hover:border-[var(--dah-primary)] transition-colors duration-200 text-left shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-slate-100">
                  <img src={WALLET_ICONS.lobstr} alt="Lobstr" className="w-6 h-6 rounded-sm object-contain" />
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-extrabold text-[var(--dah-on-surface)] block">Lobstr</span>
                  <p className="text-[10px] text-[var(--dah-on-surface-variant)] font-semibold">Popular mobile wallet</p>
                </div>
              </div>
              <button
                onClick={() => onConnect("lobstr")}
                disabled={isConnecting}
                className="px-4.5 py-2.5 text-[13px] font-extrabold rounded-full transition-all bg-[#00162b] hover:bg-[#061d32] text-white shrink-0 shadow-sm font-display cursor-pointer"
              >
                Connect
              </button>
            </motion.div>
          </div>

          {/* Promotion Card (New to Stellar?) */}
          <motion.div
            variants={itemVariants}
            className="p-5 rounded-[24px] bg-[var(--dah-surface-low)] border border-dashed border-[var(--dah-outline-variant)] text-center space-y-3.5 shadow-sm mt-2"
          >
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
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#ffbf21] hover:brightness-105 text-[#00162b] font-extrabold text-[13px] transition-colors duration-200 shadow-sm font-display uppercase tracking-wider"
            >
              <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[11px] font-black leading-none text-[#ffbf21]">+</span>
              <span>Create New Wallet</span>
            </a>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
