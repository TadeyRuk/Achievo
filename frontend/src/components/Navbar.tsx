import { Bell } from "lucide-react";

export function Navbar() {
  return (
    <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-[var(--dah-outline-variant)] sticky top-0 z-50 shrink-0">
      <div className="flex items-center gap-2.5">
        {/* Logo mark */}
        <div className="w-8 h-8 bg-[var(--dah-primary-container)] rounded-[4px] flex items-center justify-center shadow-sm">
          <span className="text-[var(--dah-secondary-container)] font-extrabold text-[14px] leading-none tracking-tight">A</span>
        </div>
        <span className="text-[18px] font-bold tracking-[-0.01em] text-[var(--dah-primary)]">Achievo</span>
        <span className="px-1.5 py-0.5 rounded-[4px] bg-[var(--dah-surface-container)] text-[var(--dah-on-surface-variant)] text-[10px] font-semibold uppercase tracking-[0.05em]">
          Testnet
        </span>
      </div>
      <button className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--dah-surface-low)] text-[var(--dah-on-surface-variant)] hover:bg-[var(--dah-surface-container)] transition-colors">
        <Bell className="w-4 h-4" />
      </button>
    </header>
  );
}
