"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

interface AiModelInfo {
  provider: string;
  modelId: string;
}

interface AiProgressState {
  isActive: boolean;
  taskName: string;
  progress: number;
  elapsedTime: number; // in milliseconds
  modelInfo: AiModelInfo | null;
  onCancel: (() => void) | null;
}

interface AiProgressContextType extends AiProgressState {
  startTask: (taskName: string, modelInfo?: AiModelInfo) => void;
  updateTaskName: (taskName: string) => void;
  endTask: () => void;
  setModelInfo: (modelInfo: AiModelInfo) => void;
  setOnCancel: (fn: (() => void) | null) => void;
}

const AiProgressContext = createContext<AiProgressContextType | undefined>(undefined);

export function AiProgressProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [modelInfo, setModelInfo] = useState<AiModelInfo | null>({ provider: "openai", modelId: "gpt-4o" });
  const [onCancel, setOnCancel] = useState<(() => void) | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startTask = useCallback((name: string, info?: AiModelInfo) => {
    // Reset any previous state
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);

    if (info) setModelInfo(info);
    
    setIsActive(true);
    setTaskName(name);
    setProgress(0);
    setElapsedTime(0);
    startTimeRef.current = Date.now();

    // Start timer for elapsed time
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Date.now() - startTimeRef.current);
      }
    }, 100);

    // Simulate asymptotic progress
    // Goes fast to 50%, slower to 80%, very slow to 95%
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 50) return prev + Math.random() * 5 + 2;
        if (prev < 80) return prev + Math.random() * 2 + 0.5;
        if (prev < 95) return prev + Math.random() * 0.5 + 0.1;
        return prev;
      });
    }, 300);
  }, []);

  const updateTaskName = useCallback((name: string) => {
    setTaskName(name);
  }, []);

  const endTask = useCallback(() => {
    // Stop timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    // Jump to 100%
    setProgress(100);
    
    // Update elapsed time one last time accurately
    if (startTimeRef.current) {
      setElapsedTime(Date.now() - startTimeRef.current);
    }

    // Keep it visible at 100% for 1.5 seconds, then hide
    finishTimeoutRef.current = setTimeout(() => {
      setIsActive(false);
      setProgress(0);
      setTaskName("");
    }, 1500);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    };
  }, []);

  return (
    <AiProgressContext.Provider value={{
      isActive,
      taskName,
      progress,
      elapsedTime,
      modelInfo,
      onCancel,
      startTask,
      updateTaskName,
      endTask,
      setModelInfo,
      setOnCancel
    }}>
      {children}
    </AiProgressContext.Provider>
  );
}

export function useAiProgress() {
  const context = useContext(AiProgressContext);
  if (context === undefined) {
    throw new Error("useAiProgress must be used within an AiProgressProvider");
  }
  return context;
}
