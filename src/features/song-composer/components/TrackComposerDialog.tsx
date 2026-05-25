"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Music, Waves, Drum, Guitar, Keyboard, ListMusic } from "lucide-react";
import { SongStructure } from '@/features/song-composer/schemas/song-generator.schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TrackComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSong: SongStructure | null;
  onGenerateTrack: (
    trackName: string,
    midiChannel: number,
    instrumentPreset: string,
    prompt: string,
    syncWithProgression?: boolean,
    lyrics?: string
  ) => void;
}

const INSTRUMENT_PRESETS = [
  { id: "grand-piano", name: "Grand Piano" },
  { id: "electric-piano", name: "Electric Piano" },
  { id: "vintage-rhodes", name: "Vintage Rhodes" },
  { id: "acoustic-bass", name: "Acoustic Bass" },
  { id: "electric-bass", name: "Electric Bass" },
  { id: "synth-pad", name: "Synth Pad" },
  { id: "synth-lead", name: "Synth Lead" },
  { id: "strings", name: "Strings" },
  { id: "drum-kit", name: "Drum Kit" },
];

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
      composerUserPrompt,
      true, // Siempre sincronizado estrictamente
      "" // Las letras ahora se obtienen automáticamente de la sección
    );
    setComposerUserPrompt("");
  };

  const applyTemplate = (name: string, channel: number, preset: string, prompt: string) => {
    setComposerTrackName(name);
    setComposerMidiChannel(channel);
    setComposerInstrumentPreset(preset);
    setComposerUserPrompt(prompt);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-3xl border-purple-500/20 bg-card/95 backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(168,85,247,0.15)] p-6 overflow-x-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b border-border/30">
          <DialogTitle className="text-2xl font-black flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
            <Sparkles className="w-6 h-6 text-purple-500 animate-pulse" />
            Asistente de Melodías y Pistas IA
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Diseña voces melódicas, líneas de bajo o arreglos orquestales. La IA sincronizará y armonizará matemáticamente las notas con los acordes de la canción completa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Templates */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ListMusic className="w-4 h-4" />
              Plantillas Inspiradoras
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate("Bajo Caminante", 2, "acoustic-bass", "Línea de bajo caminante (walking bass) en negras, acentuando la tónica y la quinta de cada acorde de forma rítmica.")}
                className="h-auto py-2.5 px-3 rounded-xl border-purple-500/10 hover:bg-purple-500/10 hover:text-purple-400 flex flex-col items-start gap-1 justify-start transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-[11px]"><Guitar className="w-3.5 h-3.5" /> Bajo Caminante</div>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate("Melodía Principal", 3, "synth-lead", "Melodía cantable y expresiva con notas ligadas, saltos melódicos suaves y notas largas al final de la frase.")}
                className="h-auto py-2.5 px-3 rounded-xl border-purple-500/10 hover:bg-purple-500/10 hover:text-purple-400 flex flex-col items-start gap-1 justify-start transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-[11px]"><Music className="w-3.5 h-3.5" /> Voz Melódica</div>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate("Pad Atmosférico", 4, "synth-pad", "Acordes extendidos y texturas de sintetizador mantenidas (notas largas de redonda) para dar un fondo armónico denso.")}
                className="h-auto py-2.5 px-3 rounded-xl border-purple-500/10 hover:bg-purple-500/10 hover:text-purple-400 flex flex-col items-start gap-1 justify-start transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-[11px]"><Waves className="w-3.5 h-3.5" /> Pad Atmosférico</div>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate("Arpegios Sintéticos", 5, "electric-piano", "Arpegios rápidos y continuos en semicorcheas subiendo y bajando por las notas del acorde.")}
                className="h-auto py-2.5 px-3 rounded-xl border-purple-500/10 hover:bg-purple-500/10 hover:text-purple-400 flex flex-col items-start gap-1 justify-start transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-[11px]"><Keyboard className="w-3.5 h-3.5" /> Arpegios Synth</div>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate("Cuerdas Épicas", 6, "strings", "Línea de cuerdas dramática y creciente, acompañando la armonía con arreglos de contrapunto.")}
                className="h-auto py-2.5 px-3 rounded-xl border-purple-500/10 hover:bg-purple-500/10 hover:text-purple-400 flex flex-col items-start gap-1 justify-start transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-[11px]"><Music className="w-3.5 h-3.5" /> Cuerdas Épicas</div>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate("Solo de Guitarra", 7, "electric-guitar", "Solo de guitarra expresivo con notas largas sostenidas, sutiles silencios y figuras rítmicas rápidas ocasionales para dar un tono rock/blues emocional.")}
                className="h-auto py-2.5 px-3 rounded-xl border-purple-500/10 hover:bg-purple-500/10 hover:text-purple-400 flex flex-col items-start gap-1 justify-start transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-[11px]"><Guitar className="w-3.5 h-3.5" /> Solo Guitarra</div>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-muted/20 p-5 rounded-2xl border border-border/40">
            {/* Track Name */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">
                Nombre de la Pista
              </Label>
              <Input
                value={composerTrackName}
                onChange={(e) => setComposerTrackName(e.target.value)}
                placeholder="Ej. Línea de Bajo..."
                className="rounded-xl border-border bg-card/50 h-10 text-xs font-semibold focus-visible:ring-purple-500"
              />
            </div>

            {/* Instrument Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">
                Instrumento (Preset)
              </Label>
              <Select value={composerInstrumentPreset} onValueChange={setComposerInstrumentPreset}>
                <SelectTrigger className="w-full rounded-xl border-border bg-card/50 h-10 text-xs font-semibold focus:ring-purple-500">
                  <SelectValue placeholder="Seleccionar Instrumento" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {INSTRUMENT_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id} className="text-xs">
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* MIDI Channel */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground flex justify-between">
                <span>Canal MIDI</span>
                {composerMidiChannel === 10 && <span className="text-[9px] text-amber-500">Percusión</span>}
              </Label>
              <Select value={composerMidiChannel.toString()} onValueChange={(val) => setComposerMidiChannel(parseInt(val, 10))}>
                <SelectTrigger className="w-full rounded-xl border-border bg-card/50 h-10 text-xs font-semibold focus:ring-purple-500">
                  <SelectValue placeholder="Seleccionar Canal" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-64">
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                    <SelectItem key={ch} value={ch.toString()} className="text-xs">
                      Canal {ch} {ch === 1 ? "(Acordes)" : ch === 10 ? "(Batería)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sincronización Estricta - Oculto (Siempre True) */}

          {/* Prompt Guidance Area */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-muted-foreground">
                Instrucción Creativa (Prompt)
              </Label>
              <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                Sincronización Estricta con Acordes
              </span>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <textarea
                value={composerUserPrompt}
                onChange={(e) => setComposerUserPrompt(e.target.value)}
                placeholder="Ej. Melodía arpegiada rápida en semicorcheas, alegre, que empiece en la tercera de cada acorde para dar una sensación dulce..."
                rows={4}
                className="relative w-full rounded-xl border border-purple-500/20 bg-card p-4 text-sm font-medium focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none hover:bg-card/90 transition-colors shadow-inner"
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-normal italic pt-1">
              *Nota: Escribe con naturalidad. La IA calculará automáticamente los tonos de paso y las tensiones para que la pista suene perfecta sobre la progresión base.*
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/30 mt-2">
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
            className="rounded-xl h-10 px-6 text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/20 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            Componer Pista IA
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
