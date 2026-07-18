import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { reducedMotionTransition } from "../sheetMotion";
import type { TourStep } from "./tourSteps";

interface OnboardingTourProps {
  containerRef: RefObject<HTMLElement | null>;
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  isLastStep: boolean;
  onNext: () => void;
  onSkip: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const SETTLE_MS = 320;
const RETRY_MS = 80;
const MAX_RETRIES = 10;
const TOOLTIP_EST_H = 168;

function measureTarget(
  container: HTMLElement,
  targetAttr: string,
): SpotlightRect | null {
  const el = container.querySelector(`[data-tour="${targetAttr}"]`) as HTMLElement | null;
  if (!el) return null;

  const c = container.getBoundingClientRect();
  const t = el.getBoundingClientRect();

  return {
    top: t.top - c.top - PAD,
    left: t.left - c.left - PAD,
    width: t.width + PAD * 2,
    height: t.height + PAD * 2,
  };
}

function rectsEqual(a: SpotlightRect | null, b: SpotlightRect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

function clampTooltipTop(
  spotlight: SpotlightRect | null,
  containerH: number,
): number {
  if (!spotlight) return Math.max(80, containerH * 0.35);

  const below = spotlight.top + spotlight.height + 12;
  const above = spotlight.top - TOOLTIP_EST_H - 12;

  // Prefer below the target; fall back above if it would overflow
  if (below + TOOLTIP_EST_H <= containerH - 12) {
    return Math.max(12, below);
  }
  if (above >= 12) {
    return above;
  }
  return Math.max(12, Math.min(below, containerH - TOOLTIP_EST_H - 12));
}

export function OnboardingTour({
  containerRef,
  step,
  stepIndex,
  totalSteps,
  isLastStep,
  onNext,
  onSkip,
}: OnboardingTourProps) {
  const reduceMotion = useReducedMotion();
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [tooltipTop, setTooltipTop] = useState(120);
  const stepIdRef = useRef(step.id);

  const applyMeasure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;
    const rect = measureTarget(container, step.target);
    if (!rect) return false;

    setSpotlight((prev) => (rectsEqual(prev, rect) ? prev : rect));
    const nextTop = clampTooltipTop(rect, container.clientHeight);
    setTooltipTop((prev) => (Math.abs(prev - nextTop) < 0.5 ? prev : nextTop));
    return true;
  }, [containerRef, step.target]);

  // Reset cutout immediately on step change, then settle + measure
  useEffect(() => {
    stepIdRef.current = step.id;
    setSpotlight(null);

    let cancelled = false;
    let attempts = 0;
    let retryTimer: number | undefined;

    const settleTimer = window.setTimeout(() => {
      if (cancelled || stepIdRef.current !== step.id) return;

      const tryMeasure = () => {
        if (cancelled || stepIdRef.current !== step.id) return;
        if (applyMeasure()) return;
        attempts += 1;
        if (attempts < MAX_RETRIES) {
          retryTimer = window.setTimeout(tryMeasure, RETRY_MS);
        }
      };

      tryMeasure();
    }, SETTLE_MS);

    const onResize = () => {
      if (stepIdRef.current === step.id) applyMeasure();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.clearTimeout(settleTimer);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [step.id, applyMeasure]);

  const tooltipStyle: CSSProperties = {
    top: tooltipTop,
    left: 16,
    right: 16,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduceMotion ? reducedMotionTransition : { duration: 0.22 }}
      className="absolute inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      {/* Scrim with spotlight hole via box-shadow — no size CSS transition */}
      {spotlight ? (
        <div
          className="absolute rounded-[20px] pointer-events-none"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: "0 0 0 9999px rgba(0, 22, 43, 0.62)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#00162b]/62 pointer-events-none" />
      )}

      {/* Block clicks on the app underneath */}
      <div className="absolute inset-0" aria-hidden="true" />

      {/* Tooltip card — top-only positioning; content fades per step */}
      <div
        className="absolute z-10 bg-white rounded-[24px] p-5 shadow-2xl border border-slate-100 space-y-3.5"
        style={tooltipStyle}
      >
        <motion.div
          key={step.id}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? reducedMotionTransition
              : { type: "spring", stiffness: 160, damping: 22 }
          }
          className="space-y-3.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--dah-on-surface-variant)]">
                {stepIndex + 1} of {totalSteps}
              </p>
              <h3 className="text-[17px] font-extrabold text-[var(--dah-primary)] font-display leading-snug">
                {step.title}
              </h3>
              <p className="text-[12.5px] text-[var(--dah-on-surface-variant)] font-semibold leading-relaxed">
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

          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {Array.from({ length: totalSteps }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === stepIndex ? "w-4 bg-[#ffbf21]" : "w-1.5 bg-slate-200"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onNext}
              className="px-5 py-2.5 rounded-full bg-[var(--dah-primary)] text-white font-extrabold text-[13px] font-display uppercase tracking-wider active:scale-[0.98] transition-transform cursor-pointer"
            >
              {isLastStep ? "Done" : "Next"}
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
