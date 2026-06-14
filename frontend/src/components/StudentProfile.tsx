import { useState } from "react";
import { User, Flame, ClipboardList, Coins, ShieldAlert, Trophy, Sparkles, BookOpen, Heart, Compass, Lock, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
      rimColor: "from-slate-400 via-slate-200 to-slate-500",
      innerColor: "from-slate-700 via-slate-800 to-slate-900",
      iconColor: "text-slate-100",
      icon: Compass,
    },
    {
      id: "yellow_belt",
      name: "Yellow Belt",
      desc: "Earned 2 or more academic rewards",
      unlocked: totalSubmissions >= 2,
      rimColor: "from-amber-400 via-yellow-100 to-amber-600",
      innerColor: "from-amber-700 via-amber-800 to-amber-950",
      iconColor: "text-amber-100",
      icon: Flame,
    },
    {
      id: "orange_belt",
      name: "Orange Belt",
      desc: "Completed 5 or more academic rewards",
      unlocked: totalSubmissions >= 5,
      rimColor: "from-orange-400 via-orange-100 to-red-600",
      innerColor: "from-orange-700 via-orange-800 to-red-950",
      iconColor: "text-orange-100",
      icon: Trophy,
    },
    {
      id: "stellar_helper",
      name: "Stellar Helper",
      desc: "Completed volunteering work (with 'volunteer' in description)",
      unlocked: volunteeredCount > 0,
      rimColor: "from-emerald-400 via-emerald-100 to-teal-600",
      innerColor: "from-emerald-700 via-emerald-800 to-teal-950",
      iconColor: "text-emerald-100",
      icon: Heart,
    },
    {
      id: "peer_tutor",
      name: "Peer Tutor",
      desc: "Helped a classmate through tutoring (with 'tutor' in description)",
      unlocked: tutoredCount > 0,
      rimColor: "from-sky-400 via-sky-100 to-indigo-600",
      innerColor: "from-sky-700 via-sky-800 to-indigo-950",
      iconColor: "text-sky-100",
      icon: BookOpen,
    },
    {
      id: "honor_roll",
      name: "Honor Scholar",
      desc: "Accumulated more than 20 XLM in rewards",
      unlocked: totalEarned >= 20,
      rimColor: "from-purple-400 via-fuchsia-100 to-fuchsia-600",
      innerColor: "from-purple-700 via-purple-800 to-fuchsia-950",
      iconColor: "text-fuchsia-100",
      icon: Sparkles,
    },
  ];

  const [selectedBadgeId, setSelectedBadgeId] = useState<string>("white_belt");
  const selectedBadge = badges.find(b => b.id === selectedBadgeId) || badges[0];
  const SelectedBadgeIcon = selectedBadge.icon;

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
      <div className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--dah-outline)] px-1 font-display">
          Unlocked Milestones
        </p>
        
        {/* Apple Fitness Style 3-Column Badges Grid */}
        <div className="grid grid-cols-3 gap-y-6 gap-x-3 bg-white border border-[var(--dah-outline-variant)] rounded-[32px] p-6 shadow-sm justify-items-center">
          {badges.map((badge) => {
            const BadgeIcon = badge.icon;
            const isSelected = selectedBadgeId === badge.id;
            return (
              <div
                key={badge.id}
                onClick={() => setSelectedBadgeId(badge.id)}
                className="flex flex-col items-center space-y-2 cursor-pointer group relative"
              >
                {/* 3D Badge container */}
                <div className="relative">
                  {/* Selection indicator halo */}
                  {isSelected && (
                    <motion.div
                      layoutId="activeBadgeRing"
                      className="absolute -inset-2.5 rounded-full border-2 border-[var(--dah-primary)] pointer-events-none"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                  
                  {/* Outer Rim (Metallic Gradient Border) */}
                  <motion.div
                    whileHover={{ scale: 1.1, rotateY: 15, rotateX: -10 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ perspective: 1000 }}
                    className={`w-16 h-16 rounded-full p-[3px] shadow-lg flex items-center justify-center relative transition-all duration-300 ${
                      badge.unlocked
                        ? `bg-gradient-to-tr ${badge.rimColor} shadow-black/10`
                        : "bg-gradient-to-tr from-slate-700/50 via-slate-600/50 to-slate-800/50 opacity-70"
                    }`}
                  >
                    {/* Inner Face of the Badge */}
                    <div className={`w-full h-full rounded-full flex items-center justify-center relative overflow-hidden ${
                      badge.unlocked
                        ? `bg-gradient-to-tr ${badge.innerColor}`
                        : "bg-gradient-to-tr from-slate-800 to-slate-900"
                    }`}>
                      {/* Gloss Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-45 translate-y-[-30%] pointer-events-none" />
                      
                      {/* Icon */}
                      <BadgeIcon className={`w-7 h-7 transition-transform duration-300 group-hover:scale-110 ${
                        badge.unlocked
                          ? `${badge.iconColor} filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.5)]`
                          : "text-slate-600"
                      }`} />

                      {/* Small Status Indicator */}
                      {badge.unlocked ? (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white border border-emerald-600 shadow-sm scale-90">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="absolute top-0 right-0 w-4 h-4 bg-slate-800/95 rounded-full flex items-center justify-center text-slate-500 scale-90 border border-slate-700">
                          <Lock className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Badge name label */}
                <span className={`text-[10.5px] font-extrabold text-center font-display tracking-tight transition-colors duration-200 ${
                  isSelected
                    ? "text-[var(--dah-primary)]"
                    : "text-[var(--dah-on-surface-variant)] group-hover:text-[var(--dah-primary)]"
                }`}>
                  {badge.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Badge Detail Card (Apple Fitness Style) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedBadge.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white rounded-[28px] border border-[var(--dah-outline-variant)] p-5 shadow-md flex items-center gap-4.5 relative overflow-hidden"
        >
          {/* Animated Floating Badge representation */}
          <div className="relative shrink-0 w-20 h-20 flex items-center justify-center">
            {selectedBadge.unlocked && (
              <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${selectedBadge.rimColor} opacity-20 blur-xl`} />
            )}
            
            <motion.div
              animate={{ rotateY: 360 }}
              transition={{ repeat: Infinity, duration: 9, ease: "linear" }}
              style={{ perspective: 1000, transformStyle: "preserve-3d" }}
              className={`w-16 h-16 rounded-full p-[3px] shadow-xl flex items-center justify-center relative ${
                selectedBadge.unlocked
                  ? `bg-gradient-to-tr ${selectedBadge.rimColor}`
                  : "bg-gradient-to-tr from-slate-700/50 via-slate-600/50 to-slate-800/50"
              }`}
            >
              <div className={`w-full h-full rounded-full flex items-center justify-center relative ${
                selectedBadge.unlocked
                  ? `bg-gradient-to-tr ${selectedBadge.innerColor}`
                  : "bg-gradient-to-tr from-slate-800 to-slate-900"
              }`}>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-45 translate-y-[-30%]" />
                <SelectedBadgeIcon className={`w-7 h-7 ${
                  selectedBadge.unlocked
                    ? `${selectedBadge.iconColor} filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.5)]`
                    : "text-slate-600"
                }`} />
              </div>
            </motion.div>
          </div>

          {/* Badge details */}
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-[16px] font-extrabold text-[var(--dah-primary)] font-display">
                {selectedBadge.name}
              </h4>
              <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                selectedBadge.unlocked
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {selectedBadge.unlocked ? "Earned" : "Locked"}
              </span>
            </div>
            
            <p className="text-[12.5px] text-[var(--dah-on-surface-variant)] leading-normal font-semibold">
              {selectedBadge.desc}
            </p>
            
            {selectedBadge.unlocked ? (
              <p className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1 pt-0.5">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                Unlocked & On-Chain Confirmed
              </p>
            ) : (
              <p className="text-[10px] text-slate-500 font-extrabold flex items-center gap-1 pt-0.5">
                <Lock className="w-3.5 h-3.5" />
                Complete challenges to earn this badge
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
