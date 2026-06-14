import { User, Award, Flame, ClipboardList, Coins, CheckCircle2, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";
import { type RewardHistoryItem } from "./RewardHistory";

interface StudentProfileProps {
  walletAddress: string | null;
  history: RewardHistoryItem[];
}

export function StudentProfile({ walletAddress, history }: StudentProfileProps) {
  // Calculations
  const totalEarned = history.reduce((sum, item) => sum + item.reward, 0);
  const totalSubmissions = history.length;
  
  // Dynamic Badge Unlocking
  const volunteeredCount = history.filter(h => h.activity.toLowerCase().includes("volunteer")).length;
  const tutoredCount = history.filter(h => h.activity.toLowerCase().includes("tutor")).length;

  const badges = [
    {
      id: "white_belt",
      name: "White Belt",
      desc: "Linked wallet and started your journey",
      unlocked: walletAddress !== null,
      color: "from-slate-400 to-slate-500",
    },
    {
      id: "yellow_belt",
      name: "Yellow Belt",
      desc: "Earned 2 or more academic rewards",
      unlocked: totalSubmissions >= 2,
      color: "from-yellow-500 to-amber-600",
    },
    {
      id: "orange_belt",
      name: "Orange Belt",
      desc: "Completed 5 or more academic rewards",
      unlocked: totalSubmissions >= 5,
      color: "from-orange-500 to-red-600",
    },
    {
      id: "stellar_helper",
      name: "Stellar Helper",
      desc: "Completed a volunteering activity",
      unlocked: volunteeredCount > 0,
      color: "from-emerald-500 to-teal-600",
    },
    {
      id: "peer_tutor",
      name: "Peer Tutor",
      desc: "Helped a classmate through tutoring",
      unlocked: tutoredCount > 0,
      color: "from-sky-500 to-indigo-600",
    },
    {
      id: "honor_roll",
      name: "Honor Scholar",
      desc: "Accumulated more than 20 XLM in rewards",
      unlocked: totalEarned >= 20,
      color: "from-purple-500 to-fuchsia-600",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      {/* Profile Header Card */}
      <div className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)] p-5 shadow-sm flex items-center gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-[var(--dah-primary-container)] flex items-center justify-center text-[var(--dah-secondary-container)] shadow-inner shrink-0">
          <User className="w-8 h-8" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-[20px] font-extrabold tracking-tight text-[var(--dah-primary)] font-display">
            Xander Dacillo
          </h2>
          <p className="text-[12px] text-[var(--dah-outline)] font-bold uppercase tracking-wider">
            Academic Explorer
          </p>
          {walletAddress ? (
            <span className="inline-flex text-[11px] font-mono bg-[var(--dah-surface-low)] text-[var(--dah-on-surface-variant)] px-2 py-0.5 rounded-full border border-[var(--dah-outline-variant)]/30">
              {walletAddress.slice(0, 6)}…{walletAddress.slice(-6)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--dah-error)] bg-[var(--dah-error-container)] px-2 py-0.5 rounded-full">
              <ShieldAlert className="w-3 h-3" />
              Wallet Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Rewards", value: `${totalEarned} XLM`, icon: Coins },
          { label: "Approved", value: totalSubmissions, icon: ClipboardList },
          { label: "Streak", value: "3 Days", icon: Flame },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)] p-3.5 text-center flex flex-col items-center justify-center space-y-1.5 shadow-sm"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--dah-surface-low)] flex items-center justify-center text-[var(--dah-primary)]">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--dah-outline)] uppercase tracking-wider">{stat.label}</p>
                <p className="text-[14px] font-extrabold text-[var(--dah-primary)] font-display mt-0.5">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Badges / Achievements section */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--dah-outline)] px-1 font-display">
          Unlocked Milestones
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`bg-white rounded-[24px] border p-4 flex flex-col justify-between h-36 relative overflow-hidden transition-all duration-300 ${
                badge.unlocked
                  ? "border-[var(--dah-primary)]/20 shadow-md shadow-slate-100"
                  : "border-[var(--dah-outline-variant)]/60 opacity-60"
              }`}
            >
              {/* Decorative background circle */}
              {badge.unlocked && (
                <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-slate-50 pointer-events-none" />
              )}

              <div className="space-y-1 relative">
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-tr ${badge.color}`}>
                    <Award className="w-4 h-4" />
                  </div>
                  {badge.unlocked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : null}
                </div>
                
                <h4 className="text-[13px] font-extrabold text-[var(--dah-primary)] font-display pt-1">
                  {badge.name}
                </h4>
                <p className="text-[10px] text-[var(--dah-on-surface-variant)] leading-snug font-semibold line-clamp-2">
                  {badge.desc}
                </p>
              </div>

              <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block w-fit ${
                badge.unlocked
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-slate-100 text-slate-400"
              }`}>
                {badge.unlocked ? "Unlocked" : "Locked"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
