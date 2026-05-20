"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Music,
  CheckSquare,
  Square,
  Info,
  Sliders,
  Grid,
  BookOpen,
  FlaskConical
} from "lucide-react";
import { SongStructure } from "../schemas/song-generator.schema";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Midi } from "@tonejs/midi";
import { FileUp } from "lucide-react";

interface ProgressionRhythmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSong: SongStructure | null;
  playbackMode: "basic" | "rhythm" | "arpeggio";
  setPlaybackMode: (mode: "basic" | "rhythm" | "arpeggio") => void;
  selectedRhythmPattern: string;
  setSelectedRhythmPattern: (pattern: string) => void;
  selectedArpeggioPattern: string;
  setSelectedArpeggioPattern: (pattern: string) => void;
  onGenerateAiRhythm: (prompt: string, sectionIds: string[], options: AiRhythmOptions) => Promise<void>;
  isGeneratingAiRhythm: boolean;
  defaultSectionId?: string | null;
}

export interface AiRhythmOptions {
  useOrnamentalNotes: boolean;
  ornamentalTypes: OrnamentalType[];
  midiReferencePattern?: string;
}

export type OrnamentalType =
  | "passing-tones"
  | "neighbor-tones"
  | "chromatic-approach"
  | "9th-11th-13th"
  | "modal-color"
  | "anticipations"
  | "suspensions"
  | "voice-leading";

const ORNAMENTAL_OPTIONS: { id: OrnamentalType; label: string; desc: string; color: string }[] = [
  {
    id: "passing-tones",
    label: "🎶 Notas de Paso",
    desc: "Notas escalísticas que conectan suavemente dos notas del acorde.",
    color: "blue"
  },
  {
    id: "neighbor-tones",
    label: "🌀 Notas de Adorno",
    desc: "Notas un semitono o tono arriba/abajo que regresan a la nota principal.",
    color: "violet"
  },
  {
    id: "chromatic-approach",
    label: "🎸 Notas Cromáticas",
    desc: "Aproximaciones cromáticas de un semitono al tiempo fuerte del siguiente acorde.",
    color: "rose"
  },
  {
    id: "9th-11th-13th",
    label: "✨ Extensiones (9ª/11ª/13ª)",
    desc: "Tensiones armónicas que enriquecen el color del acorde: 9nas, 11nas y 13nas naturales y alteradas.",
    color: "amber"
  },
  {
    id: "modal-color",
    label: "🌈 Color Modal",
    desc: "Notas características de modos (dórico, mixolidio, lidio…) para enriquecer la paleta armónica.",
    color: "emerald"
  },
  {
    id: "anticipations",
    label: "⚡ Anticipaciones",
    desc: "Nota del siguiente acorde soada un tiempo antes del cambio, creando tensión rítmica.",
    color: "orange"
  },
  {
    id: "suspensions",
    label: "⏸️ Suspensiones",
    desc: "Retener la nota del acorde anterior (sus4, sus2) y resolver a la tercera del acorde nuevo.",
    color: "sky"
  },
  {
    id: "voice-leading",
    label: "🎻 Conducción de Voces",
    desc: "Mover cada voz del acorde por semitono o tono hacia el siguiente de forma independiente.",
    color: "purple"
  }
];

const RHYTHM_PATTERNS = [
  { id: "pop-ballad", label: "🎹 Balada Pop", desc: "Acompañamiento clásico con arpegios y acordes en bloque balanceados." },
  { id: "classical-alberti", label: "🎼 Alberti Clásico", desc: "Arpegiado clásico de notas bajas, altas, medias y altas." },
  { id: "neo-soul-arpeggio", label: "🌌 Neo-Soul / Mixto", desc: "Acordes extendidos con síncopas suaves y adornos ligeros." },
  { id: "bossa-nova", label: "🥁 Bossa Nova", desc: "Groove brasileño síncopado clásico con sutiles variaciones rítmicas." },
  { id: "lofi-chill", label: "☕ Lo-Fi Chill", desc: "Acompañamiento relajado con acordes retrasados y suaves." },
  { id: "salsa-tumbao", label: "💃 Salsa Tumbao", desc: "Piano montuno síncopado de salsa, lleno de energía latina." },
  { id: "bachata-bolero", label: "🌴 Bachata Majao", desc: "Acompañamiento tradicional dominicano con bajo marcado." },
  { id: "reggaeton-dembow", label: "🔥 Reggaeton Dembow", desc: "Patrón síncopado clásico de 3-3-2 sobre los acordes." },
  { id: "bolero-romantico", label: "🌹 Bolero Romántico", desc: "Línea de bajo cariñosa con síncopas de piano clásicas." },
  { id: "jazz-swing", label: "🕶️ Jazz Swing", desc: "Acompañamiento estilo Charleston clásico para jazz y blues." },
  { id: "boogie-woogie", label: "⚡ Boogie-Woogie", desc: "Bajo caminante clásico y enérgico con acordes staccato." },
  { id: "funk-clav", label: "🎸 Funk Clav", desc: "Patrón de clavicordio funk síncopado en semicorcheas." },
  { id: "ambient-drone", label: "🌌 Ambient Drone", desc: "Atmósferas de acordes suspendidos de larga duración." },
  { id: "cumbia-colombiana", label: "🌴 Cumbia Colombiana", desc: "Bajo cumbiero con acordes a contratiempo en el offbeat." },
  { id: "edm-house", label: "🔥 EDM House", desc: "Acordes en negras ('4-on-the-floor') con bajo a contratiempo." },
  { id: "rb-trap-soul", label: "🎧 R&B / Trap Soul", desc: "Acompañamiento moderno y relajado con detalles veloces." },
  { id: "flamenco-rumba", label: "💃 Rumba Flamenca", desc: "El ventilador clásico con rasgueos y graves marcados." }
];

const ARPEGGIO_PATTERNS = [
  { id: "up-down", label: "Triángulo", desc: "Las notas ascienden y luego descienden de manera simétrica." },
  { id: "up", label: "Ascendente", desc: "Las notas van de la más grave a la más aguda en bucle." },
  { id: "down", label: "Descendente", desc: "Las notas van de la más aguda a la más grave en bucle." },
  { id: "down-up", label: "Valle", desc: "Las notas descienden y luego ascienden, opuesto al triángulo." },
  { id: "cross", label: "Espiral", desc: "Las notas se alternan cruzando los extremos hacia el centro." },
  { id: "double-strike", label: "Doble Nota", desc: "Las notas del acorde se repiten en pares consecutivamente." },
  { id: "random", label: "Aleatorio", desc: "Las notas del acorde se arpegian en orden impredecible." },
  { id: "cascade", label: "Cascada", desc: "Un arpegio fluido de barrido descendente-ascendente rápido." }
];

const QUICK_PROMPTS = [
  { label: "🎹 Pop Ballad Arpeggio", text: "Arpegios de piano clásicos y fluidos en semicorcheas" },
  { label: "🥁 Latin Salsa Tumbao", text: "Tumbao de piano de salsa sincopado rítmicamente" },
  { label: "🌊 Bossa Nova Comping", text: "Acordes de Bossa Nova rítmicos y suaves en síncopas" },
  { label: "✨ Classical Alberti", text: "Patrón Alberti clásico de arpegios ascendentes y descendentes" },
  { label: "⚡ Block Chords", text: "Acordes en bloque redondos y estables marcando los 4 tiempos" },
  { label: "🎸 Funk Syncopation", text: "Síncopas rápidas de teclado funk con notas fantasma" },
];

const ORNAMENTAL_COLOR_MAP: Record<string, string> = {
  blue: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  violet: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  rose: "border-rose-500/40 bg-rose-500/10 text-rose-400",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  orange: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  sky: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  purple: "border-purple-500/40 bg-purple-500/10 text-purple-400",
};

export function ProgressionRhythmDialog({
  open,
  onOpenChange,
  activeSong,
  playbackMode,
  setPlaybackMode,
  selectedRhythmPattern,
  setSelectedRhythmPattern,
  selectedArpeggioPattern,
  setSelectedArpeggioPattern,
  onGenerateAiRhythm,
  isGeneratingAiRhythm,
  defaultSectionId
}: ProgressionRhythmDialogProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual");
  const [prompt, setPrompt] = useState<string>("");
  const [targetType, setTargetType] = useState<"all" | "selected">("all");
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({});

  // Music theory options
  const [useOrnamentalNotes, setUseOrnamentalNotes] = useState(false);
  const [ornamentalTypes, setOrnamentalTypes] = useState<OrnamentalType[]>([
    "passing-tones",
    "neighbor-tones",
    "chromatic-approach",
    "9th-11th-13th"
  ]);

  // MIDI Reference options
  const [parsedMidi, setParsedMidi] = useState<Midi | null>(null);
  const [midiFileName, setMidiFileName] = useState<string | null>(null);
  const [selectedMidiTracks, setSelectedMidiTracks] = useState<Record<number, boolean>>({});

  // Reset selections or set pre-selected section on open
  useEffect(() => {
    if (open && activeSong) {
      const initial: Record<string, boolean> = {};
      
      if (defaultSectionId) {
        setTargetType("selected");
        activeSong.sections.forEach(s => {
          initial[s.id] = s.id === defaultSectionId;
        });
        setActiveTab("ai");
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

  const handleToggleOrnamentalType = (type: OrnamentalType) => {
    setOrnamentalTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleToggleAllOrnamental = () => {
    if (ornamentalTypes.length === ORNAMENTAL_OPTIONS.length) {
      setOrnamentalTypes([]);
    } else {
      setOrnamentalTypes(ORNAMENTAL_OPTIONS.map(o => o.id));
    }
  };

  const handleSubmitAi = async () => {
    const targetSectionIds = targetType === "all"
      ? activeSong.sections.map(s => s.id)
      : Object.entries(selectedSections)
          .filter(([_, isChecked]) => isChecked)
          .map(([id]) => id);

    if (targetSectionIds.length === 0) {
      return;
    }

    let midiReferencePattern: string | undefined = undefined;
    if (parsedMidi) {
      const selectedIndices = Object.keys(selectedMidiTracks).map(Number).filter(i => selectedMidiTracks[i]);
      if (selectedIndices.length > 0) {
        const events: { time: number; duration: number }[] = [];
        selectedIndices.forEach(idx => {
          const track = parsedMidi.tracks[idx];
          if (track) {
            track.notes.forEach(note => {
              // Convert seconds to beats (assuming 120bpm = 2 beats per second as default for extraction)
              // Actually Tonejs midi provides note.ticks or note.time. 
              // We can rely on relative durations from the MIDI's own tempo or just assume raw seconds mapped to beats.
              // To be safe and simple, let's just use the note.time and duration and let the AI map it.
              events.push({ time: note.time, duration: note.duration });
            });
          }
        });
        
        events.sort((a, b) => a.time - b.time);
        
        // Normalize times to start at 0
        const firstTime = events.length > 0 ? events[0].time : 0;
        
        const patternLines = events.slice(0, 100).map(e => `Nota: inicio en t=${(e.time - firstTime).toFixed(2)}s, duración=${e.duration.toFixed(2)}s`);
        midiReferencePattern = patternLines.join("\\n");
        if (events.length > 100) midiReferencePattern += "\\n... (truncado)";
      }
    }

    const options: AiRhythmOptions = {
      useOrnamentalNotes,
      ornamentalTypes: useOrnamentalNotes ? ornamentalTypes : [],
      midiReferencePattern
    };

    await onGenerateAiRhythm(prompt || "Acordes con ritmo armónico estándar", targetSectionIds, options);
    onOpenChange(false);
  };

  const handleMidiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMidiFileName(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const midi = new Midi(arrayBuffer);
      setParsedMidi(midi);
      
      // Auto-select tracks that have notes
      const initialSelected: Record<number, boolean> = {};
      midi.tracks.forEach((t, i) => {
        if (t.notes.length > 0) {
          initialSelected[i] = true; // Auto select all tracks with notes initially
        }
      });
      setSelectedMidiTracks(initialSelected);
    } catch (err) {
      console.error("Error parsing MIDI", err);
      setParsedMidi(null);
    }
  };

  const toggleMidiTrack = (index: number) => {
    setSelectedMidiTracks(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const activeSectionCount = targetType === "all"
    ? activeSong.sections.length
    : Object.values(selectedSections).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[88vh] rounded-3xl border-purple-500/20 bg-card/95 backdrop-blur-md shadow-2xl p-6 overflow-y-auto flex flex-col scrollbar-thin">
        <DialogHeader className="pb-3 border-b border-border/30">
          <DialogTitle className="text-xl font-black flex items-center gap-2 text-purple-400">
            <Music className="w-5.5 h-5.5 text-purple-500" />
            Asistente de Ritmo y Acompañamiento
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Ajusta y personaliza la interpretación rítmica de la pista de progresiones mediante patrones manuales o el motor de IA.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selector */}
        <div className="flex bg-muted/40 p-1 rounded-2xl border border-border/40 mt-4">
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={cn(
              "flex-1 text-[11px] font-black py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
              activeTab === "manual"
                ? "bg-card text-foreground shadow-sm border border-border/20"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sliders className="w-3.5 h-3.5" />
            Patrones Manuales (Estilos)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={cn(
              "flex-1 text-[11px] font-black py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
              activeTab === "ai"
                ? "bg-purple-500/10 text-purple-400 shadow-sm border border-purple-500/25"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
            Asistente Generativo IA
          </button>
        </div>

        {/* Dialog Content based on Tab */}
        <div className="flex-grow py-4 overflow-y-auto max-h-[55vh] scrollbar-thin pr-1">
          {activeTab === "manual" ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Playback Mode selection */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">Modo de Acompañamiento</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "basic", label: "🎵 Básico", desc: "Acordes completos en bloque" },
                    { id: "rhythm", label: "🥁 Ritmos Presets", desc: "Acompañamiento rítmico estilizado" },
                    { id: "arpeggio", label: "✨ Arpegios", desc: "Patrones de notas arpegiadas" }
                  ].map((modeOption) => (
                    <button
                      key={modeOption.id}
                      type="button"
                      onClick={() => setPlaybackMode(modeOption.id as any)}
                      className={cn(
                        "p-3 rounded-2xl border text-left cursor-pointer transition-all hover:bg-muted/30 select-none",
                        playbackMode === modeOption.id
                          ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-450 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                          : "bg-muted/10 border-border/30 text-muted-foreground"
                      )}
                    >
                      <div className="text-xs font-black">{modeOption.label}</div>
                      <div className="text-[9px] mt-1 opacity-80 leading-normal">{modeOption.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* RHYTHM SELECTION GRID */}
              {playbackMode === "rhythm" && (
                <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-muted-foreground">Seleccionar Patrón Rítmico</Label>
                    <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-full">
                      17 Ritmos Disponibles
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 border border-border/30 rounded-2xl p-2.5 bg-muted/10 scrollbar-thin">
                    {RHYTHM_PATTERNS.map((p) => {
                      const isSelected = selectedRhythmPattern === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedRhythmPattern(p.id)}
                          className={cn(
                            "p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-150 select-none flex flex-col justify-between h-[64px]",
                            isSelected
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                              : "bg-background/80 border-border/40 hover:bg-muted/30 text-foreground"
                          )}
                        >
                          <div className="text-[10px] font-black flex items-center justify-between w-full">
                            <span>{p.label}</span>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-ping" />}
                          </div>
                          <div className="text-[8px] text-muted-foreground line-clamp-2 leading-tight mt-1">
                            {p.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ARPEGGIO SELECTION GRID */}
              {playbackMode === "arpeggio" && (
                <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-muted-foreground">Seleccionar Patrón de Arpegio</Label>
                    <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-full">
                      8 Arpegios Disponibles
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 border border-border/30 rounded-2xl p-2.5 bg-muted/10 scrollbar-thin">
                    {ARPEGGIO_PATTERNS.map((p) => {
                      const isSelected = selectedArpeggioPattern === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedArpeggioPattern(p.id)}
                          className={cn(
                            "p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-150 select-none flex flex-col justify-between h-[64px]",
                            isSelected
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                              : "bg-background/80 border-border/40 hover:bg-muted/30 text-foreground"
                          )}
                        >
                          <div className="text-[10px] font-black flex items-center justify-between w-full">
                            <span>✨ {p.label}</span>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-ping" />}
                          </div>
                          <div className="text-[8px] text-muted-foreground line-clamp-2 leading-tight mt-1">
                            {p.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* BASIC BLOCK CHORDS DESCRIPTION */}
              {playbackMode === "basic" && (
                <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex gap-3 text-xs text-muted-foreground animate-in slide-in-from-top-2 duration-200">
                  <Grid className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-foreground">Modo Básico (Acordes en Bloque)</div>
                    <p className="leading-relaxed text-[11px]">
                      Las notas de los acordes de la progresión armónica se interpretan de forma plana y sostenida, abarcando la duración completa de cada compás (redondas de 4 tiempos). Ideal para pads, sintetizadores atmosféricos o como referencia armónica inicial.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Prompt input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                  <span>Instrucción / Estilo Rítmico con IA</span>
                  <span className="text-[10px] text-purple-400 font-semibold">Progresión Armónica IA</span>
                </Label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej. Arpegios ascendentes de piano clásicos en semicorcheas, ritmo sincopado de bossa nova, acordes en bloque..."
                  rows={3}
                  disabled={isGeneratingAiRhythm}
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
                      disabled={isGeneratingAiRhythm}
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

              {/* ─── MIDI REFERENCE PANEL ─── */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <FileUp className="w-3.5 h-3.5" /> Referencia MIDI (Groove Stealing)
                </Label>
                <div className="bg-muted/10 border border-border/40 rounded-2xl p-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="text-[10px] h-7 rounded-lg relative overflow-hidden"
                      disabled={isGeneratingAiRhythm}
                    >
                      <input 
                        type="file" 
                        accept=".mid,.midi" 
                        onChange={handleMidiUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      Seleccionar Archivo MIDI
                    </Button>
                    {midiFileName && (
                      <span className="text-[10px] text-foreground font-mono truncate max-w-[200px]">
                        {midiFileName}
                      </span>
                    )}
                  </div>

                  {parsedMidi && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        Pistas encontradas (Selecciona para extraer ritmo)
                      </div>
                      <div className="grid gap-1.5 max-h-[120px] overflow-y-auto pr-1 scrollbar-thin">
                        {parsedMidi.tracks.map((track, i) => {
                          if (track.notes.length === 0) return null;
                          const isSelected = selectedMidiTracks[i];
                          return (
                            <div 
                              key={i}
                              onClick={() => !isGeneratingAiRhythm && toggleMidiTrack(i)}
                              className={cn(
                                "flex items-center justify-between p-2 rounded-xl border border-border/40 hover:bg-muted/40 cursor-pointer transition-colors select-none",
                                isSelected && "bg-purple-500/10 border-purple-500/30"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Checkbox
                                  checked={!!isSelected}
                                  onCheckedChange={() => {}}
                                  disabled={isGeneratingAiRhythm}
                                  className="pointer-events-none rounded-sm w-3 h-3"
                                />
                                <span className="text-[10px] font-black text-foreground truncate">
                                  {track.name || `Pista ${i + 1}`}
                                </span>
                              </div>
                              <span className="text-[9px] text-muted-foreground font-mono bg-background/50 px-1.5 py-0.5 rounded">
                                {track.notes.length} notas
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── ORNAMENTAL NOTES / MUSIC THEORY PANEL ─── */}
              <div className="border border-border/40 rounded-2xl overflow-hidden">
                {/* Header toggle */}
                <button
                  type="button"
                  disabled={isGeneratingAiRhythm}
                  onClick={() => setUseOrnamentalNotes(v => !v)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-4 py-3 text-left transition-all cursor-pointer select-none",
                    useOrnamentalNotes
                      ? "bg-indigo-500/10 border-b border-indigo-500/20"
                      : "bg-muted/20 hover:bg-muted/40"
                  )}
                >
                  <div className={cn(
                    "w-8 h-4 rounded-full flex-shrink-0 transition-all relative",
                    useOrnamentalNotes ? "bg-indigo-500" : "bg-muted-foreground/30"
                  )}>
                    <span className={cn(
                      "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all",
                      useOrnamentalNotes ? "left-4" : "left-0.5"
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className={cn("text-xs font-black flex items-center gap-1.5",
                      useOrnamentalNotes ? "text-indigo-400" : "text-foreground"
                    )}>
                      <BookOpen className="w-3.5 h-3.5" />
                      Usar Teoría Musical Avanzada y Notas de Adorno
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      Permite notas fuera del acorde: de paso, cromatismo, extensiones (9ª/11ª/13ª), modos y más.
                    </div>
                  </div>
                  {useOrnamentalNotes && (
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                      ACTIVADO
                    </span>
                  )}
                </button>

                {/* Collapsible panel */}
                {useOrnamentalNotes && (
                  <div className="p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <FlaskConical className="w-3 h-3" /> Técnicas habilitadas
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleAllOrnamental}
                        className="text-[9px] font-bold text-indigo-400 hover:text-indigo-500 cursor-pointer bg-transparent border-0 flex items-center gap-1"
                      >
                        {ornamentalTypes.length === ORNAMENTAL_OPTIONS.length ? (
                          <><CheckSquare className="w-2.5 h-2.5" /> Desmarcar todas</>
                        ) : (
                          <><CheckSquare className="w-2.5 h-2.5" /> Seleccionar todas</>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {ORNAMENTAL_OPTIONS.map((opt) => {
                        const isActive = ornamentalTypes.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={isGeneratingAiRhythm}
                            onClick={() => handleToggleOrnamentalType(opt.id)}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left cursor-pointer transition-all duration-150 select-none",
                              isActive
                                ? ORNAMENTAL_COLOR_MAP[opt.color]
                                : "bg-muted/10 border-border/30 text-muted-foreground hover:bg-muted/30"
                            )}
                          >
                            <div className={cn(
                              "w-3.5 h-3.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all",
                              isActive ? "border-current bg-current" : "border-muted-foreground/50"
                            )}>
                              {isActive && (
                                <svg viewBox="0 0 8 8" className="w-2 h-2 text-white fill-white">
                                  <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-black">{opt.label}</div>
                              <div className="text-[8px] opacity-80 leading-tight truncate">{opt.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-2.5 text-[9px] text-indigo-400 flex gap-2">
                      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        Con estas técnicas activas, la IA aplicará plena teoría musical: dirección melódica, resolución de tensiones, conducción de voces y cromatismo expresivo. El resultado será rítmicamente más rico y melódicamente más sofisticado.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Target Sections Selection */}
              <div className="space-y-2 pt-2 border-t border-border/30">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-muted-foreground">Destino de la Generación</Label>
                  <div className="flex bg-muted/50 p-0.5 rounded-xl border border-border/30">
                    <button
                      type="button"
                      disabled={isGeneratingAiRhythm}
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
                      disabled={isGeneratingAiRhythm}
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
                        disabled={isGeneratingAiRhythm}
                        onClick={handleSelectAllSections}
                        className="text-[9px] font-bold text-purple-400 hover:text-purple-500 flex items-center gap-1 cursor-pointer bg-transparent border-0"
                      >
                        <CheckSquare className="w-2.5 h-2.5" /> Seleccionar Todas
                      </button>
                      <span className="text-[9px] text-muted-foreground">|</span>
                      <button
                        type="button"
                        disabled={isGeneratingAiRhythm}
                        onClick={handleClearAllSections}
                        className="text-[9px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer bg-transparent border-0"
                      >
                        <Square className="w-2.5 h-2.5" /> Desmarcar Todas
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 max-h-[130px] overflow-y-auto pr-1 border border-border/30 rounded-2xl p-2.5 bg-muted/10 scrollbar-thin">
                      {activeSong.sections.map((sect) => (
                        <div
                          key={sect.id}
                          onClick={() => !isGeneratingAiRhythm && handleToggleSection(sect.id)}
                          className={cn(
                            "flex items-center gap-2.5 p-2 rounded-xl border border-border/40 hover:bg-muted/40 cursor-pointer transition-colors select-none",
                            selectedSections[sect.id] && "bg-purple-500/5 border-purple-500/20"
                          )}
                        >
                          <Checkbox
                            checked={!!selectedSections[sect.id]}
                            onCheckedChange={() => {}}
                            disabled={isGeneratingAiRhythm}
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
          )}
        </div>

        {/* Footer buttons based on Tab */}
        <div className="flex gap-2 justify-end pt-3 border-t border-border/30 mt-2">
          {activeTab === "manual" ? (
            <Button
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-black px-6 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white cursor-pointer shadow-lg hover:shadow-emerald-500/15"
            >
              Aplicar y Cerrar
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={isGeneratingAiRhythm}
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs font-semibold px-4 cursor-pointer hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitAi}
                disabled={isGeneratingAiRhythm || activeSectionCount === 0}
                className={cn(
                  "rounded-xl text-xs font-black px-5 text-white cursor-pointer shadow-lg flex items-center gap-1.5 disabled:opacity-50",
                  useOrnamentalNotes
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/20"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-500/20"
                )}
              >
                {useOrnamentalNotes
                  ? <BookOpen className="w-3.5 h-3.5" />
                  : <Sparkles className="w-3.5 h-3.5" />
                }
                {isGeneratingAiRhythm
                  ? "Generando Ritmos..."
                  : useOrnamentalNotes
                    ? `Generar con Teoría Avanzada (${activeSectionCount} Secc.)`
                    : `Generar con IA (${activeSectionCount} Secc.)`
                }
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
