"use client";

import React from "react";
import { useAiProgress } from '@/features/ai-assistant/hooks/use-ai-progress';
import { cn } from "@/lib/utils";
import { Bot, Loader2, Clock } from "lucide-react";

export function AiProgressIndicator() {
  const { isActive, taskName, progress, elapsedTime, modelInfo, onCancel } = useAiProgress();

  if (!isActive && progress === 0) return null;

  const seconds = (elapsedTime / 1000).toFixed(1);
  const isFinished = progress >= 100;

  return (
    <div className={cn(
      "fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-500 ease-out",
      isActive || isFinished ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
    )}>
      <div className="bg-background/95 backdrop-blur-xl border border-border/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-primary/10 rounded-2xl overflow-hidden flex flex-col min-w-[500px] max-w-[90vw]">
        
        {/* Main Content */}
        <div className="px-5 py-3 flex items-center justify-between gap-5">
          
          {/* Status Indicator & Task */}
          <div className="flex items-center gap-3 flex-1 overflow-hidden pr-4">
            <div className="relative flex items-center justify-center shrink-0 w-8 h-8">
              {isFinished ? (
                <div className="w-full h-full rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-20 animate-ping"></span>
                  <div className="relative w-full h-full rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Bot className="w-4 h-4 animate-pulse" />
                  </div>
                </>
              )}
            </div>
            
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {isFinished ? "Completado" : "Asistente IA Activo"}
              </span>
              <span className="text-sm font-semibold text-foreground break-words whitespace-normal leading-tight mt-0.5" title={taskName}>
                {isFinished ? "¡Generación finalizada!" : taskName || "Procesando..."}
              </span>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-4">
             {/* Model Used */}
             <div className="flex flex-col items-end">
               <span className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest">Modelo</span>
               <span className="text-[11px] font-medium text-foreground/80 mt-0.5 truncate max-w-[120px]">
                 {modelInfo?.modelId || "Automático"}
               </span>
             </div>

             {/* Response Time */}
             <div className="flex flex-col items-end">
               <span className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest">Tiempo</span>
               <span className="text-[11px] font-mono font-medium text-foreground/80 flex items-center gap-1 mt-0.5">
                 <Clock className="w-3 h-3 text-muted-foreground" />
                 {seconds}s
               </span>
             </div>
          </div>

          {/* Action Button */}
          {!isFinished && onCancel && (
            <div className="pl-4 border-l border-border/50">
              <button 
                onClick={onCancel}
                className="px-4 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold transition-colors shrink-0"
              >
                Cancelar
              </button>
            </div>
          )}
          
        </div>

        {/* Progress Bar Visual */}
        <div className="w-full h-1 bg-primary/10 relative overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
            style={{ width: `${isFinished ? 100 : Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>

      </div>
    </div>
  );
}
