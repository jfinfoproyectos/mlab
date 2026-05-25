import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Sparkles, Drum, Music2, Activity, PlaySquare, Settings2, Link2 } from "lucide-react";
import { SongStructure } from "../schemas/song-generator.schema";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DRUM_MAPPINGS, type DrumMapping } from "../schemas/drum-maps";

interface DrumComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSong: SongStructure | null;
  onGenerateDrumTrack: (
    trackName: string,
    prompt: string,
    mapping?: DrumMapping,
    syncWithProgression?: boolean,
    customDrumMap?: string
  ) => void;
}

export function DrumComposerDialog({
  open,
  onOpenChange,
  activeSong,
  onGenerateDrumTrack
}: DrumComposerDialogProps) {
  const [drumPrompt, setDrumPrompt] = useState<string>("");
  const [syncWithProgression, setSyncWithProgression] = useState<boolean>(true);
  const [selectedMapId, setSelectedMapId] = useState<string>("gm");
  const [customDrumMap, setCustomDrumMap] = useState<string>("");

  const handleSubmit = () => {
    if (!drumPrompt.trim()) return;
    const mapping = DRUM_MAPPINGS[selectedMapId] || DRUM_MAPPINGS["gm"];
    onGenerateDrumTrack("Batería Principal", drumPrompt, mapping, syncWithProgression, selectedMapId === "custom" ? customDrumMap : undefined);
    setDrumPrompt("");
  };

  const applyTemplate = (prompt: string) => {
    setDrumPrompt(prompt);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-3xl border-amber-500/30 bg-card/95 backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(245,158,11,0.15)] p-6 overflow-x-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b border-border/30">
          <DialogTitle className="text-2xl font-black flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
            <Drum className="w-7 h-7 text-amber-500 animate-pulse" />
            Super Asistente de Batería IA
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Elige un estilo de groove o describe cómo quieres que suene la batería. La IA interpretará el rol de un baterista profesional, añadiendo dinámicas humanas, redobles (fills) y notas fantasma (ghost notes) sincronizadas al milisegundo con la estructura de tu canción.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Templates */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Grooves Maestros
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate("Beat estándar de Rock/Pop en 4/4. Bombo sólido en el 1 y 3, caja potente en el 2 y 4, charles (hi-hat) continuo en corcheas. Fills creativos al final de la sección.")}
                className="h-auto py-2.5 px-3 rounded-xl border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-400 flex flex-col items-start gap-1 justify-start transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-[11px]"><Drum className="w-3.5 h-3.5" /> Rock Clásico</div>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate("Groove característico de Reggaeton/Dembow. Bombo profundo marcando el pulso constante y caja anticipada y arrastrada en el ritmo clásico de tresillo. Hi-hats sutiles y bailables.")}
                className="h-auto py-2.5 px-3 rounded-xl border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-400 flex flex-col items-start gap-1 justify-start transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-[11px]"><PlaySquare className="w-3.5 h-3.5" /> Dembow / Reggaeton</div>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate("Patrón de Trap oscuro. Bombo espaciado y pesado (808 style), caja metálica. Charles (Hi-hats) frenéticos disparando tresillos y fusas (rolls) constantemente.")}
                className="h-auto py-2.5 px-3 rounded-xl border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-400 flex flex-col items-start gap-1 justify-start transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-[11px]"><Music2 className="w-3.5 h-3.5" /> Trap / Hi-hat Rolls</div>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate("Estilo Jazz y Swing. Ritmo liderado por el platillo Ride haciendo el patrón clásico de swing. Caja con ghost notes muy sutiles, charles cerrado en los tiempos 2 y 4. Bombo casi imperceptible.")}
                className="h-auto py-2.5 px-3 rounded-xl border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-400 flex flex-col items-start gap-1 justify-start transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-[11px]"><Drum className="w-3.5 h-3.5" /> Jazz Swing</div>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate("Percusión Latina bailable (Salsa/Son). Enfoque en toques agudos y sincopados usando la caja como timbal o cencerro, charles abiertos rítmicos, y un groove muy suelto y movido.")}
                className="h-auto py-2.5 px-3 rounded-xl border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-400 flex flex-col items-start gap-1 justify-start transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-[11px]"><PlaySquare className="w-3.5 h-3.5" /> Percusión Latina</div>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate("Balada suave y emocional. Golpes en el borde de la caja (cross-stick), bombo muy delicado, y platillos de choque (crash) muy suaves con crescendos de platillo antes de los cambios.")}
                className="h-auto py-2.5 px-3 rounded-xl border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-400 flex flex-col items-start gap-1 justify-start transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-[11px]"><Sparkles className="w-3.5 h-3.5" /> Balada Suave</div>
              </Button>
            </div>
          </div>

          {/* Locked Hardware Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-muted/20 p-5 rounded-2xl border border-border/40">
            <div className="space-y-3">
              <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5" /> Mapeo de Instrumentos VST
              </Label>
              <Select value={selectedMapId} onValueChange={setSelectedMapId}>
                <SelectTrigger className="h-9 text-xs font-bold rounded-xl border-amber-500/30 bg-card focus:ring-amber-500/50">
                  <SelectValue placeholder="Selecciona un mapeo" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-amber-500/30">
                  {Object.values(DRUM_MAPPINGS).map((map) => (
                    <SelectItem key={map.id} value={map.id} className="text-xs font-bold">
                      {map.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-xs font-bold text-amber-500">
                    Personalizado (Texto Libre)
                  </SelectItem>
                </SelectContent>
              </Select>
              {selectedMapId === "custom" ? (
                <div className="pt-2">
                  <textarea
                    value={customDrumMap}
                    onChange={(e) => setCustomDrumMap(e.target.value)}
                    placeholder="Ej: Bombo en C1, Caja en D1, Charles en F#1..."
                    rows={3}
                    className="w-full rounded-lg border border-amber-500/30 bg-card p-2 text-[10px] focus:border-amber-500 outline-none resize-none"
                  />
                </div>
              ) : (
                <p className="text-[9px] text-muted-foreground leading-tight">
                  {DRUM_MAPPINGS[selectedMapId]?.description}
                </p>
              )}
            </div>
            
            <div className="space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-black text-muted-foreground">Canal de Audio</Label>
                <div className="text-sm font-bold text-amber-500 flex items-center gap-2">
                  <Drum className="w-4 h-4" /> MIDI Channel 10
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-amber-500/20 shadow-sm">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5 cursor-pointer" htmlFor="sync-toggle">
                    <Link2 className="w-3.5 h-3.5 text-emerald-500" />
                    Sincronización Inteligente
                  </Label>
                  <p className="text-[9px] text-muted-foreground">Alinea los redobles con los acordes.</p>
                </div>
                <Switch 
                  id="sync-toggle" 
                  checked={syncWithProgression} 
                  onCheckedChange={setSyncWithProgression}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Prompt Guidance Area */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-muted-foreground">
                Instrucción Rítmica (Prompt)
              </Label>
              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Lógica Humana
              </span>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <textarea
                value={drumPrompt}
                onChange={(e) => setDrumPrompt(e.target.value)}
                placeholder="Ej. Quiero que empiece muy calmado solo con charles, y al final explote con redobles pesados de toms y platos..."
                rows={4}
                className="relative w-full rounded-xl border border-amber-500/30 bg-card p-4 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none hover:bg-card/90 transition-colors shadow-inner"
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-normal italic pt-1">
              *El motor de IA mapeará internamente tus ideas a componentes reales: Kick (Bombo), Snare (Caja), Hi-Hat (Charles), Toms, etc.*
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
            disabled={!drumPrompt.trim()}
            className="rounded-xl h-10 px-6 font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/25 transition-all active:scale-95"
          >
            Componer Percusión
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
