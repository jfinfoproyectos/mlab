"use client";

import { cn } from "@/lib/utils";
import { Sparkles, Music2, Loader2, X } from "lucide-react";

interface AiProgressBannerProps {
  /** Whether AI is currently generating */
  isGenerating: boolean;
  /** Label describing the current AI operation */
  operationLabel: string;
  /** Sub-label with more detail (e.g. section name, track name) */
  operationDetail?: string;
  /** Name of the active project/song */
  projectName?: string;
  /** Optional 0-100 progress. If undefined, shows indeterminate animation */
  progress?: number;
  /** Optional current step info shown in the bar */
  currentStep?: string;
  /** Optional total steps */
  totalSteps?: number;
  /** Optional completed steps */
  completedSteps?: number;
  /** Optional cancel handler */
  onCancel?: () => void;
  /** Optional extra class */
  className?: string;
}

export function AiProgressBanner({
  isGenerating,
  operationLabel,
  operationDetail,
  projectName,
  progress,
  currentStep,
  totalSteps,
  completedSteps,
  onCancel,
  className,
}: AiProgressBannerProps) {
  if (!isGenerating) return null;

  const hasProgress = progress !== undefined && progress >= 0;
  const hasSteps = totalSteps !== undefined && completedSteps !== undefined;

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/8 via-indigo-500/5 to-violet-500/8 backdrop-blur-sm overflow-hidden",
        "animate-in fade-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      {/* Shimmer top border */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-purple-500/60 to-transparent animate-pulse" />

      <div className="px-4 py-3 space-y-2.5">
        {/* Header Row: Project + Operation */}
        <div className="flex items-start gap-2.5">
          {/* Pulsing AI icon */}
          <div className="relative shrink-0 mt-0.5">
            <div className="w-7 h-7 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            </div>
            {/* Outer glow ring */}
            <div className="absolute -inset-0.5 rounded-xl bg-purple-500/10 blur-sm animate-pulse -z-10" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Project label */}
            {projectName && (
              <div className="flex items-center gap-1.5 mb-0.5">
                <Music2 className="w-2.5 h-2.5 text-purple-400/70 shrink-0" />
                <span className="text-[9px] font-bold text-purple-400/70 uppercase tracking-wider truncate">
                  {projectName}
                </span>
              </div>
            )}
            {/* Operation label */}
            <p className="text-[11px] font-black text-foreground leading-tight truncate">
              {operationLabel}
            </p>
            {/* Detail */}
            {operationDetail && (
              <p className="text-[9px] text-muted-foreground font-semibold mt-0.5 truncate">
                {operationDetail}
              </p>
            )}
          </div>

          {/* Spinner + Cancel */}
          <div className="flex items-center gap-2 shrink-0">
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-6 h-6 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive flex items-center justify-center hover:bg-destructive/20 active:scale-95 transition-all cursor-pointer"
                title="Cancelar proceso IA"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar area */}
        <div className="space-y-1.5">
          {/* Step info row */}
          <div className="flex items-center justify-between">
            {currentStep ? (
              <span className="text-[9px] text-purple-400/80 font-semibold truncate max-w-[80%]">
                {currentStep}
              </span>
            ) : (
              <span className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wide">
                Proceso activo · IA trabajando
              </span>
            )}
            {hasSteps && (
              <span className="text-[9px] font-mono font-bold text-purple-400 ml-1 shrink-0">
                {completedSteps}/{totalSteps}
              </span>
            )}
            {hasProgress && !hasSteps && (
              <span className="text-[9px] font-mono font-bold text-purple-400 ml-1 shrink-0">
                {Math.round(progress!)}%
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden border border-border/20">
            {hasProgress ? (
              /* Determinate */
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min(100, progress!)}%` }}
              />
            ) : (
              /* Indeterminate sliding bar */
              <div className="h-full w-full relative overflow-hidden">
                <div className="absolute h-full w-1/3 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full animate-[slide_1.5s_ease-in-out_infinite]" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Style for indeterminate animation */}
      <style jsx>{`
        @keyframes slide {
          0% { left: -33%; }
          100% { left: 133%; }
        }
      `}</style>
    </div>
  );
}
