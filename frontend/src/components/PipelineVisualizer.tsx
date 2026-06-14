import { Bot, ShieldCheck, Coins, Link as LinkIcon, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "motion/react";

export type StepStatus = 'idle' | 'running' | 'done' | 'error';

export interface PipelineStep {
  name: string;
  desc: string;
  status: StepStatus;
  detail?: string;
}

interface PipelineVisualizerProps {
  steps: PipelineStep[];
  logs: string[];
}

const ICONS = [Bot, ShieldCheck, Coins, LinkIcon, MessageSquare];

export function PipelineVisualizer({ steps, logs }: PipelineVisualizerProps) {
  return (
    <div className="space-y-5">
      {/* Step list */}
      <div className="bg-white rounded-[12px] border border-[var(--dah-outline-variant)] p-4 space-y-0">
        {steps.map((step, index) => {
          const Icon = ICONS[index];
          const isDone    = step.status === 'done';
          const isRunning = step.status === 'running';
          const isError   = step.status === 'error';
          const isIdle    = step.status === 'idle';
          const isLast    = index === steps.length - 1;

          return (
            <div key={step.name} className="relative">
              {/* Connector */}
              {!isLast && (
                <div className={`absolute left-[19px] top-[40px] w-[2px] h-[calc(100%-16px)] transition-colors duration-500 ${
                  isDone ? "bg-[var(--dah-secondary-container)]" : "bg-[var(--dah-surface-high)]"
                }`} />
              )}

              <div className={`relative flex items-start gap-3.5 py-3 ${isIdle ? "opacity-45" : ""} transition-opacity duration-300`}>
                {/* Step icon */}
                <div className="shrink-0 mt-0.5">
                  {isDone ? (
                    <motion.div
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 360, damping: 24 }}
                      className="w-10 h-10 rounded-full bg-[var(--dah-secondary-container)] flex items-center justify-center shadow-sm"
                    >
                      <CheckCircle2 className="w-5 h-5 text-[var(--dah-on-secondary-container)]" />
                    </motion.div>
                  ) : isError ? (
                    <div className="w-10 h-10 rounded-full bg-[var(--dah-error-container)] border-2 border-[var(--dah-error)] flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-[var(--dah-error)]" />
                    </div>
                  ) : isRunning ? (
                    <div className="w-10 h-10 rounded-full bg-[var(--dah-surface-container)] border-2 border-[var(--dah-primary)] flex items-center justify-center text-[var(--dah-primary)] pulse-ring">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                        <Icon className="w-5 h-5" />
                      </motion.div>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--dah-surface-low)] border border-[var(--dah-outline-variant)] flex items-center justify-center text-[var(--dah-outline)]">
                      <Icon className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 pt-1.5">
                  <p className={`text-[14px] font-semibold leading-tight ${
                    isError   ? "text-[var(--dah-error)]" :
                    isRunning ? "text-[var(--dah-primary)]" :
                    isDone    ? "text-[var(--dah-on-surface)]" :
                                "text-[var(--dah-outline)]"
                  }`}>
                    {step.name}
                  </p>
                  <p className="text-[12px] text-[var(--dah-on-surface-variant)] mt-0.5 leading-snug">
                    {step.detail ?? step.desc}
                  </p>
                </div>

                {/* Status badge */}
                {isDone && (
                  <motion.span
                    initial={{ opacity: 0, x: 4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--dah-secondary)] bg-[var(--dah-secondary-container)]/20 px-2 py-1 rounded-[4px] mt-1.5"
                  >
                    Done
                  </motion.span>
                )}
                {isError && (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--dah-error)] bg-[var(--dah-error-container)] px-2 py-1 rounded-[4px] mt-1.5">
                    Error
                  </span>
                )}
                {isRunning && (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--dah-primary)] bg-[var(--dah-surface-container)] px-2 py-1 rounded-[4px] mt-1.5 animate-pulse">
                    Live
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Console log */}
      {logs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--dah-primary)] rounded-[12px] overflow-hidden"
        >
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10">
            <span className="w-2 h-2 rounded-full bg-[var(--dah-error)]" />
            <span className="w-2 h-2 rounded-full bg-[var(--dah-secondary-container)]" />
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="ml-2 text-[10px] font-bold text-white/40 uppercase tracking-[0.07em]">Agent Console</span>
          </div>
          <div className="p-4 max-h-40 overflow-y-auto space-y-1 font-mono custom-scrollbar">
            {logs.map((line, i) => (
              <div key={i} className="text-[11px] text-[var(--dah-secondary-container)]/90 leading-relaxed">
                {line}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
