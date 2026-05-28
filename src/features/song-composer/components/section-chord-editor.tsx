import React, { useTransition } from "react";
import { BookOpen, AlertCircle, Play, Music, Sliders, Activity, Sparkles, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { parseChordToNotes } from '@/lib/music/chord-parser';
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PianoKeyboard } from '@/features/piano-roll/components/piano-keyboard';
import { ManualChordBuilderDialog, analyzeProgressionAction } from '@/features/chord-generator';
import { SongSection, SongTrack } from '../schemas/song-generator.schema';

interface SectionChordEditorProps {
  selectedSection: SongSection;
  generatingSectionIds: Record<string, boolean>;
  getRoleColor: (role: string) => string;
  tracks?: SongTrack[];
  onRegenerateTrackSectionClick?: (trackId: string, sectionId: string) => void;
  onRegenerateSectionClick?: (section: SongSection) => void;
  onResetSectionSyncClick?: (trackId: string, sectionId: string) => void;
  onUpdateChords?: (sectionId: string, chords: any[]) => void;
  onUpdateTheoryExplanation?: (sectionId: string, explanation: string) => void;
  isAiLoading?: boolean;
}

// Convert pitch name to MIDI number
const noteToMidi = (noteName: string): number => {
  const match = noteName.match(/^([A-G][#b]?)([0-9])$/i);
  if (!match) return 60; // C4 default
  const pitch = match[1].toUpperCase();
  const octave = parseInt(match[2], 10);
  const semitones: Record<string, number> = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
    "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11
  };
  return (octave + 1) * 12 + semitones[pitch];
};

// Get track specific gradient colors
const getTrackColorClasses = (trackName: string, channel: number) => {
  if (channel === 10) return "from-rose-500 to-red-600 dark:from-rose-600/95 dark:to-red-700/95 border-rose-400 dark:border-rose-500/60 text-white dark:text-rose-100 shadow-[0_0_8px_rgba(244,63,94,0.3)]";
  const hash = Array.from(trackName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    "from-indigo-500 to-blue-600 dark:from-indigo-600/95 dark:to-blue-700/95 border-indigo-400 dark:border-indigo-500/60 text-white dark:text-indigo-100 shadow-[0_0_8px_rgba(99,102,241,0.3)]",
    "from-amber-500 to-orange-600 dark:from-amber-600/95 dark:to-orange-700/95 border-amber-400 dark:border-amber-500/60 text-white dark:text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.3)]",
    "from-fuchsia-500 to-purple-600 dark:from-fuchsia-600/95 dark:to-purple-700/95 border-fuchsia-400 dark:border-fuchsia-500/60 text-white dark:text-fuchsia-100 shadow-[0_0_8px_rgba(217,70,239,0.3)]",
    "from-emerald-500 to-teal-600 dark:from-emerald-600/95 dark:to-teal-700/95 border-emerald-400 dark:border-emerald-500/60 text-white dark:text-emerald-100 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
    "from-cyan-500 to-blue-600 dark:from-cyan-600/95 dark:to-blue-700/95 border-cyan-400 dark:border-cyan-500/60 text-white dark:text-cyan-100 shadow-[0_0_8px_rgba(6,182,212,0.3)]",
    "from-pink-500 to-rose-600 dark:from-pink-600/95 dark:to-rose-700/95 border-pink-400 dark:border-pink-500/60 text-white dark:text-pink-100 shadow-[0_0_8px_rgba(236,72,153,0.3)]",
  ];
  return colors[hash % colors.length];
};

export function SectionChordEditor({
  selectedSection,
  generatingSectionIds,
  getRoleColor,
  tracks = [],
  onRegenerateTrackSectionClick,
  onRegenerateSectionClick,
  onResetSectionSyncClick,
  onUpdateChords,
  onUpdateTheoryExplanation,
  isAiLoading = false,
}: SectionChordEditorProps) {
  const isGenerating = generatingSectionIds[selectedSection.id];
  const [isBuilderOpen, setIsBuilderOpen] = React.useState(false);
  const [builderTargetIndex, setBuilderTargetIndex] = React.useState<number | null>(null);
  const [builderInitialData, setBuilderInitialData] = React.useState<{ chord: string, duration: number } | undefined>(undefined);
  const [analyzeError, setAnalyzeError] = React.useState<string | null>(null);
  const [isPendingAnalysis, startAnalysisTransition] = useTransition();

  const handleAnalyzeProgression = () => {
    const chords = selectedSection.chords?.chords || [];
    if (chords.length === 0) return;
    setAnalyzeError(null);
    startAnalysisTransition(async () => {
      const result = await analyzeProgressionAction({
        chords: chords.map((c: any) => ({
          chord: c.chord,
          role: c.role,
          romanNumeral: c.romanNumeral,
          duration: c.duration,
        })),
        sectionKey: selectedSection.key || "C",
        sectionType: selectedSection.type,
      });
      if (result.success && result.theoryExplanation) {
        onUpdateTheoryExplanation?.(selectedSection.id, result.theoryExplanation);
      } else {
        setAnalyzeError(result.error || "Error al analizar.");
      }
    });
  };

  const handleSaveBuilder = (data: { chord: string, duration: number }) => {
    if (!onUpdateChords) return;
    const currentChords = selectedSection.chords?.chords || [];
    const newChords = [...currentChords];
    
    if (builderTargetIndex !== null && builderTargetIndex >= 0 && builderTargetIndex < newChords.length) {
      newChords[builderTargetIndex] = {
        ...newChords[builderTargetIndex],
        chord: data.chord,
        duration: data.duration,
        pianoNotes: parseChordToNotes(data.chord)
      };
    } else {
      newChords.push({
        chord: data.chord,
        duration: data.duration,
        role: "Manual",
        romanNumeral: "?",
        suggestedScale: "Mayor",
        pianoNotes: parseChordToNotes(data.chord),
        description: "Acorde construido manualmente",
        voicing: "Basic",
        inversion: "Root"
      });
    }
    onUpdateChords(selectedSection.id, newChords);
  };

  const handleDeleteChord = (idx: number) => {
    if (!onUpdateChords || !selectedSection.chords) return;
    const newChords = selectedSection.chords.chords.filter((_, i) => i !== idx);
    onUpdateChords(selectedSection.id, newChords);
  };

  const openBuilderForAdd = () => {
    setBuilderTargetIndex(null);
    setBuilderInitialData(undefined);
    setIsBuilderOpen(true);
  };

  const openBuilderForEdit = (idx: number, chord: string, duration: number) => {
    setBuilderTargetIndex(idx);
    setBuilderInitialData({ chord, duration });
    setIsBuilderOpen(true);
  };

  const previousChords = React.useMemo(
    () => (selectedSection.chords?.chords || []).map((c: any) => c.chord as string),
    [selectedSection.chords]
  );

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
      ) : !selectedSection.chords || selectedSection.chords.chords.length === 0 ? (
        <div className="text-center py-14 rounded-2xl border border-dashed border-border bg-card/10 p-6 space-y-4">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-xs text-muted-foreground">
            No hay acordes disponibles para esta sección. Puedes generarlos con IA o añadirlos manualmente.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onRegenerateSectionClick && onRegenerateSectionClick(selectedSection)}
              className="rounded-xl border-primary/20 text-primary hover:bg-primary/10 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generar con IA
            </Button>
            {onUpdateChords && (
              <Button
                type="button"
                onClick={openBuilderForAdd}
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Añadir Manualmente
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Tabs defaultValue="chords" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-muted/40 p-1 rounded-2xl border border-border/40 mb-6 h-10 max-w-[400px]">
            <TabsTrigger value="chords" className="rounded-xl font-bold text-xs transition-all duration-200">
              🎹 Armonía y Acordes
            </TabsTrigger>
            <TabsTrigger value="tracks" className="rounded-xl font-bold text-xs transition-all duration-200">
              🥁 Patrones y Groove
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chords" className="space-y-8 focus-visible:outline-none focus-visible:ring-0">
            {/* Detailed theory analysis box — always visible when there are chords */}
            {selectedSection.chords?.chords?.length > 0 && (
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5 space-y-3 relative overflow-hidden shadow-inner">
                <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-20 h-20 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Análisis Armónico y Conducción de Voces ({selectedSection.type})
                  </h5>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAnalyzeProgression}
                    disabled={isPendingAnalysis || (selectedSection.chords?.chords?.length ?? 0) === 0}
                    className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 transition-all"
                  >
                    {isPendingAnalysis ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {isPendingAnalysis ? "Analizando..." : "Analizar con IA"}
                  </Button>
                </div>
                {analyzeError && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{analyzeError}</p>
                )}
                {selectedSection.chords.theoryExplanation ? (
                  <p className="text-sm text-foreground/80 leading-relaxed italic">
                    &ldquo;{selectedSection.chords.theoryExplanation}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/60 italic">
                    Haz clic en &ldquo;Analizar con IA&rdquo; para que la inteligencia artificial analice toda tu progresión y genere un análisis armónico profesional.
                  </p>
                )}
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
                        {onUpdateChords && (
                          <div className="absolute top-2 right-2 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 z-10 bg-background/80 backdrop-blur-sm p-1 rounded-lg border border-border/50">
                            <button onClick={() => openBuilderForEdit(idx, chordObj.chord, chordObj.duration || 4)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-muted transition-colors">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDeleteChord(idx)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-muted transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

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
                              <div className="text-[10px] text-muted-foreground">
                                Rol: <span className="text-foreground font-semibold">{chordObj.role}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {chordObj.voicing && (
                          <div className="text-[10px] text-muted-foreground/80 leading-snug italic truncate" title={chordObj.voicing}>
                            Voicing: {chordObj.voicing}
                          </div>
                        )}
                        <div className="pt-3 border-t border-border/40 w-full">
                          <PianoKeyboard activeNotes={chordObj.pianoNotes || []} />
                        </div>
                      </div>
                    );
                  })}
                  {onUpdateChords && selectedSection.chords?.chords?.length > 0 && (
                    <button
                      type="button"
                      onClick={openBuilderForAdd}
                      className="group relative rounded-2xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all duration-300 flex flex-col items-center justify-center shadow-sm min-h-[310px] text-muted-foreground hover:text-foreground hover:border-primary/40"
                    >
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                        <Plus className="w-6 h-6 group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-sm font-bold tracking-widest">Añadir Acorde</span>
                    </button>
                  )}
                </div>
              </TooltipProvider>
            </div>
          </TabsContent>

          <TabsContent value="tracks" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-primary animate-pulse" />
                    Arreglos y Pistas AI en la Sección {selectedSection.type}
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Visualización y edición de las notas MIDI individuales compuestas por la IA para esta sección.
                  </p>
                </div>
              </div>

              {tracks && tracks.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {tracks.map((track) => {
                    const notesList = track.sectionNotes?.[selectedSection.id] || [];
                    const hasNotes = notesList.length > 0;
                    const isDrums = track.name.toLowerCase().includes("bateria") || 
                                    track.name.toLowerCase().includes("drum") || 
                                    track.name.toLowerCase().includes("percu") || 
                                    track.midiChannel === 10;
                    const isBass = track.name.toLowerCase().includes("bajo") || 
                                   track.name.toLowerCase().includes("bass");
                    
                    const colorClass = getTrackColorClasses(track.name, track.midiChannel);
                    const noteMidiNumbers = notesList.map(n => noteToMidi(n.note));
                    const minMidi = noteMidiNumbers.length > 0 ? Math.min(...noteMidiNumbers) - 2 : 36;
                    const maxMidi = noteMidiNumbers.length > 0 ? Math.max(...noteMidiNumbers) + 2 : 84;
                    const midiRangeSpan = Math.max(12, maxMidi - minMidi);
                    const totalBeats = selectedSection.chords?.chords?.length 
                      ? selectedSection.chords.chords.reduce((acc, c) => acc + (c.duration || 4), 0)
                      : (selectedSection.chordCount ?? 4) * 4 || 16;

                    return (
                      <div 
                        key={track.id} 
                        className="rounded-2xl border border-border/60 bg-card/25 dark:bg-[#0c0c0e]/30 p-5 space-y-4 hover:border-primary/20 hover:bg-card/45 transition-all duration-300 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              track.isProgressionRhythm
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : "bg-primary/10 text-primary border border-primary/20"
                            }`}>
                              {isDrums ? (
                                <Sliders className="w-4 h-4" />
                              ) : isBass ? (
                                <Activity className="w-4 h-4" />
                              ) : (
                                <Music className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-sm font-black text-foreground truncate flex items-center gap-1.5">
                                {track.name}
                                {track.isProgressionRhythm && (
                                  <span className="text-[8px] bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20 font-bold uppercase tracking-wider">
                                    Progreso Rítmico
                                  </span>
                                )}
                              </h5>
                              <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-mono font-bold mt-0.5">
                                <span>MIDI CH: {track.midiChannel}</span>
                                <span>•</span>
                                <span>PRESET: {track.instrumentPreset || "grand-piano"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {track.isProgressionRhythm ? (
                              <div className="flex items-center gap-1.5">
                                {track.aiSections?.[selectedSection.id] ? (
                                  <>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-xl">
                                      ✨ Personalizado con IA
                                    </span>
                                    {onResetSectionSyncClick && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onResetSectionSyncClick(track.id, selectedSection.id)}
                                        className="rounded-xl text-[10px] h-8 px-2 font-bold text-muted-foreground hover:text-primary transition-all"
                                        title="Volver a sincronizar automáticamente con el patrón de ritmo global"
                                      >
                                        Re-sincronizar
                                      </Button>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-[10px] text-purple-400 font-bold bg-purple-500/5 border border-purple-500/10 px-2.5 py-1 rounded-xl">
                                    ⚡ Sincronizado automáticamente
                                  </span>
                                )}
                                {onRegenerateTrackSectionClick && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isAiLoading}
                                    onClick={() => onRegenerateTrackSectionClick(track.id, selectedSection.id)}
                                    className="rounded-xl text-xs h-8 font-bold border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                                    {track.aiSections?.[selectedSection.id] ? "Regenerar IA" : "Componer con IA"}
                                  </Button>
                                )}
                              </div>
                            ) : (
                              onRegenerateTrackSectionClick && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isAiLoading}
                                  onClick={() => onRegenerateTrackSectionClick(track.id, selectedSection.id)}
                                  className="rounded-xl text-xs h-8 font-bold border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                                  {hasNotes ? "Regenerar Sección" : "Componer Sección"}
                                </Button>
                              )
                            )}
                          </div>
                        </div>

                        {hasNotes ? (
                          <div className="space-y-3">
                            <div className="relative h-14 bg-zinc-100/50 dark:bg-zinc-950/45 border border-border/40 rounded-2xl overflow-hidden shadow-inner flex animate-fade-in">
                              {Array.from({ length: Math.ceil(totalBeats / 4) }).map((_, mIdx) => (
                                <div 
                                  key={mIdx} 
                                  className="absolute top-0 bottom-0 border-r border-zinc-200/50 dark:border-zinc-900/30 font-mono text-[7px] text-muted-foreground/35 pl-1.5 pt-0.5 z-0 pointer-events-none"
                                  style={{ left: `${(mIdx * 4 / totalBeats) * 100}%` }}
                                >
                                  Compás {mIdx + 1}
                                </div>
                              ))}

                              {notesList.map((n, nIdx) => {
                                const midi = noteToMidi(n.note);
                                const noteLeft = (n.startBeat / totalBeats) * 100;
                                const noteWidth = (n.durationBeats / totalBeats) * 100;
                                const noteTop = ((maxMidi - midi) / midiRangeSpan) * 100;

                                return (
                                  <div
                                    key={nIdx}
                                    style={{
                                      left: `${noteLeft}%`,
                                      width: `${Math.max(1.5, noteWidth)}%`,
                                      top: `${Math.max(10, Math.min(80, noteTop))}%`,
                                    }}
                                    className={`absolute h-2.5 rounded-full bg-gradient-to-r ${colorClass} opacity-85 hover:opacity-100 hover:scale-y-110 transition-all shadow-[0_0_6px_rgba(255,255,255,0.05)] border border-white/10`}
                                    title={`${n.note} (Beat: ${n.startBeat.toFixed(2)}, Dur: ${n.durationBeats.toFixed(2)}t)`}
                                  />
                                );
                              })}
                            </div>

                            <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
                              {notesList.map((n, nIdx) => (
                                <div 
                                  key={nIdx} 
                                  className="flex-shrink-0 bg-muted/40 border border-border/50 rounded-xl px-2.5 py-1.5 flex flex-col items-center justify-center text-center min-w-[72px] shadow-sm hover:bg-muted/60 transition-colors"
                                >
                                  <span className="text-[10px] font-black text-foreground">{n.note}</span>
                                  <div className="text-[7.5px] text-muted-foreground font-mono font-semibold mt-0.5 leading-none">
                                    B: {n.startBeat.toFixed(2)}
                                  </div>
                                  <div className="text-[7px] text-primary/70 font-mono mt-0.5 leading-none">
                                    D: {n.durationBeats.toFixed(2)}t
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 rounded-2xl border border-dashed border-border/60 bg-muted/10 flex flex-col items-center justify-center space-y-1.5">
                            <AlertCircle className="w-5 h-5 text-muted-foreground/60 animate-pulse" />
                            <div className="text-[11px] font-bold text-muted-foreground">
                              Sin notas compuestas para esta sección
                            </div>
                            <p className="text-[9px] text-muted-foreground/75 max-w-xs leading-normal">
                              Haz clic en "Componer Sección" para armonizar melodías u arreglos específicos para la sección {selectedSection.type}.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 rounded-2xl border border-dashed border-border bg-card/10 p-6 space-y-2">
                  <AlertCircle className="w-6 h-6 text-muted-foreground/50 mx-auto" />
                  <p className="text-xs text-muted-foreground font-semibold">
                    No hay pistas secundarias (melodía o percusión) creadas aún en este proyecto.
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    Usa el botón <strong className="text-primary font-bold inline-flex items-center gap-0.5"><Plus className="w-3 h-3" /> Agregar Pista</strong> en la barra superior o mezclador para componer acompañamientos melódicos.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <ManualChordBuilderDialog
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSave={handleSaveBuilder}
        initialData={builderInitialData}
        sectionKey={selectedSection.key}
        sectionType={selectedSection.type}
        previousChords={previousChords}
      />
    </div>
  );
}
