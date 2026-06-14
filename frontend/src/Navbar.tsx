import { Rewind } from "lucide-react";
import { CustomCircleInformation } from "./customIcons";

interface NavbarProps {
  onInfoClick?: () => void;
}

export function Navbar({ onInfoClick }: NavbarProps) {
  return (
    <header className="px-4 py-4 flex items-center justify-between absolute top-0 left-0 right-0 z-[60]">
      {/* Gradual blur layer — fades from blurred at top to transparent at bottom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      />
      {/* Left — info icon in pill cutout */}
      <div
        className="flex items-center px-2 py-1 rounded-full border border-[var(--dah-outline-variant)]/40"
        style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
      >
        <button
          onClick={onInfoClick}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--dah-outline)] hover:text-[var(--dah-primary)] transition-all"
        >
          <CustomCircleInformation className="w-5.5 h-5.5" />
        </button>
      </div>

      {/* Center — logo */}
      <img
        src="/only_name.png"
        alt="Achievo"
        className="h-8 w-auto object-contain absolute left-1/2 -translate-x-1/2"
      />

      {/* Right — rewind icon in pill cutout */}
      <div
        className="flex items-center px-2 py-1 rounded-full border border-[var(--dah-outline-variant)]/40"
        style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
      >
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--dah-outline)] hover:text-[var(--dah-primary)] transition-all"
          disabled
        >
          <Rewind className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
}
