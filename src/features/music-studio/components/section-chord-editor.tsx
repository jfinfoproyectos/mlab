import React from "react";
import { BookOpen, AlertCircle, Play } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { PianoKeyboard } from "./piano-keyboard";
import { SongSection } from "../schemas/song-generator.schema";

interface SectionChordEditorProps {
  selectedSection: SongSection;
  generatingSectionIds: Record<string, boolean>;
  getRoleColor: (role: string) => string;
}

export function SectionChordEditor({
  selectedSection,
  generatingSectionIds,
  getRoleColor
}: SectionChordEditorProps) {
  const isGenerating = generatingSectionIds[selectedSection.id];

  return (
    <div className="space-y-6 pt-4 border-t border-border/40">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Sección Activa: <span className="text-primary font-black uppercase">{selectedSection.type}</span>
          </h4>
          <p className="text-xs text-muted-foreground leading-normal mt-0.5">
            Armonía e improvisación calculadas específicamente para la instrucción: "{selectedSection.prompt}"
          </p>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
          Tonalidad Sección: {selectedSection.key} ({selectedSection.scale})
        </div>
      </div>

      {isGenerating ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <span className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-bold text-muted-foreground animate-pulse">
            IA componiendo la progresión perfecta para la sección {selectedSection.type}...
          </p>
        </div>
      ) : !selectedSection.chords ? (
        <div className="text-center py-14 rounded-2xl border border-dashed border-border bg-card/10 p-6 space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-xs text-muted-foreground">
            No hay acordes disponibles para esta sección. Haz clic en el botón de regenerar para crearlos.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Detailed theory analysis box */}
          {selectedSection.chords.theoryExplanation && (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5 space-y-2 relative overflow-hidden shadow-inner">
              <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-20 h-20 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <h5 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary" />
                Análisis Armónico y Conducción de Voces ({selectedSection.type})
              </h5>
              <p className="text-sm text-foreground/80 leading-relaxed italic">
                "{selectedSection.chords.theoryExplanation}"
              </p>
            </div>
          )}

          {/* Chords Grid */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Acordes de la Sección
            </Label>
            
            <TooltipProvider>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {selectedSection.chords.chords.map((chordObj: any, idx: number) => {
                  const chordLength = chordObj.chord?.length || 0;
                  const dynamicTextClass = 
                    chordLength > 8 
                      ? "text-lg md:text-xl font-black tracking-tight text-primary font-mono break-all" 
                      : chordLength > 5 
                        ? "text-xl md:text-2xl font-black tracking-tight text-primary font-mono break-all" 
                        : "text-3xl font-black tracking-tight text-primary font-mono";

                  return (
                    <div 
                      key={idx}
                      className="group relative rounded-2xl border border-border bg-card/30 p-4 transition-all duration-300 hover:scale-[1.02] hover:border-primary/20 hover:bg-card/50 flex flex-col justify-between shadow-md min-h-[310px] overflow-hidden"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className={dynamicTextClass} title={chordObj.chord}>
                            {chordObj.chord}
                          </div>
                          
                          <div className="space-y-1">
                            {chordObj.inversion && (
                              <div className="text-[10px] text-muted-foreground leading-snug">
                                Inversión: <span className="text-foreground font-semibold">{chordObj.inversion}</span>
                              </div>
                            )}
                            {chordObj.voicing && (
                              <div className="text-[10px] text-muted-foreground/80 leading-snug italic truncate" title={chordObj.voicing}>
                                Voicing: {chordObj.voicing}
                              </div>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-muted-foreground/40 bg-muted/40 px-2 py-0.5 rounded-md shrink-0 self-start">
                          #{idx + 1}
                        </span>
                      </div>

                      {/* Color Badges */}
                      <div className="mt-3.5 space-y-2">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRoleColor(chordObj.role)}`}>
                            {chordObj.role}
                          </span>
                          {chordObj.romanNumeral && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary">
                              {chordObj.romanNumeral}
                            </span>
                          )}
                        </div>

                        {chordObj.suggestedScale && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <span className="font-bold text-foreground/75 shrink-0">Impro:</span>
                            <span className="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-medium truncate" title={chordObj.suggestedScale}>
                              {chordObj.suggestedScale}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                          <div className="text-[10px] font-bold text-primary/80 flex items-center gap-1">
                            <span>Duración:</span>
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              {chordObj.duration}t
                            </span>
                          </div>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50 border border-border/50 px-1.5 py-0.5 rounded transition-all duration-200 ml-auto">
                                <AlertCircle className="w-3 h-3 text-primary/70" />
                                <span>Detalles</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] bg-popover text-popover-foreground border border-border shadow-lg rounded-xl p-3 text-[11px] leading-relaxed z-50">
                              {chordObj.description}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Virtual Piano Keyboard */}
                      <PianoKeyboard activeNotes={chordObj.pianoNotes || []} />
                    </div>
                  );
                })}
              </div>
            </TooltipProvider>
          </div>
        </div>
      )}
    </div>
  );
}
