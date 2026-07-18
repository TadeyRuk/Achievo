import { RefreshCw, MessageSquarePlus, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";
import { iosEase, iosSpring, reducedMotionTransition } from '../lib/sheetMotion';
import {
  LiquidGlassPill,
  liquidGlassAlert,
  liquidGlassSurface,
} from './liquidGlass';

interface NavbarProps {
  onFeedbackClick?: () => void;
}

const LONG_PRESS_MS = 500;
const SHEET_W = 220;
const SHEET_GAP = 10;

async function clearServiceWorkerCaches() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch { /* no-op */ }
}

async function hardRefresh() {
  if (!navigator.onLine) return;
  await clearServiceWorkerCaches();
  window.location.reload();
}

async function clearAllLocalData() {
  try {
    localStorage.clear();
  } catch { /* ignore */ }
  await clearServiceWorkerCaches();
  window.location.reload();
}

function usePhoneFrame(): Element | null {
  const [frame, setFrame] = useState<Element | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFrame(document.querySelector("[data-phone-frame]"));
  }, []);
  return frame;
}

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
}

function measureAnchor(
  button: HTMLElement,
  frame: Element,
): AnchorRect {
  const f = frame.getBoundingClientRect();
  const b = button.getBoundingClientRect();
  return {
    top: b.top - f.top,
    left: b.left - f.left,
    width: b.width,
    height: b.height,
    originX: b.left - f.left + b.width / 2,
    originY: b.top - f.top + b.height / 2,
  };
}

export function Navbar({ onFeedbackClick }: NavbarProps) {
  const reduceMotion = useReducedMotion();
  const phoneFrame = usePhoneFrame();
  const refreshBtnRef = useRef<HTMLButtonElement>(null);

  const [spinning, setSpinning] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);

  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const updateAnchor = useCallback(() => {
    const btn = refreshBtnRef.current;
    const frame = phoneFrame;
    if (!btn || !frame) return;
    setAnchor(measureAnchor(btn, frame));
  }, [phoneFrame]);

  useLayoutEffect(() => {
    if (!sheetOpen) return;
    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    return () => window.removeEventListener("resize", updateAnchor);
  }, [sheetOpen, updateAnchor]);

  const runRefresh = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);
    setSheetOpen(false);
    await hardRefresh();
  }, [spinning]);

  const beginLongPress = () => {
    longPressFired.current = false;
    clearLongPressTimer();
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      updateAnchor();
      setSheetOpen(true);
    }, LONG_PRESS_MS);
  };

  const endLongPress = () => {
    clearLongPressTimer();
  };

  const handleRefreshClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    void runRefresh();
  };

  const handleClearCacheConfirm = async () => {
    setConfirmClear(false);
    setSheetOpen(false);
    setSpinning(true);
    await clearAllLocalData();
  };

  useEffect(() => {
    if (!sheetOpen && !confirmClear) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSheetOpen(false);
        setConfirmClear(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sheetOpen, confirmClear]);

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

  const backdropTransition = reduceMotion
    ? reducedMotionTransition
    : { duration: 0.26, ease: iosEase };
  const sheetTransition = reduceMotion ? reducedMotionTransition : iosSpring;
  const alertTransition = reduceMotion
    ? reducedMotionTransition
    : { type: "spring" as const, duration: 0.38, bounce: 0.12 };

  // Position sheet under refresh pill, right-aligned to button, clamped in frame
  const sheetPos = (() => {
    if (!anchor || !phoneFrame) {
      return { top: 72, left: 16, transformOrigin: "top right" };
    }
    const frameW = (phoneFrame as HTMLElement).clientWidth;
    const frameH = (phoneFrame as HTMLElement).clientHeight;
    let top = anchor.top + anchor.height + SHEET_GAP;
    let left = anchor.left + anchor.width - SHEET_W;
    left = Math.max(12, Math.min(left, frameW - SHEET_W - 12));
    // If not enough room below, place above
    if (top + 140 > frameH - 12) {
      top = Math.max(12, anchor.top - SHEET_GAP - 120);
    }
    const originX = anchor.originX - left;
    const originY = anchor.originY - top;
    return {
      top,
      left,
      transformOrigin: `${originX}px ${originY}px`,
    };
  })();

  const overlays =
    phoneFrame &&
    createPortal(
      <AnimatePresence>
        {sheetOpen && !confirmClear && (
          <motion.div
            key="refresh-action-sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            className="absolute inset-0 z-[200] bg-black/20 backdrop-blur-[3px]"
            onClick={() => setSheetOpen(false)}
            role="presentation"
          >
            <motion.div
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.55 }
              }
              animate={{ opacity: 1, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.55 }
              }
              transition={sheetTransition}
              style={{
                position: "absolute",
                top: sheetPos.top,
                left: sheetPos.left,
                width: SHEET_W,
                transformOrigin: sheetPos.transformOrigin,
                ...liquidGlassSurface,
                borderRadius: 22,
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
              role="menu"
              aria-label="Refresh options"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => void runRefresh()}
                className="w-full flex items-center gap-2.5 px-4 py-[13px] text-[17px] font-normal text-[#007AFF] tracking-[-0.02em] active:bg-black/[0.06] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-[17px] h-[17px] shrink-0" strokeWidth={1.75} />
                Refresh
              </button>
              <div className="h-px mx-3 bg-black/[0.08]" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setSheetOpen(false);
                  setConfirmClear(true);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-[13px] text-[17px] font-normal text-[#FF3B30] tracking-[-0.02em] active:bg-black/[0.06] transition-colors cursor-pointer"
              >
                <Trash2 className="w-[17px] h-[17px] shrink-0" strokeWidth={1.75} />
                Clear Cache
              </button>
            </motion.div>
          </motion.div>
        )}

        {confirmClear && (
          <motion.div
            key="clear-cache-alert"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            className="absolute inset-0 z-[210] flex items-center justify-center px-8 bg-black/25 backdrop-blur-[5px]"
            onClick={() => setConfirmClear(false)}
            role="presentation"
          >
            <motion.div
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 1.12 }
              }
              animate={{ opacity: 1, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.94 }
              }
              transition={alertTransition}
              className="w-full max-w-[270px] rounded-[16px] overflow-hidden"
              style={liquidGlassAlert}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="clear-cache-title"
              aria-describedby="clear-cache-desc"
            >
              <div className="px-4 pt-5 pb-4 text-center space-y-1">
                <h3
                  id="clear-cache-title"
                  className="text-[17px] font-semibold text-black tracking-[-0.02em] leading-snug"
                >
                  Clear All Local Data?
                </h3>
                <p
                  id="clear-cache-desc"
                  className="text-[13px] font-normal text-black/55 leading-[1.35] tracking-[-0.01em]"
                >
                  This removes your name, avatar, wallet link, rewards history, and onboarding state from this device. You can’t undo this action.
                </p>
              </div>

              <div className="h-px bg-black/[0.1]" />
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="flex-1 py-[11px] text-[17px] font-normal text-[#007AFF] tracking-[-0.02em] active:bg-black/[0.04] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <div className="w-px bg-black/[0.1] self-stretch" />
                <button
                  type="button"
                  onClick={() => void handleClearCacheConfirm()}
                  className="flex-1 py-[11px] text-[17px] font-semibold text-[#FF3B30] tracking-[-0.02em] active:bg-black/[0.04] transition-colors cursor-pointer"
                >
                  Clear Cache
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      phoneFrame,
    );

  const iconBtnClass =
    "w-9 h-9 flex items-center justify-center rounded-full text-[#3a4556] hover:text-[#00162b] active:bg-black/[0.06] transition-colors cursor-pointer touch-manipulation disabled:opacity-60";

  return (
    <header className="px-4 py-4 flex items-center justify-between absolute top-0 left-0 right-0 z-[60]">
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

      <LiquidGlassPill className="p-0.5">
        <button
          type="button"
          data-tour="nav-feedback"
          onClick={onFeedbackClick}
          aria-label="Send feedback"
          className={iconBtnClass}
        >
          <MessageSquarePlus className="w-5 h-5" strokeWidth={1.85} />
        </button>
      </LiquidGlassPill>

      <img
        src="/only_name.png"
        alt="Achievo"
        className="h-8 w-auto object-contain absolute left-1/2 -translate-x-1/2"
      />

      <LiquidGlassPill className="p-0.5">
        <button
          ref={refreshBtnRef}
          type="button"
          data-tour="nav-refresh"
          onClick={handleRefreshClick}
          onPointerDown={beginLongPress}
          onPointerUp={endLongPress}
          onPointerLeave={endLongPress}
          onPointerCancel={endLongPress}
          onContextMenu={(e) => e.preventDefault()}
          disabled={spinning}
          aria-label="Refresh app. Hold for more options."
          aria-haspopup="menu"
          aria-expanded={sheetOpen}
          className={iconBtnClass}
        >
          <RefreshCw
            className={`w-[18px] h-[18px] ${spinning ? "animate-spin" : ""}`}
            strokeWidth={1.85}
          />
        </button>
      </LiquidGlassPill>

      {overlays}
    </header>
  );
}
