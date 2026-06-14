import { CustomCircleInformation } from "./customIcons";

interface NavbarProps {
  onInfoClick?: () => void;
}

export function Navbar({ onInfoClick }: NavbarProps) {
  return (
    <header
      className="px-9 py-4 flex items-center justify-between absolute top-0 left-0 right-0 z-50 border-b border-[var(--dah-outline-variant)]/25"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="flex items-center gap-2">
        <img
          src="/only_name.png"
          alt="Achievo Logo"
          className="h-8 w-auto object-contain"
        />
        <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--dah-primary)] hidden">Achievo</span>
      </div>

      <button
        onClick={onInfoClick}
        className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--dah-outline)] hover:bg-[var(--dah-surface-low)] hover:text-[var(--dah-primary)] transition-all"
      >
        <CustomCircleInformation className="w-5.5 h-5.5" />
      </button>
    </header>
  );
}
