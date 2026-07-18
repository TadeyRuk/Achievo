import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { iosEase, iosSpring, reducedMotionTransition } from "../sheetMotion";
import type { TourPlacement, TourStep } from "./tourSteps";

interface OnboardingTourProps {
  containerRef: RefObject<HTMLElement | null>;
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  isLastStep: boolean;
  /** True when this step switched tabs — wait for AnimatePresence settle. */
  tabHop?: boolean;
  onNext: () => void;
  onSkip: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPos {
  top: number;
  left: number;
}

const PAD = 6;
const FRAME_PAD = 12;
const GAP = 12;
const TOOLTIP_W = 280;
const TOOLTIP_FALLBACK_H = 160;
const TAB_SETTLE_MS = 300;
const RETRY_MS = 70;
const MAX_RETRIES = 12;

function measureSpotlight(
  container: HTMLElement,
  targetAttr: string,
): { rect: SpotlightRect; el: HTMLElement } | null {
  const el = container.querySelector(`[data-tour="${targetAttr}"]`) as HTMLElement | null;
  if (!el) return null;

  const c = container.getBoundingClientRect();
  const t = el.getBoundingClientRect();

  return {
    el,
    rect: {
      top: t.top - c.top - PAD,
      left: t.left - c.left - PAD,
      width: Math.max(0, t.width + PAD * 2),
      height: Math.max(0, t.height + PAD * 2),
    },
  };
}

function resolveSide(
  placement: TourPlacement | undefined,
  spotlight: SpotlightRect,
  tooltipH: number,
  containerH: number,
): "top" | "bottom" {
  const spaceBelow = containerH - (spotlight.top + spotlight.height) - FRAME_PAD;
  const spaceAbove = spotlight.top - FRAME_PAD;

  if (placement === "top") {
    return spaceAbove >= tooltipH + GAP || spaceAbove >= spaceBelow ? "top" : "bottom";
  }
  if (placement === "bottom") {
    return spaceBelow >= tooltipH + GAP || spaceBelow >= spaceAbove ? "bottom" : "top";
  }
  // auto
  return spaceBelow >= tooltipH + GAP || spaceBelow >= spaceAbove ? "bottom" : "top";
}

function computeTooltipPos(
  spotlight: SpotlightRect,
  containerW: number,
  containerH: number,
  tooltipH: number,
  placement: TourPlacement | undefined,
): TooltipPos {
  const side = resolveSide(placement, spotlight, tooltipH, containerH);
  const spotCenterX = spotlight.left + spotlight.width / 2;

  let left = spotCenterX - TOOLTIP_W / 2;
  left = Math.max(FRAME_PAD, Math.min(left, containerW - TOOLTIP_W - FRAME_PAD));

  let top: number;
  if (side === "bottom") {
    top = spotlight.top + spotlight.height + GAP;
    if (top + tooltipH > containerH - FRAME_PAD) {
      top = Math.max(FRAME_PAD, spotlight.top - GAP - tooltipH);
    }
  } else {
    top = spotlight.top - GAP - tooltipH;
    if (top < FRAME_PAD) {
      top = Math.min(
        spotlight.top + spotlight.height + GAP,
        containerH - tooltipH - FRAME_PAD,
      );
    }
  }

  top = Math.max(FRAME_PAD, Math.min(top, containerH - tooltipH - FRAME_PAD));
  return { top, left };
}

function isPillLike(rect: SpotlightRect): boolean {
  const ratio = rect.width / Math.max(rect.height, 1);
  return ratio < 1.35 && rect.width < 72;
}

export function OnboardingTour({
  containerRef,
  step,
  stepIndex,
  totalSteps,
  isLastStep,
  tabHop = false,
  onNext,
  onSkip,
}: OnboardingTourProps) {
  const reduceMotion = useReducedMotion();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const stepIdRef = useRef(step.id);

  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({ top: 120, left: 20 });
  const [ready, setReady] = useState(false);

  const layoutMove = reduceMotion
    ? reducedMotionTransition
    : { ...iosSpring, duration: 0.4 };
  const fadeTransition = reduceMotion
    ? reducedMotionTransition
    : { duration: 0.22, ease: iosEase };

  const applyLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;

    const measured = measureSpotlight(container, step.target);
    if (!measured) return false;

    measured.el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });

    // Re-measure after scroll
    const again = measureSpotlight(container, step.target);
    if (!again) return false;

    const { rect } = again;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const tooltipH =
      tooltipRef.current?.offsetHeight && tooltipRef.current.offsetHeight > 40
        ? tooltipRef.current.offsetHeight
        : TOOLTIP_FALLBACK_H;

    const pos = computeTooltipPos(rect, containerW, containerH, tooltipH, step.placement);

    setSpotlight(rect);
    setTooltipPos(pos);
    setReady(true);
    return true;
  }, [containerRef, step.target, step.placement]);

  // Refine tooltip once real height is known (after copy paints)
  useLayoutEffect(() => {
    if (!ready || !spotlight) return;
    const container = containerRef.current;
    const tip = tooltipRef.current;
    if (!container || !tip) return;

    const h = tip.offsetHeight;
    if (h < 40) return;

    const next = computeTooltipPos(
      spotlight,
      container.clientWidth,
      container.clientHeight,
      h,
      step.placement,
    );
    setTooltipPos((prev) =>
      Math.abs(prev.top - next.top) < 1 && Math.abs(prev.left - next.left) < 1
        ? prev
        : next,
    );
  }, [ready, spotlight, step.id, step.placement, containerRef, stepIndex]);

  useEffect(() => {
    stepIdRef.current = step.id;
    // Keep prior spotlight — no null flash
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);

    let cancelled = false;
    let attempts = 0;
    let retryTimer: number | undefined;
    let settleTimer: number | undefined;

    const run = () => {
      if (cancelled || stepIdRef.current !== step.id) return;

      const tryMeasure = () => {
        if (cancelled || stepIdRef.current !== step.id) return;
        if (applyLayout()) return;
        attempts += 1;
        if (attempts < MAX_RETRIES) {
          retryTimer = window.setTimeout(tryMeasure, RETRY_MS);
        }
      };

      // Double-rAF so layout after tab AnimatePresence is committed
      requestAnimationFrame(() => {
        requestAnimationFrame(tryMeasure);
      });
    };

    if (tabHop) {
      settleTimer = window.setTimeout(run, TAB_SETTLE_MS);
    } else {
      run();
    }

    const onResize = () => {
      if (stepIdRef.current === step.id) applyLayout();
    };
    window.addEventListener("resize", onResize);

    const container = containerRef.current;
    const scrollRoot = container?.querySelector(".overflow-y-auto") ?? null;
    scrollRoot?.addEventListener("scroll", onResize, { passive: true });

    return () => {
      cancelled = true;
      if (settleTimer !== undefined) window.clearTimeout(settleTimer);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      window.removeEventListener("resize", onResize);
      scrollRoot?.removeEventListener("scroll", onResize);
    };
  }, [step.id, tabHop, applyLayout, containerRef]);

  const pill = spotlight ? isPillLike(spotlight) : false;
  const radius = pill ? 999 : 20;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fadeTransition}
      className="absolute inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      {/* Continuous scrim; cutout animates between steps */}
      {spotlight ? (
        <motion.div
          className="absolute pointer-events-none"
          initial={false}
          animate={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            borderRadius: radius,
          }}
          transition={layoutMove}
          style={{
            boxShadow: "0 0 0 9999px rgba(0, 22, 43, 0.58)",
            outline: "1.5px solid rgba(255,255,255,0.55)",
            outlineOffset: 0,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#00162b]/58 pointer-events-none" />
      )}

      <div className="absolute inset-0" aria-hidden="true" />

      <motion.div
        ref={tooltipRef}
        initial={false}
        animate={{ top: tooltipPos.top, left: tooltipPos.left }}
        transition={layoutMove}
        className="absolute z-10 w-[min(280px,calc(100%-24px))] bg-white rounded-[22px] p-4 shadow-2xl border border-slate-100/90"
        style={{ maxWidth: TOOLTIP_W }}
      >
        <motion.div
          key={step.id}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fadeTransition}
          className="space-y-3"
        >
          <div className="flex items-start justify-between gap-2.5">
            <div className="space-y-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--dah-on-surface-variant)]">
                {stepIndex + 1} of {totalSteps}
              </p>
              <h3 className="text-[16px] font-extrabold text-[var(--dah-primary)] font-display leading-snug">
                {step.title}
              </h3>
              <p className="text-[12px] text-[var(--dah-on-surface-variant)] font-semibold leading-relaxed">
                {step.body}
              </p>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="shrink-0 text-[12px] font-bold text-[var(--dah-on-surface-variant)] hover:text-[var(--dah-primary)] px-1 py-0.5 cursor-pointer"
            >
              Skip
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {Array.from({ length: totalSteps }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === stepIndex ? "w-4 bg-[#ffbf21]" : "w-1.5 bg-slate-200"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onNext}
              className="px-5 py-2.5 rounded-full bg-[var(--dah-primary)] text-white font-extrabold text-[12px] font-display uppercase tracking-wider active:scale-[0.98] transition-transform cursor-pointer"
            >
              {isLastStep ? "Done" : "Next"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
