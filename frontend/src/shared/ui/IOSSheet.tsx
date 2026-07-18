import type { ReactNode } from "react";
import {
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import { iosEase, iosSpring, reducedMotionTransition } from '../lib/sheetMotion';
import { liquidGlassSheet } from './liquidGlass';

const DISMISS_OFFSET_Y = 120;
const DISMISS_VELOCITY_Y = 800;

interface IOSSheetProps {
  onDismiss: () => void;
  children: ReactNode;
  /** Accessible name for the dialog surface. */
  "aria-label"?: string;
  className?: string;
  /** `glass` frosts the dimmed app behind the sheet (liquid glass). Default solid white. */
  variant?: "solid" | "glass";
}

export function IOSSheet({
  onDismiss,
  children,
  "aria-label": ariaLabel,
  className = "",
  variant = "solid",
}: IOSSheetProps) {
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const draggable = !reduceMotion;
  const isGlass = variant === "glass";

  const backdropTransition = reduceMotion
    ? reducedMotionTransition
    : { duration: 0.28, ease: iosEase };
  const sheetTransition = reduceMotion ? reducedMotionTransition : iosSpring;
  const sheetInitial = reduceMotion ? { opacity: 0 } : { y: "100%" };
  const sheetAnimate = reduceMotion ? { opacity: 1 } : { y: 0 };
  const sheetExit = reduceMotion ? { opacity: 0 } : { y: "100%" };

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > DISMISS_OFFSET_Y || info.velocity.y > DISMISS_VELOCITY_Y) {
      onDismiss();
    }
  }

  return (
    <motion.div
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={backdropTransition}
      className="absolute inset-0 z-[70] flex items-end"
    >
      {/* Scrim is a SIBLING of the sheet so glass backdrop-filter can sample the app,
          not a pre-blurred parent layer (which reads as opaque milk). */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={backdropTransition}
        className={`absolute inset-0 ${
          isGlass ? "bg-black/25" : "bg-black/40 backdrop-blur-md"
        }`}
        onClick={onDismiss}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        initial={sheetInitial}
        animate={sheetAnimate}
        exit={sheetExit}
        transition={sheetTransition}
        drag={draggable ? "y" : false}
        dragControls={draggable ? dragControls : undefined}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.45 }}
        onDragEnd={draggable ? handleDragEnd : undefined}
        className={`relative z-10 w-full max-h-[85%] flex flex-col rounded-t-[28px] overflow-hidden ${
          isGlass ? "" : "bg-white"
        } ${className}`}
        style={isGlass ? liquidGlassSheet : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex justify-center pt-3 pb-2 shrink-0 touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => {
            if (draggable) dragControls.start(e);
          }}
        >
          <div
            className={`w-9 h-1 rounded-full ${
              isGlass ? "bg-black/20" : "bg-[var(--dah-outline-variant)]"
            }`}
          />
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-8 pt-1">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
