import { useState } from "react";
import { ShieldAlert, Pencil, Snowflake, ChevronLeft } from "lucide-react";
import { motion } from "motion/react";
import { type RewardHistoryItem } from "@achievo/shared";
import { ProgressionAgent, type StoredProgression } from '../../shared/lib/progression';
import { AvatarPickerModal } from './AvatarPickerModal';
import { BadgeCollection } from './BadgeCollection';
import {
  CustomStar,
  CustomTrophy,
  CustomClipboardList,
} from '../../shared/ui/customIcons';

interface StudentProfileProps {
  walletAddress: string | null;
  history: RewardHistoryItem[];
  progression?: StoredProgression;
  userAvatar: string;
  onAvatarChange: (avatar: string) => void;
  userName: string;
  onShowInfoClick: () => void;
  onShowTourClick?: () => void;
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

export function StudentProfile({
  walletAddress,
  history,
  progression,
  userAvatar,
  onAvatarChange,
  userName,
  onShowInfoClick,
  onShowTourClick,
}: StudentProfileProps) {
  // Calculations
  const totalEarned = history.reduce((sum, item) => sum + item.reward, 0);
  const totalSubmissions = history.length;

  // Progression — single source of truth via ProgressionAgent (freeze-aware)
  const prog = ProgressionAgent.state(history, progression ?? {});
  const streak = prog.streak;
  const freezes = prog.freezes;

  const [showAvatarModal, setShowAvatarModal] = useState<boolean>(false);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="p-5 space-y-5"
    >
      {/* Profile Header Card */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)] p-5 shadow-sm flex items-center gap-4"
      >
        {/* Avatar with edit button */}
        <div className="relative shrink-0">
          <div 
            onClick={() => setShowAvatarModal(true)}
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
            onClick={() => setShowAvatarModal(true)}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-[var(--dah-primary)] text-white hover:bg-[var(--dah-primary-container)] active:scale-90 transition-all rounded-full flex items-center justify-center border border-white shadow-sm cursor-pointer animate-none"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-[20px] font-extrabold tracking-tight text-[var(--dah-primary)] font-display">
            {userName}
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
      </motion.div>

      {/* How Achievo Works entry point */}
      <motion.button
        type="button"
        data-tour="profile-info"
        variants={itemVariants}
        onClick={onShowInfoClick}
        className="w-full bg-white rounded-[20px] border border-[var(--dah-outline-variant)] px-5 py-4 shadow-sm flex items-center justify-between text-left"
      >
        <div>
          <p className="text-[13px] font-extrabold text-[var(--dah-primary)] font-display">How Achievo Works</p>
          <p className="text-[11px] text-[var(--dah-on-surface-variant)] font-semibold">5-agent pipeline & reward formula</p>
        </div>
        <ChevronLeft className="w-4 h-4 rotate-180 text-[var(--dah-outline)]" />
      </motion.button>

      {onShowTourClick && (
        <motion.button
          type="button"
          variants={itemVariants}
          onClick={onShowTourClick}
          className="w-full bg-[var(--dah-surface-low)] rounded-[20px] border border-[var(--dah-outline-variant)]/60 px-5 py-3.5 shadow-sm flex items-center justify-between text-left cursor-pointer"
        >
          <div>
            <p className="text-[13px] font-extrabold text-[var(--dah-primary)] font-display">Show tour</p>
            <p className="text-[11px] text-[var(--dah-on-surface-variant)] font-semibold">Replay the quick walkthrough</p>
          </div>
          <ChevronLeft className="w-4 h-4 rotate-180 text-[var(--dah-outline)]" />
        </motion.button>
      )}

      {/* Stats Dashboard */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Rewards", value: `${totalEarned} XLM`, icon: CustomTrophy, freeze: undefined as number | undefined },
          { label: "Approved", value: totalSubmissions, icon: CustomClipboardList, freeze: undefined as number | undefined },
          { label: "Streak", value: streak === 0 ? "No streak" : `${streak} Day${streak === 1 ? "" : "s"}`, icon: CustomStar, freeze: freezes },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="relative bg-white rounded-[24px] border border-[var(--dah-outline-variant)] p-3.5 text-center flex flex-col items-center justify-center space-y-1.5 shadow-sm"
            >
              {stat.freeze !== undefined && stat.freeze > 0 && (
                <motion.div
                  key={stat.freeze}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 16 }}
                  className="absolute top-2 right-2 inline-flex items-center gap-0.5 rounded-full bg-[var(--dah-surface-container)] border border-[var(--dah-secondary-container)] px-1.5 py-0.5"
                  title={`${stat.freeze} streak freeze${stat.freeze === 1 ? "" : "s"} — protects a missed day`}
                >
                  <Snowflake className="w-2.5 h-2.5 text-[var(--dah-secondary)]" strokeWidth={2.5} />
                  <span className="text-[9px] font-extrabold text-[var(--dah-secondary)] leading-none">{stat.freeze}</span>
                </motion.div>
              )}
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
      </motion.div>

      <BadgeCollection history={history} progression={progression} itemVariants={itemVariants} />


      <AvatarPickerModal
        open={showAvatarModal}
        userAvatar={userAvatar}
        onSelect={onAvatarChange}
        onClose={() => setShowAvatarModal(false)}
      />
    </motion.div>
  );
}
