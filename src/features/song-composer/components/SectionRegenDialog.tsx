"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { SongStructure } from '@/features/song-composer/schemas/song-generator.schema';

interface SectionRegenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSong: SongStructure | null;
  regenTrackId: string;
  regenSectionId: string;
  onRegenerate: (
    trackId: string,
    sectionId: string,
    prompt: string,
    syncWithProgression?: boolean
  ) => void;
}

export function SectionRegenDialog({
  open,
  onOpenChange,
  activeSong,
  regenTrackId,
  regenSectionId,
  onRegenerate
}: SectionRegenDialogProps) {
  const [regenUserPrompt, setRegenUserPrompt] = useState<string>("Melodía alternativa expresiva");
  const [syncWithProgression, setSyncWithProgression] = useState<boolean>(false);

  // Populate prompt from existing track section prompt when opening
  useEffect(() => {
    if (open && activeSong) {
      const track = activeSong.tracks?.find(t => t.id === regenTrackId);
      setRegenUserPrompt(track?.prompts?.[regenSectionId] || "");
      // Reset checkbox state when dialog opens
      setSyncWithProgression(false);
    }
  }, [open, activeSong, regenTrackId, regenSectionId]);

  if (!activeSong) return null;

  const track = activeSong.tracks?.find(t => t.id === regenTrackId);
  const section = activeSong.sections.find(s => s.id === regenSectionId);

  const handleSubmit = () => {
    onOpenChange(false);
    onRegenerate(regenTrackId, regenSectionId, regenUserPrompt, true); // Siempre sincronizado
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl border-purple-500/20 bg-card/95 backdrop-blur-md shadow-2xl p-6 overflow-x-hidden flex flex-col">
        <DialogHeader className="pb-3 border-b border-border/30">
          <DialogTitle className="text-lg font-black flex items-center gap-2 text-purple-400">
            <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
            Sinfonía AI: Componer / Regenerar Sección
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Compondrá o reemplazará las notas melódicas para la sección seleccionada de esta pista sin afectar al resto de la canción.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted/40 border border-border/30 rounded-2xl space-y-1">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Pista Activa</div>
            <div className="text-xs font-black text-foreground">
              {track ? `${track.name} (Canal MIDI ${track.midiChannel})` : "Desconocida"}
            </div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground mt-2">Sección a Componer</div>
            <div className="text-xs font-black text-purple-400 flex items-center gap-1.5">
              {section ? (
                <>
                  <span>{section.type}</span>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    ({section.key} {section.scale})
                  </span>
                </>
              ) : (
                "Desconocida"
              )}
            </div>
          </div>

          {/* Sincronización Estricta - Oculto (Siempre True) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
              <span>Instrucción / Prompt de Dirección Musical</span>
              <span className="text-[10px] text-purple-400 font-semibold">Sincronización Automática</span>
            </Label>
            <textarea
              value={regenUserPrompt}
              onChange={(e) => setRegenUserPrompt(e.target.value)}
              placeholder="Ej. Línea de bajo caminante alegre, melodía dulce que ascienda, improvisación en corcheas..."
              rows={4}
              className="w-full rounded-xl border border-border bg-card p-3 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none hover:bg-card/85 transition-colors"
            />
            <p className="text-[10px] text-muted-foreground italic">
              Tip: Indica melodías de referencia, ritmos (ej. síncopas, notas largas) o vibra para guiar a la IA.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-border/30">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-semibold px-4 cursor-pointer hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="rounded-xl text-xs font-black px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white cursor-pointer shadow-lg hover:shadow-purple-500/20"
            >
              Generar con AI
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
