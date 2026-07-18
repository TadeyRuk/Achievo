import { useState } from "react";
import { Flame, UserPlus, ChevronRight, Check, Wallet, Snowflake, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { type RewardHistoryItem } from "@achievo/shared";
import { ProgressionAgent, type StoredProgression } from '../earn/progression';

interface DashboardProps {
  userName: string;
  history: RewardHistoryItem[];
  progression?: StoredProgression;
  walletAddress: string | null;
  onSubmitActivityClick: () => void;
  onConnectWalletClick: () => void;
  onInviteClick?: () => void;
}

// Custom SVG Checkmark + Plus Icon to match the design perfectly
const SubmitIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
    {...props}
  >
    {/* Circle with checkmark */}
    <circle cx="10" cy="11" r="7" />
    <path d="m7 11 2 2 4-4" />
    {/* Plus sign at bottom right */}
    <path d="M17 17h5" />
    <path d="M19.5 14.5v5" />
  </svg>
);

// SVG Circular Progress Ring
const ProgressCircle = ({ value, max }: { value: number; max: number }) => {
  const radius = 18;
  const stroke = 3.5;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(value, max) / max) * circumference;

  return (
    <div className="relative flex items-center justify-center w-11 h-11 shrink-0">
      <svg className="w-11 h-11 transform -rotate-90">
        {/* Track circle */}
        <circle
          className="text-white/20"
          strokeWidth={stroke}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="22"
          cy="22"
        />
        {/* Progress circle */}
        <circle
          className="text-[#ffbe42] transition-all duration-700 ease-out"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="22"
          cy="22"
        />
      </svg>
      <span className="absolute text-[11px] font-extrabold text-white">{value}/{max}</span>
    </div>
  );
};

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

export function Dashboard({
  userName,
  history,
  progression,
  walletAddress,
  onSubmitActivityClick,
  onConnectWalletClick,
  onInviteClick,
}: DashboardProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Progression — freeze-aware streak + available freeze tokens (single source of truth)
  const progressionState = ProgressionAgent.state(history, progression ?? {});
  const streak = progressionState.streak;
  const freezes = progressionState.freezes;

  // Today's completed activity count
  const todayStr = new Date().toLocaleDateString("en-CA");
  const todayCount = history.filter(
    item => new Date(item.timestamp).toLocaleDateString("en-CA") === todayStr
  ).length;

  // Coach card uses wall-clock "now"
  const nextWin = ProgressionAgent.getNextWin(history, progression ?? {}, new Date(), todayCount);

  const handleInviteClick = () => {
    navigator.clipboard.writeText(`https://achievo.app/invite/${userName.toLowerCase()}`);
    setToastMessage("Invite link copied to clipboard!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="p-5 space-y-5 relative"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-2 left-5 right-5 z-50 bg-[#061d32] text-white px-4 py-3 rounded-full flex items-center justify-center gap-2 shadow-lg border border-white/10"
          >
            <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
            <span className="text-[12px] font-extrabold tracking-wide font-display">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Hero Card */}
      <motion.div
        variants={itemVariants}
        className="bg-[var(--dah-primary-container)] rounded-[32px] p-6 text-white relative overflow-hidden shadow-xl shadow-[var(--dah-primary-container)]/15"
      >
        {/* Glowing backdrop decorative accents */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

        <div className="relative">
          <h2 className="text-[24px] font-extrabold tracking-tight leading-tight font-display">
            Welcome back, {userName}!
          </h2>
          <p className="text-[13px] text-white/70 font-semibold tracking-wide mt-1">
            Ready to conquer the day?
          </p>

          {/* Glassmorphic Metrics Panel */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[24px] p-4 mt-5 grid grid-cols-2 divide-x divide-white/10">
            {/* Streak count */}
            <div className="flex items-center gap-3 pl-1">
              <div className="w-10 h-10 rounded-full bg-[#ffbe42] flex items-center justify-center text-[#0a235c] shrink-0 shadow-inner">
                <Flame className="w-5.5 h-5.5 fill-current text-[#0a235c]" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[20px] font-extrabold text-white leading-none">{streak}</span>
                  <span className="text-[12px] font-bold text-white leading-none ml-0.5">Day</span>
                </div>
                <span className="text-[9px] font-extrabold text-white/50 tracking-wider uppercase mt-1 leading-none">
                  STREAK
                </span>
                {freezes > 0 && (
                  <motion.div
                    key={freezes}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 16 }}
                    className="mt-1.5 inline-flex items-center gap-1 self-start rounded-full bg-[#bfe6ff]/20 border border-[#bfe6ff]/30 px-1.5 py-0.5"
                    title={`${freezes} streak freeze${freezes === 1 ? "" : "s"} — protects a missed day`}
                  >
                    <Snowflake className="w-3 h-3 text-[#bfe6ff]" strokeWidth={2.5} />
                    <span className="text-[10px] font-extrabold text-[#bfe6ff] leading-none">{freezes}</span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Daily Goal count */}
            <div className="flex items-center gap-3 pl-4">
              <ProgressCircle value={todayCount} max={3} />
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-white leading-none">Goal</span>
                <span className="text-[9px] font-extrabold text-white/50 tracking-wider uppercase mt-1.5 leading-none">
                  ACTIVITIES
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Wallet Disconnected Banner if applicable */}
      {!walletAddress && (
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onConnectWalletClick}
          className="bg-red-50/60 hover:bg-red-100/60 px-4 py-3 rounded-[20px] flex items-center justify-between cursor-pointer transition-colors duration-200 border border-red-100/30 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100/80 flex items-center justify-center text-red-600">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[12.5px] font-bold text-red-800 leading-tight">
                Connect Wallet
              </span>
              <span className="text-[10.5px] font-medium text-red-600/80 leading-tight mt-0.5">
                Required for submitting activities
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-red-400" strokeWidth={2.5} />
        </motion.div>
      )}

      {/* Submit Activity Button (Golden/Yellow) */}
      <motion.button
        data-tour="submit-activity"
        variants={itemVariants}
        whileHover={!walletAddress ? {} : { scale: 1.01 }}
        whileTap={!walletAddress ? {} : { scale: 0.98 }}
        onClick={onSubmitActivityClick}
        disabled={!walletAddress}
        className={`w-full font-extrabold py-4 rounded-[24px] flex items-center justify-center gap-3 transition-colors duration-200 text-[15px] font-display uppercase tracking-wide ${
          !walletAddress
            ? "bg-slate-200 text-slate-400 border border-slate-300/50 cursor-not-allowed shadow-none"
            : "bg-[#ffbe42] text-[#00162b] hover:brightness-105 shadow-lg shadow-[#ffbe42]/15 cursor-pointer"
        }`}
      >
        <SubmitIcon />
        <span>Submit Activity</span>
      </motion.button>

      {/* Invite Friend Button */}
      <motion.button
        variants={itemVariants}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onInviteClick || handleInviteClick}
        className="w-full bg-[#f3f5fa] hover:bg-[#ebedf2] border border-[#e1e3e8]/40 px-5 py-4 rounded-[24px] flex items-center justify-between text-[13px] font-bold text-[#00162b] transition-colors duration-200 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <UserPlus className="w-5 h-5 text-[#00162b]" strokeWidth={2.2} />
          <span>Invite a friend to join Achievo</span>
        </div>
        <ChevronRight className="w-4 h-4 text-[#8a91a0]" strokeWidth={2.5} />
      </motion.button>

      {/* Your Next Win Section */}
      <motion.div
        variants={itemVariants}
        className="bg-[#f5f6fa] rounded-[32px] p-5 space-y-4 shadow-sm border border-[#eef1f6]"
      >
        <div className="flex items-center gap-2.5 px-1">
          <Trophy className="w-5 h-5 text-[#0f3b8c]" strokeWidth={2.2} />
          <h3 className="text-[17px] font-extrabold text-[#00162b] font-display">
            Your Next Win
          </h3>
        </div>

        <div className="bg-white rounded-[24px] p-4 space-y-3 shadow-sm border border-white/5">
          <div className="space-y-1">
            <div className="text-[15px] font-extrabold text-[#00162b] font-display leading-snug">
              {nextWin.title}
            </div>
            <p className="text-[12px] text-gray-500 font-semibold leading-normal">
              {nextWin.subtitle}
            </p>
          </div>

          {nextWin.progressPercent !== null && (
            <div className="space-y-1.5">
              <div className="h-2.5 w-full rounded-full bg-[#eef1f6] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#ffbe42] transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, nextWin.progressPercent))}%` }}
                />
              </div>
              <div className="text-[10px] font-bold text-gray-400 tracking-wide">
                {Math.round(nextWin.progressPercent)}% to next rank
              </div>
            </div>
          )}

          {nextWin.requirements.length > 0 && (
            <ul className="space-y-1.5 pt-0.5">
              {nextWin.requirements.map((req) => (
                <li
                  key={req}
                  className="flex items-start gap-2 text-[12px] font-semibold text-[#00162b]"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0f3b8c] shrink-0" />
                  <span className="leading-snug">{req}</span>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={onSubmitActivityClick}
            disabled={!walletAddress}
            className={`w-full mt-1 py-3 rounded-[18px] flex items-center justify-center gap-2 text-[13px] font-extrabold font-display transition-colors duration-200 ${
              !walletAddress
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-[#0f3b8c] text-white hover:bg-[#0c3175] cursor-pointer"
            }`}
          >
            <span>{nextWin.ctaLabel}</span>
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
