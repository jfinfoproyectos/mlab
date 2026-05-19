"use client";

import React from "react";
import { Sliders, Trash2, Save, Music, Sparkles, Loader2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { generateRhythmPatternAction } from "../actions/rhythm-generator.actions";

interface RhythmPattern {
  id: string;
  name: string;
  steps: boolean[][];
}

interface RhythmSequencerProps {
  playbackMode: "basic" | "rhythm" | "arpeggio" | "custom-rhythm";
  selectedRhythmPattern: string;
  customRhythmSteps: boolean[][];
  toggleStepNote: (rowIdx: number, stepIdx: number) => void;
  loadPopGrooveTemplate: () => void;
  fillFourOnFloorChords: () => void;
  clearCustomSteps: () => void;
  newRhythmName: string;
  setNewRhythmName: (name: string) => void;
  saveCustomRhythm: () => void;
  savedRhythms: RhythmPattern[];
  setCustomRhythmSteps: (steps: boolean[][]) => void;
  setSelectedRhythmPattern: (pattern: string) => void;
  deleteCustomRhythm: (id: string, e: React.MouseEvent) => void;
}

const PIANO_ROLL_ROWS = [
  { index: 4, label: "Melodía (Agudo)", role: "Nota Coral 4", colorClass: "bg-pink-500 hover:bg-pink-400 border-pink-500/30 text-pink-400", activeShadow: "shadow-pink-500/20" },
  { index: 3, label: "Tercera", role: "Nota Coral 3", colorClass: "bg-purple-500 hover:bg-purple-400 border-purple-500/30 text-purple-400", activeShadow: "shadow-purple-500/20" },
  { index: 2, label: "Voz Media", role: "Nota Coral 2", colorClass: "bg-indigo-500 hover:bg-indigo-400 border-indigo-500/30 text-indigo-400", activeShadow: "shadow-indigo-500/20" },
  { index: 1, label: "Tenor", role: "Nota Coral 1", colorClass: "bg-emerald-500 hover:bg-emerald-400 border-emerald-500/30 text-emerald-400", activeShadow: "shadow-emerald-500/20" },
  { index: 0, label: "Bajo (Grave)", role: "Línea de Bajo", colorClass: "bg-blue-500 hover:bg-blue-400 border-blue-500/30 text-blue-400", activeShadow: "shadow-blue-500/20" }
];

export function RhythmSequencer({
  playbackMode,
  selectedRhythmPattern,
  customRhythmSteps,
  toggleStepNote,
  loadPopGrooveTemplate,
  fillFourOnFloorChords,
  clearCustomSteps,
  newRhythmName,
  setNewRhythmName,
  saveCustomRhythm,
  savedRhythms,
  setCustomRhythmSteps,
  setSelectedRhythmPattern,
  deleteCustomRhythm
}: RhythmSequencerProps) {
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);

  if (playbackMode !== "custom-rhythm") {
    return null;
  }

  // Helper to check if step index starts a new beat (compás / tiempo marker)
  const isNewBeat = (stepIdx: number) => stepIdx % 4 === 0;

  const handleGenerateAiRhythm = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    const toastId = toast.loading("Componiendo patrón rítmico personalizado con IA...");
    try {
      const result = await generateRhythmPatternAction(aiPrompt);
      if (result.success && result.steps) {
        setCustomRhythmSteps(result.steps);
        setNewRhythmName(result.name || `IA: ${aiPrompt}`);
        toast.success(`Patrón "${result.name || 'Personalizado por IA'}" generado y cargado con éxito!`, { id: toastId });
      } else {
        toast.error(result.error || "No se pudo generar el ritmo.", { id: toastId });
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Error de red o conexión al generar el ritmo por IA.", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-950/65 backdrop-blur-md p-6 rounded-3xl shadow-2xl space-y-6 animate-in slide-in-from-top-3 duration-300">
      
      {/* Header section with titles and preset action triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-900">
        <div className="space-y-1">
          <CardTitle className="text-base font-black text-emerald-400 flex items-center gap-2.5 tracking-wide uppercase">
            <Sliders className="w-5 h-5 text-emerald-500 animate-pulse" />
            Piano Roll Rítmico (16 Pasos)
          </CardTitle>
          <p className="text-[11px] text-zinc-400 max-w-lg leading-relaxed">
            Un secuenciador 2D profesional. Haz clic en las celdas para añadir notas. Las celdas verticales representan registros musicales desde el bajo hasta la melodía superior.
          </p>
        </div>
        
        {/* Preset loading triggers */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={loadPopGrooveTemplate}
            className="h-8 text-[10px] font-black bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl px-3 border border-zinc-800"
          >
            🎸 Pop Groove
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={fillFourOnFloorChords}
            className="h-8 text-[10px] font-black bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl px-3 border border-zinc-800"
          >
            🔥 4-on-the-Floor
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearCustomSteps}
            className="h-8 text-[10px] font-black bg-zinc-900/60 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-xl px-3 border border-zinc-850"
          >
            🧹 Limpiar
          </Button>
        </div>
      </div>

      {/* AI Rhythm Prompt Designer Input Sub-panel */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/80">
        <div className="flex items-center gap-2 shrink-0">
          <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div className="text-xs font-black text-zinc-200 uppercase tracking-wider">
            Diseñador de Ritmos con IA
          </div>
        </div>
        
        <div className="flex-1 w-full flex gap-2">
          <Input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            disabled={isGenerating}
            placeholder="Introduce un estilo o instrucción (ej: 'Dembow sincopado pesado', 'Funk bailable de los 80', 'EDM enérgico')..."
            className="rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200 h-10 text-xs focus-visible:ring-emerald-500/50"
          />
          <Button
            type="button"
            onClick={handleGenerateAiRhythm}
            disabled={isGenerating || !aiPrompt.trim()}
            className="rounded-xl h-10 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black text-xs font-black px-5 flex items-center gap-2 shadow-md shadow-emerald-500/10 transition-transform active:scale-95 shrink-0"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                Componiendo...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black fill-black" />
                Generar Ritmo IA
              </>
            )}
          </Button>
        </div>
      </div>

      {/* The 2D Piano Roll Grid */}
      <div className="relative overflow-x-auto rounded-2xl border border-zinc-850 bg-zinc-950/90 shadow-inner">
        <div className="min-w-[760px] p-4 select-none">
          {/* Header step indicators: time signature layout */}
          <div className="grid grid-cols-[140px_1fr] gap-2 pb-2">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1.5 flex items-center">
              Voces / Registro
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
              {Array.from({ length: 16 }).map((_, stepIdx) => {
                const beatNum = Math.floor(stepIdx / 4) + 1;
                const noteInBeat = (stepIdx % 4) + 1;
                const newBeat = isNewBeat(stepIdx);
                
                return (
                  <div 
                    key={stepIdx} 
                    className={`text-center flex flex-col items-center justify-center py-1 rounded-md transition-all ${
                      newBeat ? "bg-zinc-900/60 border border-zinc-800/80" : ""
                    }`}
                  >
                    <span className={`text-[8px] font-black leading-none ${newBeat ? "text-emerald-400" : "text-zinc-600"}`}>
                      {newBeat ? `T${beatNum}` : `${beatNum}.${noteInBeat}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rows representing musical tones/registers */}
          <div className="space-y-1.5">
            {PIANO_ROLL_ROWS.map((row) => {
              const { index: rowIdx, label, role, colorClass, activeShadow } = row;
              
              return (
                <div key={rowIdx} className="grid grid-cols-[140px_1fr] gap-2 items-center">
                  
                  {/* Left row key headers */}
                  <div className="px-3 py-2 rounded-xl bg-zinc-900/50 border border-zinc-850 flex items-center justify-between shadow-sm">
                    <span className="text-[10px] font-black text-zinc-200 tracking-tight truncate">
                      {role}
                    </span>
                    <span className="text-[8px] font-bold text-zinc-500 tracking-tighter uppercase">
                      {label}
                    </span>
                  </div>

                  {/* 16 steps cells row */}
                  <div className="grid gap-1 h-10" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
                    {Array.from({ length: 16 }).map((_, stepIdx) => {
                      const isActive = !!(customRhythmSteps[rowIdx] && customRhythmSteps[rowIdx][stepIdx]);
                      const newBeat = isNewBeat(stepIdx);
                      
                      return (
                        <button
                          key={stepIdx}
                          type="button"
                          onClick={() => toggleStepNote(rowIdx, stepIdx)}
                          className={`w-full h-full rounded-lg border transition-all duration-200 relative flex items-center justify-center ${
                            isActive
                              ? `${colorClass} ${activeShadow} text-white border-transparent scale-[0.96] shadow-md shadow-current/10 animate-in zoom-in-95 duration-100`
                              : `bg-zinc-950 hover:bg-zinc-900/40 border-zinc-900 hover:border-zinc-800 ${
                                  newBeat ? "border-l-zinc-800/80" : ""
                                }`
                          }`}
                          title={`Fila ${role}, Paso ${stepIdx + 1}`}
                        >
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping absolute" />
                          )}
                          {!isActive && newBeat && (
                            <span className="w-0.5 h-0.5 rounded-full bg-zinc-800" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Save Pattern Form & Manage Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 items-end">
        {/* Save form */}
        <div className="lg:col-span-7 space-y-2">
          <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
            <Music className="w-3 h-3 text-emerald-400" />
            Guardar este patrón en tu Biblioteca
          </Label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={newRhythmName}
              onChange={(e) => setNewRhythmName(e.target.value)}
              placeholder="Escribe un nombre (ej: Pop Sincopado 16...)"
              className="rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-200 h-10 text-xs focus-visible:ring-emerald-500/50"
            />
            <Button
              type="button"
              onClick={saveCustomRhythm}
              className="rounded-xl h-10 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black px-5 flex items-center gap-2 shadow-md shadow-emerald-500/10 transition-transform active:scale-95"
            >
              <Save className="w-4 h-4 fill-black" />
              Guardar Patrón
            </Button>
          </div>
        </div>

        {/* List of Custom rhythms */}
        <div className="lg:col-span-5 space-y-2">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
            Tus Patrones Guardados
          </span>
          {savedRhythms.length === 0 ? (
            <div className="text-[11px] text-zinc-500 italic py-3 bg-zinc-900/10 rounded-2xl border border-zinc-900 border-dashed text-center">
              Aún no has guardado ritmos en el Piano Roll.
            </div>
          ) : (
            <div className="max-h-24 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
              {savedRhythms.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    setCustomRhythmSteps(r.steps);
                    setSelectedRhythmPattern(`custom-${r.id}`);
                    toast.success(`Patrón "${r.name}" cargado en el Piano Roll.`);
                  }}
                  className={`flex justify-between items-center px-4 py-2 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                    selectedRhythmPattern === `custom-${r.id}`
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-sm"
                      : "bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900/70 text-zinc-300"
                  }`}
                >
                  <span className="truncate">{r.name}</span>
                  <button
                    type="button"
                    onClick={(e) => deleteCustomRhythm(r.id, e)}
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Eliminar patrón"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
