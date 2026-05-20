"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Music, Check, CheckSquare, Square, Info } from "lucide-react";
import { SongStructure, SongSection } from "../schemas/song-generator.schema";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface AiRhythmAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSong: SongStructure | null;
  onGenerate: (prompt: string, sectionIds: string[]) => Promise<void>;
  isGenerating: boolean;
  defaultSectionId?: string | null;
}

const QUICK_PROMPTS = [
  { label: "🎹 Pop Ballad Arpeggio", text: "Arpegios de piano clásicos y fluidos en semicorcheas" },
  { label: "🥁 Latin Salsa Tumbao", text: "Tumbao de piano de salsa sincopado rítmicamente" },
  { label: "🌊 Bossa Nova Comping", text: "Acordes de Bossa Nova rítmicos y suaves en síncopas" },
  { label: "✨ Classical Alberti", text: "Patrón Alberti clásico de arpegios ascendentes y descendentes" },
  { label: "⚡ Block Chords", text: "Acordes en bloque redondos y estables marcando los 4 tiempos" },
  { label: "🎸 Funk Syncopation", text: "Síncopas rápidas de teclado funk con notas fantasma" },
];

export function AiRhythmAssistantDialog({
  open,
  onOpenChange,
  activeSong,
  onGenerate,
  isGenerating,
  defaultSectionId
}: AiRhythmAssistantDialogProps) {
  const [prompt, setPrompt] = useState<string>("");
  const [targetType, setTargetType] = useState<"all" | "selected">("all");
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({});

  // Reset selections or set pre-selected section on open
  useEffect(() => {
    if (open && activeSong) {
      const initial: Record<string, boolean> = {};
      
      if (defaultSectionId) {
        setTargetType("selected");
        activeSong.sections.forEach(s => {
          initial[s.id] = s.id === defaultSectionId;
        });
      } else {
        setTargetType("all");
        activeSong.sections.forEach(s => {
          initial[s.id] = true;
        });
      }
      setSelectedSections(initial);
      setPrompt("");
    }
  }, [open, activeSong, defaultSectionId]);

  if (!activeSong) return null;

  const handleToggleSection = (sectionId: string) => {
    setSelectedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleSelectAllSections = () => {
    const updated: Record<string, boolean> = {};
    activeSong.sections.forEach(s => {
      updated[s.id] = true;
    });
    setSelectedSections(updated);
  };

  const handleClearAllSections = () => {
    const updated: Record<string, boolean> = {};
    activeSong.sections.forEach(s => {
      updated[s.id] = false;
    });
    setSelectedSections(updated);
  };

  const handleQuickPromptClick = (text: string) => {
    setPrompt(text);
  };

  const handleSubmit = async () => {
    const targetSectionIds = targetType === "all" 
      ? activeSong.sections.map(s => s.id)
      : Object.entries(selectedSections)
          .filter(([_, isChecked]) => isChecked)
          .map(([id]) => id);

    if (targetSectionIds.length === 0) {
      return;
    }

    await onGenerate(prompt || "Acordes con ritmo armónico estándar", targetSectionIds);
    onOpenChange(false);
  };

  const activeSectionCount = targetType === "all" 
    ? activeSong.sections.length
    : Object.values(selectedSections).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] rounded-3xl border-purple-500/20 bg-card/95 backdrop-blur-md shadow-2xl p-6 overflow-y-auto flex flex-col scrollbar-thin">
        <DialogHeader className="pb-3 border-b border-border/30">
          <DialogTitle className="text-xl font-black flex items-center gap-2 text-purple-400">
            <Sparkles className="w-5.5 h-5.5 text-purple-500 animate-pulse" />
            Asistente de Ritmo IA
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Diseña o genera acompañamientos rítmicos y armónicos para la pista de progresiones mediante inteligencia artificial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4 flex-1">
          {/* Prompt input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
              <span>Instrucción / Estilo Rítmico</span>
              <span className="text-[10px] text-purple-400 font-semibold">Progresión Armónica IA</span>
            </Label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej. Arpegios ascendentes de piano clásicos en semicorcheas, ritmo sincopado de bossa nova, acordes en bloque..."
              rows={3}
              disabled={isGenerating}
              className="w-full rounded-2xl border border-border bg-muted/20 p-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none hover:bg-muted/40 transition-colors"
            />
          </div>

          {/* Quick Suggest Chips */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Estilos Populares</div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleQuickPromptClick(qp.text)}
                  className={cn(
                    "text-[10px] font-semibold px-2.5 py-1.5 rounded-xl border border-border/50 bg-muted/40 hover:bg-purple-500/10 hover:text-purple-450 hover:border-purple-500/20 active:scale-95 transition-all cursor-pointer",
                    prompt === qp.text && "bg-purple-500/20 border-purple-500/40 text-purple-450 dark:text-purple-400"
                  )}
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Sections Selection */}
          <div className="space-y-2 pt-2 border-t border-border/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-muted-foreground">Destino de la Generación</Label>
              <div className="flex bg-muted/50 p-0.5 rounded-xl border border-border/30">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setTargetType("all")}
                  className={cn(
                    "text-[10px] font-black px-3 py-1 rounded-lg transition-all cursor-pointer",
                    targetType === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Toda la Canción
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setTargetType("selected")}
                  className={cn(
                    "text-[10px] font-black px-3 py-1 rounded-lg transition-all cursor-pointer",
                    targetType === "selected" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Secciones
                </button>
              </div>
            </div>

            {/* Checklist of sections if Target is "selected" */}
            {targetType === "selected" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleSelectAllSections}
                    className="text-[9px] font-bold text-purple-400 hover:text-purple-500 flex items-center gap-1 cursor-pointer bg-transparent border-0"
                  >
                    <CheckSquare className="w-2.5 h-2.5" /> Seleccionar Todas
                  </button>
                  <span className="text-[9px] text-muted-foreground">|</span>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleClearAllSections}
                    className="text-[9px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer bg-transparent border-0"
                  >
                    <Square className="w-2.5 h-2.5" /> Desmarcar Todas
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1 border border-border/30 rounded-2xl p-2.5 bg-muted/10 scrollbar-thin">
                  {activeSong.sections.map((sect) => (
                    <div
                      key={sect.id}
                      onClick={() => !isGenerating && handleToggleSection(sect.id)}
                      className={cn(
                        "flex items-center gap-2.5 p-2 rounded-xl border border-border/40 hover:bg-muted/40 cursor-pointer transition-colors select-none",
                        selectedSections[sect.id] && "bg-purple-500/5 border-purple-500/20"
                      )}
                    >
                      <Checkbox
                        checked={!!selectedSections[sect.id]}
                        onCheckedChange={() => {}} // Controlled by outer div onClick
                        disabled={isGenerating}
                        className="pointer-events-none rounded-md"
                      />
                      <div className="truncate">
                        <div className="text-[10px] font-black text-foreground truncate">
                          {sect.type}
                        </div>
                        <div className="text-[8px] text-muted-foreground font-mono truncate">
                          {sect.key} {sect.scale} • {sect.chords?.chords?.length || 0} acordes
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3 flex gap-2 text-[10px] text-amber-600 dark:text-amber-400">
            <Info className="w-4 h-4 flex-shrink-0" />
            <div>
              Al generar con el Asistente de IA, la pista de progresiones de las secciones seleccionadas se guardará como <strong>Melodía de Notas IA</strong>, lo que evitará que se sobrescriba al cambiar el ritmo global en la barra de reproducción. Puedes re-sincronizar cuando quieras.
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 justify-end pt-3 border-t border-border/30">
          <Button
            variant="outline"
            disabled={isGenerating}
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-semibold px-4 cursor-pointer hover:bg-muted"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isGenerating || activeSectionCount === 0}
            className="rounded-xl text-xs font-black px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white cursor-pointer shadow-lg hover:shadow-purple-500/20 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isGenerating ? "Generando Ritmos..." : `Generar Ritmo (${activeSectionCount} Secc.)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
