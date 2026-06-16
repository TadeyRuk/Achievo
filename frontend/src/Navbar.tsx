import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { CustomCircleInformation } from "./customIcons";

interface NavbarProps {
  onInfoClick?: () => void;
}

async function hardRefresh() {
  if (!navigator.onLine) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  } catch {}
  window.location.reload();
}

export function Navbar({ onInfoClick }: NavbarProps) {
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = async () => {
    if (spinning) return;
    setSpinning(true);
    await hardRefresh();
  };

  return (
    <header className="px-4 py-4 flex items-center justify-between absolute top-0 left-0 right-0 z-[60]">
      {/* Gradual blur layer — sits behind all navbar content */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "160px",
          zIndex: -1,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          maskImage: "linear-gradient(to bottom, black 5%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 5%, transparent 100%)",
        }}
      />
      {/* Left — info icon in pill cutout */}
      <div
        className="flex items-center px-2 py-1 rounded-full border-2 border-black/20"
        style={{ backgroundColor: "rgba(255,255,255,0.18)", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}
      >
        <button
          onClick={onInfoClick}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--dah-outline)] hover:text-[var(--dah-primary)] transition-all"
          style={{ backgroundColor: "white" }}
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
        className="flex items-center px-2 py-1 rounded-full border-2 border-black/20"
        style={{ backgroundColor: "rgba(255,255,255,0.18)", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}
      >
        <button
          onClick={handleRefresh}
          disabled={spinning}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--dah-outline)] hover:text-[var(--dah-primary)] transition-all disabled:opacity-60"
          style={{ backgroundColor: "white" }}
        >
          <RefreshCw className={`w-4.5 h-4.5 ${spinning ? "animate-spin" : ""}`} />
        </button>
      </div>
    </header>
  );
}
