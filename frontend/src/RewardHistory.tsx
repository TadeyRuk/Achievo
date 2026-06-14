import { ExternalLink, Calendar, CheckCircle } from "lucide-react";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--dah-primary)]">
          Reward History
        </h2>
        <span className="text-[12px] font-semibold text-[var(--dah-primary)] bg-[var(--dah-secondary-container)]/30 px-2.5 py-1 rounded-full">
          {history.length} {history.length === 1 ? "Reward" : "Rewards"}
        </span>
      </div>

      {sortedHistory.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)] p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-[var(--dah-surface-low)] rounded-full flex items-center justify-center mx-auto text-[var(--dah-outline)]">
            <CustomTrophy className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <p className="text-[16px] font-bold text-[var(--dah-on-surface)]">
              No rewards yet
            </p>
            <p className="text-[13px] text-[var(--dah-on-surface-variant)] leading-relaxed max-w-[220px] mx-auto">
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
                className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)] p-4 flex items-center justify-between hover:border-[var(--dah-primary)] transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-[var(--dah-surface-low)] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[var(--dah-primary)]" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-[14px] font-bold text-[var(--dah-on-surface)] capitalize truncate">
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
