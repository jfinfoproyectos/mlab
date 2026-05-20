"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { SongStructure } from "../schemas/song-generator.schema";

interface TrackComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSong: SongStructure | null;
  onGenerateTrack: (trackName: string, midiChannel: number, instrumentPreset: string, prompt: string) => void;
}

export function TrackComposerDialog({
  open,
  onOpenChange,
  activeSong,
  onGenerateTrack
}: TrackComposerDialogProps) {
  const [composerTrackName, setComposerTrackName] = useState<string>("Voz Principal");
  const [composerMidiChannel, setComposerMidiChannel] = useState<number>(2);
  const [composerInstrumentPreset, setComposerInstrumentPreset] = useState<string>("grand-piano");
  const [composerUserPrompt, setComposerUserPrompt] = useState<string>("");

  const handleSubmit = () => {
    if (!composerUserPrompt.trim()) return;
    onGenerateTrack(
      composerTrackName,
      composerMidiChannel,
      composerInstrumentPreset,
      composerUserPrompt
    );
    setComposerUserPrompt("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-3xl border-purple-500/20 bg-card/95 backdrop-blur-md shadow-2xl p-6 overflow-x-hidden flex flex-col">
        <DialogHeader className="pb-3 border-b border-border/30">
          <DialogTitle className="text-xl font-black flex items-center gap-2 text-purple-400">
            <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
            Sinfonía AI: Diseñador de Pistas y Arreglista Multicanal
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Agrega voces melódicas, líneas de bajo o arreglos instrumentales globales. La IA los sincronizará y armonizará automáticamente para toda la canción.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Global Generation Info Banner */}
          <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl space-y-1">
            <div className="text-[10px] uppercase font-bold text-purple-400">Generación Global de la Canción</div>
            <div className="text-xs font-semibold text-foreground leading-normal">
              Esta pista se compondrá en paralelo para **todas las secciones** de la canción en un solo clic. Después podrás regenerar o ajustar cualquier sección de forma independiente.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Track Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">
                Nombre de la Pista
              </Label>
              <Input
                value={composerTrackName}
                onChange={(e) => setComposerTrackName(e.target.value)}
                placeholder="Ej. Línea de Bajo, Voz Principal..."
                className="rounded-xl border-border bg-card h-10 text-xs font-semibold"
              />
            </div>

            {/* Predefined templates buttons */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">
                Plantillas Rápidas
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setComposerTrackName("Línea de Bajo");
                    setComposerMidiChannel(2);
                    setComposerInstrumentPreset("grand-piano");
                    setComposerUserPrompt("Línea de bajo caminante (walking bass) en negras, acentuando la tónica y la quinta de cada acorde.");
                  }}
                  className="h-8 rounded-lg text-[9px] font-bold border-purple-500/10 hover:bg-purple-500/10 hover:text-purple-400"
                >
                  🎸 Bajo Caminante
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setComposerTrackName("Melodía Principal");
                    setComposerMidiChannel(3);
                    setComposerInstrumentPreset("vintage-rhodes");
                    setComposerUserPrompt("Melodía cantable y expresiva con notas ligadas y saltos melódicos suaves.");
                  }}
                  className="h-8 rounded-lg text-[9px] font-bold border-purple-500/10 hover:bg-purple-500/10 hover:text-purple-400"
                >
                  🎤 Voz Melódica
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setComposerTrackName("Batería (Standard)");
                    setComposerMidiChannel(10);
                    setComposerInstrumentPreset("drum-kit");
                    setComposerUserPrompt("Patrón de batería estándar GM en canal 10. Bombo en C3 (tiempo 0 y 2), caja en D3 (tiempo 1 y 3) y contratiempo/charles cerrado en F#3 constante en corcheas.");
                  }}
                  className="h-8 rounded-lg text-[9px] font-bold border-purple-500/10 hover:bg-purple-500/10 hover:text-purple-400 col-span-2 animate-pulse"
                >
                  🥁 Batería (Standard Drum Kit - Ch. 10)
                </Button>
              </div>
            </div>
          </div>

          <div className="w-full">
            {/* MIDI Channel Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">
                Canal MIDI de Salida
              </Label>
              <select
                value={composerMidiChannel}
                onChange={(e) => setComposerMidiChannel(parseInt(e.target.value, 10))}
                className="w-full rounded-xl border border-border bg-card hover:bg-muted text-foreground h-10 px-3 text-xs font-semibold focus:outline-none transition-colors cursor-pointer"
              >
                {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                  <option key={ch} value={ch}>
                    Canal {ch} {ch === 1 ? "(General / Acordes)" : ch === 10 ? "(Batería / Percusión estándar)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prompt Guidance Area */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-muted-foreground">
                Dirección y Prompt para la Melodía
              </Label>
              <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                Armonización Sincronizada Activa
              </span>
            </div>
            <textarea
              value={composerUserPrompt}
              onChange={(e) => setComposerUserPrompt(e.target.value)}
              placeholder="Ej. Melodía arpegiada rápida en semicorcheas, alegre, que empiece en la tercera de cada acorde para dar una sensación dulce de tensión armónica..."
              rows={4}
              className="w-full rounded-xl border border-border bg-card p-3 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none hover:bg-card/85 transition-colors"
            />
            <p className="text-[10px] text-muted-foreground leading-normal italic">
              *Nota: La IA calculará automáticamente los tonos de paso y las tensiones del acorde para que la pista armonice sin disonancias indeseadas.*
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-border/30">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-10 text-xs font-bold text-muted-foreground hover:bg-muted"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!composerUserPrompt.trim()}
            className="rounded-xl h-10 px-5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-950/20 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            Generar Pista Completa con IA
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
