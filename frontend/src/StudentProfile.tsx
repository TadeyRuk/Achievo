import { useState } from "react";
import { ShieldAlert, Lock, Check, Pencil, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { type RewardHistoryItem } from "./RewardHistory";
import {
  CustomCompass,
  CustomStar,
  CustomBolt,
  CustomHeart,
  CustomGraduationHat,
  CustomTrophy,
  CustomClipboardList,
  CustomMedal,
} from "./customIcons";

interface StudentProfileProps {
  walletAddress: string | null;
  history: RewardHistoryItem[];
  userAvatar: string;
  onAvatarChange: (avatar: string) => void;
}

const AVAILABLE_AVATARS = [
  "1", "1-1", "1-2", "2", "2-1", "2-2", "3", "3-1", "3-2", "4", "4-1", "4-2", "5", "5-1", "5-2", 
  "6", "6-1", "6-2", "7", "7-1", "7-2", "8", "8-1", "8-2", "9", "9-1", "9-2", "10", "10-1", "10-2", 
  "11", "11-1", "12", "12-1", "12-2", "13", "13-1", "13-2", "14", "14-1", "14-2", "15", "15-1", "15-2", 
  "16", "16-1", "17", "17-1", "18", "18-1", "19", "19-1", "20", "20-1", "21", "21-1", "22", "22-1", 
  "23", "23-1", "24", "24-1", "25", "25-1", "26", "26-1", "27", "27-1", "28", "28-1", "29", "29-1", 
  "30", "30-1", "31", "32", "33", "34", "35", "36", "37"
];

const AVATAR_OPTIONS = [
  { path: "/xander_avatar.webp", label: "Default" },
  ...AVAILABLE_AVATARS.map(name => ({
    path: `/avatars/${name}.webp`,
    label: `Avatar ${name}`
  }))
];

export function StudentProfile({
  walletAddress,
  history,
  userAvatar,
  onAvatarChange,
}: StudentProfileProps) {
  // Calculations
  const totalEarned = history.reduce((sum, item) => sum + item.reward, 0);
  const totalSubmissions = history.length;

  // Dynamic streak — consecutive days with at least one reward (going back from today)
  const streak = (() => {
    if (history.length === 0) return 0;
    // Get unique day strings "YYYY-MM-DD" that have rewards
    const daySet = new Set(
      history.map(item => new Date(item.timestamp).toLocaleDateString("en-CA"))
    );
    let count = 0;
    const today = new Date();
    // Allow streak to still be active if today has no entry yet (check from yesterday)
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
  
  // Dynamic Badge Unlocking
  const volunteeredCount = history.filter(h => h.activity.toLowerCase().includes("volunteer")).length;
  const tutoredCount = history.filter(h => h.activity.toLowerCase().includes("tutor")).length;
  
  const tutoringOrMathCount = history.filter(h => 
    h.activity.toLowerCase().includes("tutor") || 
    h.activity.toLowerCase().includes("math")
  ).length;
  const workshopCount = history.filter(h => h.activity.toLowerCase().includes("workshop")).length;
  const scienceCount = history.filter(h => h.activity.toLowerCase().includes("science")).length;

  const baseXP = 0;
  const totalXP = baseXP + Math.round(totalEarned * 100);

  const isSilverUnlocked = totalXP >= 1000 && volunteeredCount >= 1;
  const isGoldUnlocked = totalXP >= 2500 && tutoringOrMathCount >= 1;
  const isPlatinumUnlocked = totalXP >= 5000 && workshopCount >= 1 && streak >= 3;
  const isDiamondUnlocked = totalXP >= 10000 && scienceCount >= 1 && streak >= 5;

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
      unlocked: volunteeredCount >= 3,
      rimColor: "from-emerald-400 via-emerald-100 to-teal-600",
      innerColor: "from-emerald-700 via-emerald-800 to-teal-950",
      iconColor: "text-emerald-100",
      icon: CustomHeart,
    },
    {
      id: "giga_brain",
      name: "Giga Brain",
      desc: "Completed 5 tutoring sessions to enlighten your peers.",
      unlocked: tutoredCount >= 5,
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
  const [showAvatarModal, setShowAvatarModal] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const selectedBadge = badges.find(b => b.id === selectedBadgeId) || badges[0];
  const SelectedBadgeIcon = selectedBadge.icon;

  const itemsPerPage = 9;
  const totalPages = Math.ceil(AVATAR_OPTIONS.length / itemsPerPage);
  const paginatedAvatars = AVATAR_OPTIONS.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  
  const handlePrevPage = () => {
    if (currentPage > 0) {
      setDirection(-1);
      setCurrentPage(p => p - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setDirection(1);
      setCurrentPage(p => p + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      {/* Profile Header Card */}
      <div className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)] p-5 shadow-sm flex items-center gap-4">
        {/* Avatar with edit button */}
        <div className="relative shrink-0">
          <div 
            onClick={() => { setCurrentPage(0); setShowAvatarModal(true); }}
            className="w-16 h-16 rounded-full overflow-hidden border border-gray-100 shadow-sm bg-[var(--dah-surface-low)] cursor-pointer relative group"
          >
            <img
              src={userAvatar}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              alt="Xander Dacillo"
              onError={e => {
                (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/initials/svg?seed=Xander Dacillo";
              }}
            />
            {/* Dark tint on hover */}
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
          {/* Pen Icon Badge in the bottom-right corner */}
          <button 
            onClick={() => { setCurrentPage(0); setShowAvatarModal(true); }}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-[var(--dah-primary)] text-white hover:bg-[var(--dah-primary-container)] active:scale-90 transition-all rounded-full flex items-center justify-center border border-white shadow-sm cursor-pointer animate-none"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
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
          { label: "Rewards", value: `${totalEarned} XLM`, icon: CustomTrophy },
          { label: "Approved", value: totalSubmissions, icon: CustomClipboardList },
          { label: "Streak", value: streak === 0 ? "No streak" : `${streak} Day${streak === 1 ? "" : "s"}`, icon: CustomStar },
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
              className="w-16 h-16 relative flex items-center justify-center bg-transparent"
            >
              {/* Core solid backing layers to prevent internal transparency gaps */}
              {[-2.5, 0, 2.5].map((z) => (
                <div
                  key={z}
                  style={{ transform: `translateZ(${z}px)` }}
                  className={`absolute inset-0 rounded-full border border-black/5 pointer-events-none ${
                    selectedBadge.unlocked
                      ? `bg-gradient-to-tr ${selectedBadge.rimColor}`
                      : "bg-gradient-to-tr from-slate-700/50 via-slate-600/50 to-slate-800/50"
                  }`}
                />
              ))}

              {/* 3D Side Rim Cylindrical Band (fills the side-on view completely to prevent split-second disappearance) */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = i * 30;
                return (
                  <div
                    key={i}
                    style={{
                      transform: `rotateY(${angle}deg) translateZ(31.5px)`,
                      width: "17.4px",
                      height: "7px",
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      marginTop: "-3.5px",
                      marginLeft: "-8.7px",
                      backfaceVisibility: "visible",
                    }}
                    className={`border-t border-b border-black/15 pointer-events-none ${
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
                  transform: "translateZ(3.5px)",
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
                  transform: "translateZ(-3.5px) rotateY(180deg)",
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
      </div>

      {/* Avatar Selection Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-[#00162b]/65 backdrop-blur-md flex items-center justify-center p-4"
          >
            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.96, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 480, damping: 28 }}
              className="bg-white rounded-[32px] w-full max-w-[360px] p-6 shadow-2xl relative border border-slate-100 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <h3 className="text-[17px] font-extrabold text-[#00162b] font-display">
                  Choose Avatar
                </h3>
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>

              {/* Paginated Grid Container (Animated) */}
              <div className="relative overflow-hidden py-5 min-h-[300px] flex items-center justify-center shrink-0">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                  <motion.div
                    key={currentPage}
                    custom={direction}
                    variants={{
                      enter: (dir: number) => ({
                        x: dir > 0 ? 120 : -120,
                        opacity: 0,
                      }),
                      center: {
                        x: 0,
                        opacity: 1,
                      },
                      exit: (dir: number) => ({
                        x: dir > 0 ? -120 : 120,
                        opacity: 0,
                      }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 450, damping: 32 },
                      opacity: { duration: 0.12 },
                    }}
                    className="grid grid-cols-3 gap-4 w-full"
                  >
                    {paginatedAvatars.map((avatar) => {
                      const isSelected = userAvatar === avatar.path;
                      return (
                        <motion.button
                          key={avatar.path}
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => {
                            onAvatarChange(avatar.path);
                            setShowAvatarModal(false);
                          }}
                          className={`relative w-full aspect-square rounded-[20px] overflow-hidden border bg-[var(--dah-surface-low)] cursor-pointer transition-all p-2.5 flex items-center justify-center ${
                            isSelected 
                              ? "border-[var(--dah-primary)] ring-2 ring-[var(--dah-primary)]/30 ring-offset-1" 
                              : "border-slate-100 hover:border-slate-300"
                          }`}
                        >
                          <img
                            src={avatar.path}
                            alt={avatar.label}
                            className="w-full h-full object-contain block"
                            loading="lazy"
                          />
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-1 py-3 border-t border-b border-slate-100 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                    currentPage === 0
                      ? "border-slate-100 text-slate-300 cursor-not-allowed"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <ChevronLeft className="w-4.5 h-4.5" strokeWidth={2.5} />
                </motion.button>

                <span className="text-[12.5px] font-bold text-slate-500 font-display">
                  Page <span className="text-[#00162b] font-extrabold">{currentPage + 1}</span> of {totalPages}
                </span>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages - 1}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                    currentPage === totalPages - 1
                      ? "border-slate-100 text-slate-300 cursor-not-allowed"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <ChevronRight className="w-4.5 h-4.5" strokeWidth={2.5} />
                </motion.button>
              </div>

              {/* Footer */}
              <div className="pt-4 shrink-0">
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="w-full py-3 bg-[var(--dah-primary)] hover:bg-[#061d32] text-white rounded-full font-extrabold text-[13px] font-display uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
