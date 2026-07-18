import { useState } from "react";
import { Lock, Check } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import {
  CustomCompass,
  CustomStar,
  CustomBolt,
  CustomHeart,
  CustomGraduationHat,
  CustomTrophy,
  CustomMedal,
} from "../../shared/ui";
import type { ProgressionViewModel } from "../../shared/lib";
import type { RewardHistoryItem } from "@achievo/shared";

type BadgeCollectionProps = {
  history: RewardHistoryItem[];
  progression: ProgressionViewModel;
  itemVariants: Variants;
};

export function BadgeCollection({ history, progression, itemVariants }: BadgeCollectionProps) {
  const totalEarned = history.reduce((sum, item) => sum + item.reward, 0);
  const totalSubmissions = history.length;
  const isSilverUnlocked = progression.state.unlocks.silver;
  const isGoldUnlocked = progression.state.unlocks.gold;
  const isPlatinumUnlocked = progression.state.unlocks.platinum;
  const isDiamondUnlocked = progression.state.unlocks.diamond;

  const badges = [
    {
      id: "rank_bronze",
      name: "Bronze Scholar Badge",
      desc: "Unlocked by default as your starting scholar rank.",
      unlocked: true,
      rimColor: "from-amber-700 via-amber-600 to-amber-900",
      innerColor: "from-amber-900 via-stone-800 to-amber-950",
      iconColor: "text-amber-500",
      icon: CustomCompass,
    },
    {
      id: "rank_silver",
      name: "Silver Scholar Badge",
      desc: "Earn 1,000+ XP and log at least 1 volunteering activity to unlock.",
      unlocked: isSilverUnlocked,
      rimColor: "from-slate-400 via-slate-100 to-slate-500",
      innerColor: "from-slate-700 via-slate-800 to-slate-900",
      iconColor: "text-slate-200",
      icon: CustomMedal,
    },
    {
      id: "rank_gold",
      name: "Gold Scholar Badge",
      desc: "Earn 2,500+ XP and log at least 1 tutoring or math activity to unlock.",
      unlocked: isGoldUnlocked,
      rimColor: "from-yellow-400 via-amber-100 to-yellow-600",
      innerColor: "from-yellow-800 via-stone-800 to-yellow-950",
      iconColor: "text-yellow-400",
      icon: CustomTrophy,
    },
    {
      id: "rank_platinum",
      name: "Platinum Scholar Badge",
      desc: "Earn 5,000+ XP, log 1 workshop activity, and reach a 3-day streak to unlock.",
      unlocked: isPlatinumUnlocked,
      rimColor: "from-sky-300 via-indigo-200 to-indigo-500",
      innerColor: "from-indigo-950 via-slate-900 to-indigo-900",
      iconColor: "text-sky-300",
      icon: CustomStar,
    },
    {
      id: "rank_diamond",
      name: "Diamond Scholar Badge",
      desc: "Earn 10,000+ XP, log 1 science activity, and reach a 5-day streak to unlock.",
      unlocked: isDiamondUnlocked,
      rimColor: "from-fuchsia-400 via-pink-100 to-pink-600",
      innerColor: "from-fuchsia-950 via-stone-900 to-violet-950",
      iconColor: "text-fuchsia-300",
      icon: CustomBolt,
    },
    {
      id: "first_spark",
      name: "First Spark",
      desc: "Earned your first approved academic reward.",
      unlocked: totalSubmissions >= 1,
      rimColor: "from-slate-400 via-slate-200 to-slate-500",
      innerColor: "from-slate-700 via-slate-800 to-slate-900",
      iconColor: "text-slate-100",
      icon: CustomCompass,
    },
    {
      id: "double_trouble",
      name: "Double Trouble",
      desc: "Earned rewards for 2 or more approved achievements.",
      unlocked: totalSubmissions >= 2,
      rimColor: "from-amber-400 via-yellow-100 to-amber-600",
      innerColor: "from-amber-700 via-amber-800 to-amber-950",
      iconColor: "text-amber-100",
      icon: CustomStar,
    },
    {
      id: "super_charger",
      name: "Super Charger",
      desc: "Completed a total of 10 approved milestones.",
      unlocked: totalSubmissions >= 10,
      rimColor: "from-orange-400 via-orange-100 to-red-600",
      innerColor: "from-orange-700 via-orange-800 to-red-950",
      iconColor: "text-orange-100",
      icon: CustomBolt,
    },
    {
      id: "community_savior",
      name: "Community Savior",
      desc: "Logged 3 volunteering sessions to support your community.",
      unlocked: progression.state.counts.volunteering >= 3,
      rimColor: "from-emerald-400 via-emerald-100 to-teal-600",
      innerColor: "from-emerald-700 via-emerald-800 to-teal-950",
      iconColor: "text-emerald-100",
      icon: CustomHeart,
    },
    {
      id: "giga_brain",
      name: "Giga Brain",
      desc: "Completed 5 tutoring sessions to enlighten your peers.",
      unlocked: progression.state.counts.tutoring >= 5,
      rimColor: "from-sky-400 via-sky-100 to-indigo-600",
      innerColor: "from-sky-700 via-sky-800 to-indigo-950",
      iconColor: "text-sky-100",
      icon: CustomGraduationHat,
    },
    {
      id: "apex_achiever",
      name: "Apex Achiever",
      desc: "Accumulated more than 50 XLM in academic rewards.",
      unlocked: totalEarned >= 50,
      rimColor: "from-purple-400 via-fuchsia-100 to-fuchsia-600",
      innerColor: "from-purple-700 via-purple-800 to-fuchsia-950",
      iconColor: "text-fuchsia-100",
      icon: CustomTrophy,
    },
  ];

  const [selectedBadgeId, setSelectedBadgeId] = useState<string>("rank_bronze");
  const selectedBadge = badges.find(b => b.id === selectedBadgeId) || badges[0];
  const SelectedBadgeIcon = selectedBadge.icon;

  return (
    <>
      {/* Selected Badge Detail Card (Apple Fitness Style) */}
      <motion.div variants={itemVariants}>
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
                className="w-16 h-16 relative flex items-center justify-center bg-transparent"
              >
                {/* 3D thickness edge layers (stacked tightly at 0.4px intervals for smooth solid extrusion) */}
                {Array.from({ length: 16 }).map((_, idx) => {
                  const z = -3.0 + idx * 0.4;
                  return (
                    <div
                      key={idx}
                      style={{ transform: `translateZ(${z}px)` }}
                      className={`absolute inset-0 rounded-full border border-black/5 pointer-events-none ${
                        selectedBadge.unlocked
                          ? `bg-gradient-to-tr ${selectedBadge.rimColor}`
                          : "bg-gradient-to-tr from-slate-700/50 via-slate-600/50 to-slate-800/50"
                      }`}
                    />
                  );
                })}

                {/* Front Face */}
                <div
                  style={{ 
                    transform: "translateZ(3.2px)",
                    backfaceVisibility: "hidden"
                  }}
                  className={`absolute inset-0 rounded-full p-[3px] shadow-[0_10px_20px_rgba(0,0,0,0.35),_0_3px_8px_rgba(0,0,0,0.22),_inset_0_1px_0_rgba(255,255,255,0.4)] flex items-center justify-center border border-black/10 ${
                    selectedBadge.unlocked
                      ? `bg-gradient-to-tr ${selectedBadge.rimColor}`
                      : "bg-gradient-to-tr from-slate-700/50 via-slate-600/50 to-slate-800/50"
                  }`}
                >
                  <div className={`w-full h-full rounded-full flex items-center justify-center relative overflow-hidden ${
                    selectedBadge.unlocked
                      ? `bg-gradient-to-tr ${selectedBadge.innerColor} shadow-[inset_0_4px_8px_rgba(0,0,0,0.6),_inset_0_-4px_8px_rgba(255,255,255,0.15)]`
                      : "bg-gradient-to-tr from-slate-800 to-slate-900 shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]"
                  }`}>
                    {/* Curved 3D highlight */}
                    <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/25 to-white/0 rounded-t-full pointer-events-none" />
                    {/* Sharp reflection shine */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent rotate-35 translate-y-[-20%] pointer-events-none" />
                    {/* Crescent bottom shadow */}
                    <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/30 to-transparent rounded-b-full pointer-events-none" />
                    
                    <SelectedBadgeIcon className={`w-7 h-7 z-10 ${
                      selectedBadge.unlocked
                        ? `${selectedBadge.iconColor} filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.65)]`
                        : "text-slate-600"
                    }`} />
                  </div>
                </div>

                {/* Back Face */}
                <div
                  style={{ 
                    transform: "translateZ(-3.2px) rotateY(180deg)",
                    backfaceVisibility: "hidden"
                  }}
                  className={`absolute inset-0 rounded-full p-[3px] shadow-[0_10px_20px_rgba(0,0,0,0.35),_0_3px_8px_rgba(0,0,0,0.22),_inset_0_1px_0_rgba(255,255,255,0.4)] flex items-center justify-center border border-black/10 ${
                    selectedBadge.unlocked
                      ? `bg-gradient-to-tr ${selectedBadge.rimColor}`
                      : "bg-gradient-to-tr from-slate-700/50 via-slate-600/50 to-slate-800/50"
                  }`}
                >
                  <div className={`w-full h-full rounded-full flex items-center justify-center relative overflow-hidden ${
                    selectedBadge.unlocked
                      ? `bg-gradient-to-tr ${selectedBadge.innerColor} shadow-[inset_0_4px_8px_rgba(0,0,0,0.6),_inset_0_-4px_8px_rgba(255,255,255,0.15)]`
                      : "bg-gradient-to-tr from-slate-800 to-slate-900 shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]"
                  }`}>
                    {/* Curved 3D highlight */}
                    <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/20 to-white/0 rounded-t-full pointer-events-none" />
                    {/* Sharp reflection shine */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-35 translate-y-[-20%] pointer-events-none" />
                    
                    <SelectedBadgeIcon className={`w-7 h-7 z-10 opacity-30 ${
                      selectedBadge.unlocked ? selectedBadge.iconColor : "text-slate-600"
                    }`} />
                  </div>
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

      {/* Badges / Achievements section */}
      <motion.div
        variants={itemVariants}
        className="space-y-4"
      >
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
                    className={`w-16 h-16 rounded-full p-[3px] shadow-[0_8px_16px_rgba(0,0,0,0.25),_0_2px_5px_rgba(0,0,0,0.15),_inset_0_1px_0_rgba(255,255,255,0.4)] flex items-center justify-center relative transition-all duration-300 border border-black/10 ${
                      badge.unlocked
                        ? `bg-gradient-to-tr ${badge.rimColor}`
                        : "bg-gradient-to-tr from-slate-700/50 via-slate-600/50 to-slate-800/50 opacity-70"
                    }`}
                  >
                    {/* Inner Face of the Badge */}
                    <div className={`w-full h-full rounded-full flex items-center justify-center relative overflow-hidden ${
                      badge.unlocked
                        ? `bg-gradient-to-tr ${badge.innerColor} shadow-[inset_0_4px_8px_rgba(0,0,0,0.6),_inset_0_-4px_8px_rgba(255,255,255,0.15)]`
                        : "bg-gradient-to-tr from-slate-800 to-slate-900 shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]"
                    }`}>
                      {/* Curved 3D highlight */}
                      <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/25 to-white/0 rounded-t-full pointer-events-none" />
                      {/* Sharp reflection shine */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent rotate-35 translate-y-[-20%] pointer-events-none" />
                      {/* Crescent bottom shadow */}
                      <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/30 to-transparent rounded-b-full pointer-events-none" />
                      
                      {/* Icon */}
                      <BadgeIcon className={`w-7 h-7 z-10 transition-transform duration-300 group-hover:scale-110 ${
                        badge.unlocked
                          ? `${badge.iconColor} filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.65)]`
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
      </motion.div>

    </>
  );
}
