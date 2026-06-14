import { HelpCircle } from "lucide-react";

export function Navbar() {
  return (
    <header className="px-6 py-0.5 flex items-center justify-between bg-[var(--dah-surface)] sticky top-0 z-50 shrink-0">
      {/* Achievo logo image */}
      <div className="flex items-center gap-2">
        <img
          src="/logo.png"
          alt="Achievo Logo"
          className="h-18 w-auto object-contain"
        />
        <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--dah-primary)] hidden">Achievo</span>
      </div>

      <button className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--dah-outline)] hover:bg-[var(--dah-surface-low)] hover:text-[var(--dah-primary)] transition-all">
        <HelpCircle className="w-5.5 h-5.5" />
      </button>
    </header>
  );
}
