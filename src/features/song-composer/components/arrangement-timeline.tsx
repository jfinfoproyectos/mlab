"use client";

import React from "react";
import { RotateCcw, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SongStructure, SongSection } from '@/features/song-composer/schemas/song-generator.schema';

interface ArrangementTimelineProps {
  activeSong: SongStructure;
  activeSectionId: string | null;
  setActiveSectionId: (id: string) => void;
  generatingSectionIds: Record<string, boolean>;
  handleRegenerateSection: (section: SongSection) => void;
  loading: boolean;
  playbackSectionId?: string | null;
  onAddSection?: () => void;
  onDeleteSection?: (sectionId: string) => void;
}

export function ArrangementTimeline({
  activeSong,
  activeSectionId,
  setActiveSectionId,
  generatingSectionIds,
  handleRegenerateSection,
  loading,
  playbackSectionId,
  onAddSection,
  onDeleteSection
}: ArrangementTimelineProps) {
  return (
    <div className="space-y-3">
      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
        Línea de Tiempo del Arreglo ({activeSong.sections.length} secciones)
      </Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeSong.sections.map((sect) => {
          const isSelected = activeSectionId === sect.id;
          const isGen = generatingSectionIds[sect.id];
          const hasChords = !!sect.chords;
          const isPlaying = playbackSectionId === sect.id;
          const showSelected = isSelected && !playbackSectionId;

          return (
            <div
              key={sect.id}
              onClick={() => {
                if (!isGen && !playbackSectionId) setActiveSectionId(sect.id);
              }}
              className={`group relative rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between min-h-[120px] ${
                playbackSectionId ? "cursor-default" : "cursor-pointer"
              } ${
                isPlaying
                  ? "bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/40 scale-[1.03] z-10 animate-pulse"
                  : showSelected 
                    ? "bg-primary/10 border-primary shadow-md shadow-primary/5 scale-[1.02] z-10" 
                    : isGen 
                      ? "bg-muted/10 border-border/40 pointer-events-none"
                      : playbackSectionId
                        ? "bg-card/25 border-border/20 opacity-40"
                        : "bg-card/25 border-border/40 hover:bg-card/45 hover:border-primary/20"
              }`}
            >
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                    {isPlaying && (
                      <span className="flex items-end gap-0.5 h-3 mr-1" title="Reproduciendo">
                        <span className="w-1 h-2 bg-emerald-500 rounded-full animate-bounce duration-500" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce duration-500" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1.5 bg-emerald-500 rounded-full animate-bounce duration-500" style={{ animationDelay: '300ms' }} />
                      </span>
                    )}
                    {sect.type}
                  </span>
                  
                  {/* Section Status Badge */}
                  {isGen ? (
                    <span className="w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin shrink-0" />
                  ) : hasChords ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30 shrink-0" title="Acordes listos" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" title="Esperando generación" />
                  )}
                </div>

                {/* Reused / Variation indicators */}
                {(sect.reusedFrom || sect.variationOf) && (
                  <div className="flex flex-wrap gap-1 my-1">
                    {sect.reusedFrom && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" title={`Copia exacta de ${sect.reusedFrom}`}>
                        🔗 Clon de {sect.reusedFrom}
                      </span>
                    )}
                    {sect.variationOf && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20" title={`Variación de ${sect.variationOf}`}>
                        ✨ Var. de {sect.variationOf}
                      </span>
                    )}
                  </div>
                )}

                <h4 className="text-sm font-bold truncate">
                  {sect.chords ? sect.chords.chords.map(c => c.chord).join(" ➔ ") : "Generando progresiones..."}
                </h4>
                
                <p className="text-[10px] text-muted-foreground/80 leading-normal line-clamp-2" title={sect.prompt}>
                  {sect.prompt}
                </p>
              </div>

              {/* Bottom Row inside Section Stepper card */}
              <div className="flex justify-between items-center pt-2.5 mt-2 border-t border-border/20">
                <div className="text-[9px] text-muted-foreground font-semibold flex flex-col gap-0.5">
                  <div>{sect.key} · {sect.scale}</div>
                  {sect.chordCount && <div className="text-[8px] text-primary/80 font-bold uppercase tracking-widest">{sect.chordCount} acordes</div>}
                </div>

                {/* Section-level Regeneration */}
                <div className="flex items-center gap-1">
                  {/* Section-level Regeneration */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRegenerateSection(sect);
                    }}
                    disabled={isGen || loading}
                    className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all duration-200 shrink-0"
                    title="Regenerar acordes de esta sección únicamente"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isGen ? "animate-spin" : ""}`} />
                  </button>
                  
                  {/* Delete Section */}
                  {onDeleteSection && activeSong.sections.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSection(sect.id);
                      }}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all duration-200 shrink-0"
                      title="Eliminar esta sección"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Manual Section Button */}
        {onAddSection && (
          <button
            onClick={onAddSection}
            className="group relative rounded-2xl border border-dashed border-border/60 bg-transparent hover:bg-muted/30 p-4 transition-all duration-300 flex flex-col items-center justify-center min-h-[120px] text-muted-foreground hover:text-foreground hover:border-primary/40"
            title="Añadir nueva sección manualmente"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2 group-hover:bg-primary/10 transition-colors">
              <Plus className="w-5 h-5 group-hover:text-primary transition-colors" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">Añadir Sección</span>
          </button>
        )}
      </div>
    </div>
  );
}
