import { Home, ActivitySquare, Wallet } from "lucide-react";

interface BottomNavProps {
  activeTab: "home" | "pipeline" | "wallet";
  onTabChange: (tab: "home" | "pipeline" | "wallet") => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "home",     label: "Home",     icon: Home },
    { id: "pipeline", label: "Pipeline", icon: ActivitySquare },
    { id: "wallet",   label: "Profile",  icon: Wallet },
  ] as const;

  return (
    <div
      className="absolute bottom-0 w-full bg-white border-t border-[var(--dah-outline-variant)] z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-16 sm:h-18 px-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-1 px-4 py-1.5 relative transition-all"
            >
              <div
                className={`p-2 rounded-[8px] transition-colors ${
                  isActive
                    ? "bg-[var(--dah-surface-container)]"
                    : "bg-transparent"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive
                      ? "text-[var(--dah-primary)]"
                      : "text-[var(--dah-outline)]"
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.05em] transition-colors ${
                  isActive
                    ? "text-[var(--dah-primary)]"
                    : "text-[var(--dah-outline)]"
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-[2px] bg-[var(--dah-secondary-container)] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
