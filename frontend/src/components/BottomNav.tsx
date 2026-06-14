import { Home, Gift, Wallet, User } from "lucide-react";

interface BottomNavProps {
  activeTab: "home" | "pipeline" | "history" | "wallet";
  onTabChange: (tab: "home" | "pipeline" | "history" | "wallet") => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "home",     label: "Home",     icon: Home },
    { id: "history",  label: "Rewards",  icon: Gift },
    { id: "wallet",   label: "Wallet",   icon: Wallet },
    { id: "pipeline", label: "Profile",  icon: User },
  ] as const;

  return (
    <div
      className="absolute bottom-0 w-full bg-[var(--dah-surface)] border-t border-[var(--dah-outline-variant)] z-50 shrink-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-16 sm:h-20 px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex-1 flex flex-col items-center gap-1 py-1 relative transition-all"
            >
              {/* Icon Container with M3 gold active pill indicator behind */}
              <div
                className={`relative px-6 py-1.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-[#ffbf21] text-[#00162b] scale-105 shadow-sm"
                    : "bg-transparent text-[var(--dah-on-surface-variant)] hover:bg-[var(--dah-surface-low)]"
                }`}
              >
                <Icon
                  className="w-5.5 h-5.5 transition-colors duration-250"
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={`text-[11px] font-bold tracking-[0.01em] transition-colors duration-300 ${
                  isActive
                    ? "text-[#00162b] font-extrabold"
                    : "text-[var(--dah-outline)]"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
