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
      {/* Step List Card - 24px corner radius with dark background */}
      <div className="bg-[#041221] rounded-[24px] border border-white/10 p-5 space-y-0 shadow-lg">
        <h3 className="text-[14px] font-bold uppercase tracking-[0.08em] text-[#7e93ac] mb-4 font-display">
          Verification Logs
        </h3>
        {steps.map((step, index) => {
          const Icon = ICONS[index];
          const isDone    = step.status === 'done';
          const isRunning = step.status === 'running';
          const isError   = step.status === 'error';
          const isIdle    = step.status === 'idle';
          const isLast    = index === steps.length - 1;

          return (
            <div key={step.name} className="relative">
              {/* Connector Line */}
              {!isLast && (
                <div className={`absolute left-[20px] top-[42px] w-[2px] h-[calc(100%-14px)] transition-colors duration-500 ${
                  isDone ? "bg-[#ffbe42]" : "bg-white/10"
                }`} />
              )}

              <div className={`relative flex items-start gap-4 py-3.5 ${isIdle ? "opacity-35" : ""} transition-opacity duration-300`}>
                {/* Step Circle Icon */}
                <div className="shrink-0 mt-0.5">
                  {isDone ? (
                    <motion.div
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 360, damping: 24 }}
                      className="w-10 h-10 rounded-full bg-[#ffbe42] flex items-center justify-center shadow-sm"
                    >
                      <CheckCircle2 className="w-5 h-5 text-[#00162b]" />
                    </motion.div>
                  ) : isError ? (
                    <div className="w-10 h-10 rounded-full bg-[var(--dah-error-container)] border-2 border-[var(--dah-error)] flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-[var(--dah-error)]" />
                    </div>
                  ) : isRunning ? (
                    <div className="w-10 h-10 rounded-full bg-white/5 border-2 border-[#ffbe42] flex items-center justify-center text-[#ffbe42] pulse-ring">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                        <Icon className="w-5 h-5" />
                      </motion.div>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-white/40">
                      <Icon className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Step Text Info */}
                <div className="flex-1 min-w-0 pt-1">
                  <p className={`text-[14px] font-bold leading-tight font-display ${
                    isError   ? "text-[var(--dah-error)]" :
                    isRunning ? "text-[#ffbe42]" :
                    isDone    ? "text-white" :
                                "text-white/40"
                  }`}>
                    {step.name}
                  </p>
                  <p className="text-[12px] text-slate-400 mt-0.5 leading-snug font-medium">
                    {step.detail ?? step.desc}
                  </p>
                </div>

                {/* Status Badges - Pill shaped */}
                {isDone && (
                  <motion.span
                    initial={{ opacity: 0, x: 4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#ffbe42] bg-[#ffbe42]/10 px-2.5 py-1 rounded-full mt-1 font-display"
                  >
                    Done
                  </motion.span>
                )}
                {isError && (
                  <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--dah-error)] bg-[var(--dah-error-container)] px-2.5 py-1 rounded-full mt-1 font-display">
                    Error
                  </span>
                )}
                {isRunning && (
                  <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#ffbe42] bg-[#ffbe42]/20 px-2.5 py-1 rounded-full mt-1 animate-pulse font-display">
                    Live
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal Log Console - 24px corner radius */}
      {logs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--dah-primary)] rounded-[24px] overflow-hidden shadow-md"
        >
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--dah-error)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--dah-secondary-container)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="ml-2 text-[10px] font-bold text-white/40 uppercase tracking-[0.08em] font-display">
              Pipeline Console Log
            </span>
          </div>
          <div className="p-5 max-h-48 overflow-y-auto space-y-1.5 font-mono custom-scrollbar bg-[#02052b]">
            {logs.map((line, i) => (
              <div key={i} className="text-[11px] text-[var(--dah-secondary-container)]/90 leading-relaxed font-semibold">
                {line}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
