import { 
  ExternalLink, 
  Calendar, 
  CheckCircle, 
  Flame, 
  Trophy, 
  Users, 
  Brain, 
  Plane, 
  Gem, 
  Sparkles, 
  Award 
} from "lucide-react";
import { motion } from "motion/react";
import { CustomTrophy, CustomUserHeart, CustomBookUser, CustomBookOpen, CustomMedal } from "./customIcons";

export interface RewardHistoryItem {
  id: string;
  activity: string;
  reward: number;
  txHash: string;
  timestamp: number;
}

interface RewardHistoryProps {
  history: RewardHistoryItem[];
}

const ACTIVITY_ICONS: Record<string, React.ComponentType<any>> = {
  volunteering: CustomUserHeart,
  tutoring: CustomBookUser,
  workshop: CustomBookOpen,
  event: CustomMedal,
  participation: CustomMedal,
};

export function RewardHistory({ history }: RewardHistoryProps) {
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

  const getIcon = (act: string) => {
    return ACTIVITY_ICONS[act.toLowerCase()] || CustomTrophy;
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Dynamic streak — consecutive days with at least one reward (going back from today)
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

  // Activity milestones counts
  const volunteeringCount = history.filter(h => h.activity.toLowerCase().includes("volunteer")).length;
  const tutoringOrMathCount = history.filter(h => 
    h.activity.toLowerCase().includes("tutor") || 
    h.activity.toLowerCase().includes("math")
  ).length;
  const workshopCount = history.filter(h => h.activity.toLowerCase().includes("workshop")).length;
  const scienceCount = history.filter(h => h.activity.toLowerCase().includes("science")).length;

  // Rank calculations
  const totalEarned = history.reduce((sum, item) => sum + item.reward, 0);
  const baseXP = 0;
  const totalXP = baseXP + Math.round(totalEarned * 100);
  
  const getRankInfo = (xp: number, streakVal: number) => {
    const isDiamond = xp >= 10000 && scienceCount >= 1 && streakVal >= 5;
    const isPlatinum = xp >= 5000 && workshopCount >= 1 && streakVal >= 3;
    const isGold = xp >= 2500 && tutoringOrMathCount >= 1;
    const isSilver = xp >= 1000 && volunteeringCount >= 1;

    if (isDiamond) {
      return { 
        name: "Diamond Scholar", 
        nextName: "Max Rank", 
        minXP: 10000, 
        maxXP: 10000,
        reqMsg: "You have reached the highest scholar rank!"
      };
    } else if (isPlatinum) {
      let reqMsg = "";
      if (xp < 10000) {
        const diff = 10000 - xp;
        reqMsg = `Earn ${diff.toLocaleString()} more XP (approx. ${diff / 100} XLM)`;
      }
      if (scienceCount < 1) reqMsg = reqMsg ? `${reqMsg} and log 1 Science activity` : "Log 1 Science activity";
      if (streakVal < 5) reqMsg = reqMsg ? `${reqMsg} and reach a 5-Day Streak` : "Reach a 5-Day Streak";

      return { 
        name: "Platinum Scholar", 
        nextName: "Diamond Scholar", 
        minXP: 5000, 
        maxXP: 10000,
        reqMsg: reqMsg ? `${reqMsg} to rank up!` : "Ready to rank up!"
      };
    } else if (isGold) {
      let reqMsg = "";
      if (xp < 5000) {
        const diff = 5000 - xp;
        reqMsg = `Earn ${diff.toLocaleString()} more XP (approx. ${diff / 100} XLM)`;
      }
      if (workshopCount < 1) reqMsg = reqMsg ? `${reqMsg} and log 1 Workshop` : "Log 1 Workshop";
      if (streakVal < 3) reqMsg = reqMsg ? `${reqMsg} and reach a 3-Day Streak` : "Reach a 3-Day Streak";

      return { 
        name: "Gold Scholar", 
        nextName: "Platinum Scholar", 
        minXP: 2500, 
        maxXP: 5000,
        reqMsg: reqMsg ? `${reqMsg} to rank up!` : "Ready to rank up!"
      };
    } else if (isSilver) {
      let reqMsg = "";
      if (xp < 2500) {
        const diff = 2500 - xp;
        reqMsg = `Earn ${diff.toLocaleString()} more XP (approx. ${diff / 100} XLM)`;
      }
      if (tutoringOrMathCount < 1) reqMsg = reqMsg ? `${reqMsg} and log 1 Tutoring or Math activity` : "Log 1 Tutoring or Math activity";

      return { 
        name: "Silver Scholar", 
        nextName: "Gold Scholar", 
        minXP: 1000, 
        maxXP: 2500,
        reqMsg: reqMsg ? `${reqMsg} to rank up!` : "Ready to rank up!"
      };
    } else {
      let reqMsg = "";
      if (xp < 1000) {
        const diff = 1000 - xp;
        reqMsg = `Earn ${diff.toLocaleString()} more XP (approx. ${diff / 100} XLM)`;
      }
      if (volunteeringCount < 1) reqMsg = reqMsg ? `${reqMsg} and log 1 Volunteering activity` : "Log 1 Volunteering activity";

      return { 
        name: "Bronze Scholar", 
        nextName: "Silver Scholar", 
        minXP: 0, 
        maxXP: 1000,
        reqMsg: reqMsg ? `${reqMsg} to rank up!` : "Ready to rank up!"
      };
    }
  };

  const rank = getRankInfo(totalXP, streak);
  const progressPercent = rank.minXP === rank.maxXP ? 100 : Math.min(100, Math.max(0, ((totalXP - rank.minXP) / (rank.maxXP - rank.minXP)) * 100));

  const milestones = [
    {
      id: "streak",
      name: "7-Day Streak",
      unlocked: streak > 0,
      icon: Flame,
      activeBg: "bg-[#e2e6ff]",
      activeIconColor: "text-[#102a9c]",
      dot: true
    },
    {
      id: "first_win",
      name: "First Win",
      unlocked: history.length >= 1,
      icon: Trophy,
      activeBg: "bg-[#ffe28a]",
      activeIconColor: "text-[#b88a00]"
    },
    {
      id: "team_player",
      name: "Team Player",
      unlocked: volunteeringCount >= 1,
      icon: Users,
      activeBg: "bg-[#e2e6ff]",
      activeIconColor: "text-[#102a9c]"
    },
    {
      id: "mastermind",
      name: "Mastermind",
      unlocked: tutoringOrMathCount >= 1,
      icon: Brain,
      activeBg: "bg-[#e2e6ff]",
      activeIconColor: "text-[#102a9c]"
    },
    {
      id: "explorer",
      name: "Explorer",
      unlocked: workshopCount >= 1 && streak >= 3,
      icon: Plane,
      activeBg: "bg-[#e2e6ff]",
      activeIconColor: "text-[#102a9c]"
    },
    {
      id: "flawless",
      name: "Flawless",
      unlocked: scienceCount >= 1 && streak >= 5,
      icon: Gem,
      activeBg: "bg-[#e2e6ff]",
      activeIconColor: "text-[#102a9c]"
    }
  ];

  const unlockedCount = milestones.filter(m => m.unlocked).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* 1. Current Rank Card */}
      <div className="bg-[var(--dah-primary-container)] rounded-[28px] p-5 shadow-lg shadow-[var(--dah-primary-container)]/15 text-white relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-[var(--dah-secondary-container)]/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />

        <div className="flex justify-between items-start relative z-10">
          <div className="space-y-0.5">
            <span className="text-[10px] font-extrabold text-blue-200/60 uppercase tracking-widest">
              Current Rank
            </span>
            <h3 className="text-[24px] font-display font-extrabold tracking-tight text-white leading-tight">
              {rank.name}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-yellow-500/15 shrink-0">
            <Award className="w-6 h-6 text-[#7a5900] stroke-[2.5]" />
          </div>
        </div>

        <div className="mt-5 space-y-2 relative z-10">
          <div className="flex justify-between items-end text-[11px] font-bold">
            <span className="text-blue-100 font-display flex items-center gap-1.5">
              <span>{totalXP.toLocaleString()} XP</span>
              <span className="text-[9.5px] text-blue-200/60 bg-blue-950/35 px-1.5 py-0.5 rounded-full font-medium tracking-wide">
                1 XLM = 100 XP
              </span>
            </span>
            <span className="text-blue-200/80 font-display">
              {rank.nextName} ({rank.maxXP.toLocaleString()} XP)
            </span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-3 bg-blue-955/40 rounded-full overflow-hidden border border-blue-900/30 p-[1px]">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-[11.5px] font-semibold text-blue-100/90 pt-1 text-center font-display flex items-center justify-center gap-1">
            {rank.minXP === rank.maxXP && <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />}
            {rank.reqMsg}
          </p>
        </div>
      </div>



      {/* 3. Milestones */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[18px] font-display font-extrabold tracking-tight text-[var(--dah-primary)]">
            Milestones
          </h3>
          <span className="text-[11px] font-display font-bold text-[var(--dah-outline)]">
            {unlockedCount} / {milestones.length} Earned
          </span>
        </div>

        {/* 3-column Grid layout matching the image */}
        <div className="grid grid-cols-3 gap-3 bg-white border border-[var(--dah-outline-variant)]/60 rounded-[28px] p-4.5 shadow-sm">
          {milestones.map((m) => {
            const MIcon = m.icon;
            return (
              <div
                key={m.id}
                className={`aspect-square rounded-[24px] flex flex-col items-center justify-center p-2 relative transition-all duration-300 ${
                  m.unlocked
                    ? "bg-[#f1eff6] shadow-sm"
                    : "bg-white border border-[#e4e6ec]"
                }`}
              >
                {/* Notification dot (orange) for 7-Day Streak, matching the image */}
                {m.unlocked && m.dot && (
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-orange-500 rounded-full border border-white pulse-ring" />
                )}

                {/* Icon Container */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-1.5 transition-all duration-300 ${
                    m.unlocked
                      ? m.activeBg
                      : "bg-[#f8f9fa] text-slate-400"
                  }`}
                >
                  <MIcon
                    className={`w-5.5 h-5.5 ${
                      m.unlocked ? m.activeIconColor : "text-slate-400/80"
                    }`}
                  />
                </div>

                {/* Milestone Name */}
                <span
                  className={`text-[10.5px] font-display font-bold text-center leading-tight transition-colors duration-200 ${
                    m.unlocked ? "text-[#00162b]" : "text-slate-400"
                  }`}
                >
                  {m.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[var(--dah-outline-variant)]/40 my-2" />

      {/* 4. Reward History Title & List */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[22px] font-display font-extrabold tracking-[-0.02em] text-[var(--dah-primary)]">
          Reward History
        </h2>
        <span className="text-[12px] font-display font-semibold text-[var(--dah-primary)] bg-[var(--dah-secondary-container)]/30 px-2.5 py-1 rounded-full">
          {history.length} {history.length === 1 ? "Reward" : "Rewards"}
        </span>
      </div>

      {sortedHistory.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)]/60 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-[var(--dah-surface-low)] rounded-full flex items-center justify-center mx-auto text-[var(--dah-outline)]">
            <CustomTrophy className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <p className="text-[16px] font-display font-bold text-[var(--dah-on-surface)]">
              No rewards yet
            </p>
            <p className="text-[13px] text-[var(--dah-on-surface-variant)] leading-relaxed max-w-[220px] mx-auto font-medium">
              Your earned rewards on the Stellar testnet will appear here automatically.
            </p>
          </div>
        </div>
      ) : (
        /* History List */
        <div className="space-y-2.5">
          {sortedHistory.map((item, index) => {
            const Icon = getIcon(item.activity);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)]/60 p-4 flex items-center justify-between hover:border-[var(--dah-primary)] transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-[var(--dah-surface-low)] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[var(--dah-primary)]" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-[14px] font-display font-bold text-[var(--dah-on-surface)] capitalize truncate">
                      {item.activity}
                    </p>
                    <p className="text-[11px] text-[var(--dah-on-surface-variant)] flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end font-display">
                      <span className="text-[16px] font-extrabold text-[var(--dah-secondary)]">
                        +{item.reward}
                      </span>
                      <span className="text-[11px] font-bold text-[var(--dah-outline)]">
                        XLM
                      </span>
                    </div>
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${item.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-semibold text-[var(--dah-primary)] hover:underline flex items-center gap-0.5 justify-end"
                    >
                      Explorer
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[var(--dah-secondary-container)]/25 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-[var(--dah-secondary)]" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
