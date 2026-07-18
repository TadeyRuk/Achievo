import { useCallback, useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import {
  clearOnboardingDone,
  hasCompletedOnboarding,
  markOnboardingDone,
} from './storage';
import { TOUR_STEPS, type TourTab } from './tourSteps';

export type OnboardingPhase = "idle" | "welcome" | "tour";

type SetTab = (tab: TourTab) => void;

function wantsTourPreview(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("preview") === "tour";
  } catch {
    return false;
  }
}

interface UseOnboardingOptions {
  /** True when splash + login are done and the main shell is mounted. */
  ready: boolean;
  setTab: SetTab;
}

export function useOnboarding({ ready, setTab }: UseOnboardingOptions) {
  const [phase, setPhase] = useState<OnboardingPhase>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  /** True when the latest step change also switched tabs (tour should wait for settle). */
  const [tabHop, setTabHop] = useState(false);
  const startedRef = useRef(false);
  const lastTabRef = useRef<TourTab | null>(null);

  const complete = useCallback((reason: "skipped" | "completed") => {
    markOnboardingDone();
    setPhase("idle");
    setStepIndex(0);
    setTabHop(false);
    lastTabRef.current = null;
    setTab("home");
    posthog.capture(reason === "skipped" ? "onboarding_skipped" : "onboarding_completed");
  }, [setTab]);

  const goToStep = useCallback((index: number) => {
    const step = TOUR_STEPS[index];
    if (!step) return;
    const hop = lastTabRef.current !== null && lastTabRef.current !== step.tab;
    lastTabRef.current = step.tab;
    setTabHop(hop);
    setTab(step.tab);
    setStepIndex(index);
    posthog.capture("onboarding_step", { id: step.id, index });
  }, [setTab]);

  const startWelcome = useCallback(() => {
    setTab("home");
    setStepIndex(0);
    setTabHop(false);
    lastTabRef.current = "home";
    setPhase("welcome");
    posthog.capture("onboarding_welcome_shown");
  }, [setTab]);

  const startTour = useCallback(() => {
    setPhase("tour");
    goToStep(0);
  }, [goToStep]);

  const next = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= TOUR_STEPS.length) {
      complete("completed");
      return;
    }
    goToStep(nextIndex);
  }, [stepIndex, goToStep, complete]);

  const skip = useCallback(() => {
    complete("skipped");
  }, [complete]);

  const replay = useCallback(() => {
    clearOnboardingDone();
    startedRef.current = true;
    startWelcome();
  }, [startWelcome]);

  // Auto-start after splash/login when not yet completed (or ?preview=tour).
  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;

    if (wantsTourPreview()) {
      clearOnboardingDone();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startWelcome();
      return;
    }

    if (!hasCompletedOnboarding()) {
      startWelcome();
    }
  }, [ready, startWelcome]);

  const currentStep = phase === "tour" ? TOUR_STEPS[stepIndex] ?? null : null;
  const isLastStep = stepIndex >= TOUR_STEPS.length - 1;
  const active = phase === "welcome" || phase === "tour";

  return {
    phase,
    stepIndex,
    currentStep,
    isLastStep,
    active,
    tabHop,
    totalSteps: TOUR_STEPS.length,
    startTour,
    next,
    skip,
    replay,
  };
}
