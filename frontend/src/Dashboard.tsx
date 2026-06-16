import { useState } from "react";
import { Flame, UserPlus, ChevronRight, MessageSquare, Flag, Check, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { type RewardHistoryItem } from "./RewardHistory";

interface DashboardProps {
  userName: string;
  history: RewardHistoryItem[];
  walletAddress: string | null;
  onSubmitActivityClick: () => void;
  onConnectWalletClick: () => void;
  onInviteClick?: () => void;
  userAvatar: string;
}

interface FeedItem {
  id: string;
  type: string;
  name: string;
  avatar?: string;
  content: React.ReactNode;
  timestamp: number;
  timeStr: string;
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

// Helper for formatting time ago
const formatTimeAgo = (timestamp: number) => {
  const diffMs = Date.now() - timestamp;
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

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
      stiffness: 80,
      damping: 20,
      mass: 0.9,
    }
  }
};

export function Dashboard({
  userName,
  history,
  walletAddress,
  onSubmitActivityClick,
  onConnectWalletClick,
  onInviteClick,
  userAvatar,
}: DashboardProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic Streak Calculation (from history)
  const streak = (() => {
    if (history.length === 0) return 0;
    const daySet = new Set(
      history.map(item => new Date(item.timestamp).toLocaleDateString("en-CA"))
    );
    let count = 0;
    const today = new Date();
    const startOffset = daySet.has(today.toLocaleDateString("en-CA")) ? 0 : 1;
    for (let i = startOffset; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (daySet.has(d.toLocaleDateString("en-CA"))) {
        count++;
      } else {
        break;
      }
    }
    return count;
  })();

  // Today's completed activity count
  const todayStr = new Date().toLocaleDateString("en-CA");
  const todayCount = history.filter(
    item => new Date(item.timestamp).toLocaleDateString("en-CA") === todayStr
  ).length;

  const handleInviteClick = () => {
    navigator.clipboard.writeText(`https://achievo.app/invite/${userName.toLowerCase()}`);
    setToastMessage("Invite link copied to clipboard!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Setup Community Pulse feed items
  const mockSarah = {
    id: "mock-sarah",
    type: "peer",
    name: "Sarah",
    avatar: "/sarah_avatar.webp",
    content: (
      <span>
        <strong className="text-[13px] font-bold text-[#00162b]">Sarah</strong>
        <span className="text-[13px] text-gray-500"> just earned </span>
        <strong className="text-[13px] font-extrabold text-[#0a235c]">5 XLM</strong>
        <span className="text-[13px] text-gray-500"> for </span>
        <strong className="text-[13px] font-bold text-[#00162b]">Tutoring</strong>
      </span>
    ),
    timestamp: Date.now() - 2 * 60 * 1000, // 2 mins ago
    timeStr: "2 mins ago",
  };

  const mockGoal = {
    id: "mock-goal",
    type: "goal",
    name: "Campus Goal",
    content: (
      <div className="space-y-0.5">
        <div className="text-[13px] text-[#00162b] font-bold">
          Campus Goal: <span className="text-emerald-600 font-extrabold">85% reached!</span>
        </div>
        <div className="text-[12px] text-gray-500 font-semibold leading-normal">
          Let's keep it up!
        </div>
      </div>
    ),
    timestamp: Date.now() - 60 * 60 * 1000, // 1 hr ago
    timeStr: "1 hr ago",
  };

  // Convert real user history items to feed items
  const userFeedItems = history.slice(0, 2).map(item => {
    // Simplify long text to keep the clean list look
    const activityText = item.activity.replace(/^I\s+(volunteered\s+at\s+the\s+|tutored\s+a\s+classmate\s+in\s+|attended\s+a\s+workshop\s+on\s+|participated\s+in\s+)/i, "").trim();
    const cleanActivity = activityText.charAt(0).toUpperCase() + activityText.slice(1);
    
    return {
      id: item.id,
      type: "user",
      name: "You",
      avatar: userAvatar,
      content: (
        <span>
          <strong className="text-[13px] font-bold text-[#00162b]">You</strong>
          <span className="text-[13px] text-gray-500"> just earned </span>
          <strong className="text-[13px] font-extrabold text-[#0a235c]">{item.reward} XLM</strong>
          <span className="text-[13px] text-gray-500"> for </span>
          <strong className="text-[13px] font-bold text-[#00162b]">{(cleanActivity.length > 25 ? cleanActivity.slice(0, 25) + "..." : cleanActivity)}</strong>
        </span>
      ),
      timestamp: item.timestamp,
      timeStr: formatTimeAgo(item.timestamp),
    };
  });

  // Combine and sort by timestamp
  const feedItems: FeedItem[] = [mockSarah, ...userFeedItems, mockGoal].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
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

      {/* Community Pulse Section */}
      <motion.div
        variants={itemVariants}
        className="bg-[#f5f6fa] rounded-[32px] p-5 space-y-4 shadow-sm border border-[#eef1f6]"
      >
        {/* Section Header */}
        <div className="flex items-center gap-2.5 px-1">
          <MessageSquare className="w-5 h-5 text-[#0f3b8c]" strokeWidth={2.2} />
          <h3 className="text-[17px] font-extrabold text-[#00162b] font-display">
            Community Pulse
          </h3>
        </div>

        {/* Feed List */}
        <div className="space-y-3">
          {feedItems.map(item => {
            if (item.type === "goal") {
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-[24px] p-4 flex items-start gap-3.5 shadow-sm border border-white/5 hover:translate-y-[-1px] transition-transform duration-200"
                >
                  <div className="w-11 h-11 rounded-full bg-[#0f3b8c] flex items-center justify-center text-white shrink-0 shadow-inner">
                    <Flag className="w-5 h-5" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    {item.content}
                    <div className="text-[10px] text-gray-400 font-bold tracking-wide mt-1">
                      {item.timeStr}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className="bg-white rounded-[24px] p-4 flex items-center gap-3.5 shadow-sm border border-white/5 hover:translate-y-[-1px] transition-transform duration-200"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                  <img
                    src={item.avatar || ""}
                    className="w-full h-full object-cover"
                    alt={item.name}
                    onError={e => {
                      // Fallback if image fails
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="leading-snug">{item.content}</div>
                  <div className="text-[10px] text-gray-400 font-bold tracking-wide mt-1">
                    {item.timeStr}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
