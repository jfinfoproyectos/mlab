"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  songInputSchema, 
  SongInput, 
  SongBlueprint, 
  SongStructure,
  SongSection,
  SongTrack
} from "../schemas/song-generator.schema";
import { 
  generateSongBlueprintAction, 
  saveSongAction, 
  loadUserSongsAction, 
  deleteSongAction,
  generateSectionTrackAction,
  refineSongWithAiAction
} from "../actions/song-generator.actions";
import { generatePolyphonicRhythmAction } from "../actions/rhythm-generator.actions";
import { generateChordProgressionAction } from "../actions/chord-generator.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { 
  Music, 
  Sparkles, 
  Copy, 
  Check, 
  AlertCircle, 
  Compass,
  ArrowRight,
  Eye,
  Activity, 
  RefreshCw, 
  BookOpen, 
  ChevronRight, 
  ChevronDown,
  Save, 
  FolderOpen, 
  Trash2, 
  ListMusic, 
  Play,
  RotateCcw,
  Pause,
  Square,
  Repeat,
  Sliders,
  Volume2,
  VolumeX,
  Keyboard,
  Plus,
  Settings,
  Cpu,
  MessageSquare,
  Send,
  Bot,
  User
} from "lucide-react";


import { SongLibrary } from "./song-library";
import { ProgressionRhythmDialog, type AiRhythmOptions } from "./progression-rhythm-dialog";
import { SongComposerForm } from "./song-composer-form";
import { SidebarSongLibrary } from "./sidebar-song-library";
import { PlaybackControls } from "./playback-controls";
import { ArrangementTimeline } from "./arrangement-timeline";
import { SectionChordEditor } from "./section-chord-editor";
import { PianoRoll } from "./piano-roll";
import { AiConfigForm } from "./ai-config-form";
import { AiProgressProvider, useAiProgress } from "../hooks/use-ai-progress";
import { AiProgressIndicator } from "./ai-progress-indicator";

import { useSongPlayback } from "../hooks/use-song-playback";
import { TrackComposerDialog } from "./TrackComposerDialog";
import { SectionRegenDialog } from "./SectionRegenDialog";
import { syncChordRhythmTrackNotes } from "../utils/chord-rhythm";

// Helpers for visual color coding
function getRoleColor(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("tonica") || r.includes("tónica")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  if (r.includes("dominante")) return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  if (r.includes("subdominante")) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-sky-500/10 text-sky-500 border-sky-500/20";
}

const PRESETS = [
  { label: "Balada Pop Romántica", prompt: "Balada pop romántica emotiva, tempo moderado, final esperanzador" },
  { label: "Jazz Neo-Soul Sofisticado", prompt: "Neo-soul ultra relajado con armonías de novena, tempo lento y nocturno" },
  { label: "Pop Enérgico Brillante", prompt: "Pop de sintetizador brillante y enérgico, tempos rápidos y acordes mayores" },
  { label: "Lo-Fi Melancólico Nocturno", prompt: "Lo-fi nostálgico con acordes menores, vibración nocturna y otoñal" }
];

interface PlayableChord {
  chordName: string;
  notes: string[];
  sectionId: string;
  sectionType: string;
  chordIndexInSection: number;
  globalIndex: number;
}

function migrate1DTo2D(steps: any): boolean[][] {
  if (Array.isArray(steps) && steps.length === 16 && typeof steps[0] === "string") {
    // Legacy 1D string array, convert to 2D boolean grid
    const grid = Array(5).fill(null).map(() => Array(16).fill(false));
    steps.forEach((type, stepIdx) => {
      if (type === "bass") {
        grid[0][stepIdx] = true;
      } else if (type === "chord") {
        grid[1][stepIdx] = true;
        grid[2][stepIdx] = true;
        grid[3][stepIdx] = true;
        grid[4][stepIdx] = true;
      } else if (type === "both") {
        grid[0][stepIdx] = true;
        grid[1][stepIdx] = true;
        grid[2][stepIdx] = true;
        grid[3][stepIdx] = true;
        grid[4][stepIdx] = true;
      } else if (type === "single") {
        grid[1][stepIdx] = true;
      }
    });
    return grid;
  }
  if (Array.isArray(steps) && Array.isArray(steps[0])) {
    return steps;
  }
  // Default empty grid
  return Array(5).fill(null).map(() => Array(16).fill(false));
}

interface SongGeneratorProps {
  initialConfigs?: any[];
}

export function SongGeneratorInner({ initialConfigs = [] }: SongGeneratorProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [loading, setLoading] = useState(false);
  const [songGenProgress, setSongGenProgress] = useState<number>(0);
  const [songGenStatus, setSongGenStatus] = useState<string>("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [activeSong, setActiveSong] = useState<SongStructure | null>(null);
  const activeSongRef = useRef<SongStructure | null>(null);
  
  // Interactive Confirmation State for AI failures
  const [confirmPrompt, setConfirmPrompt] = useState<{
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  const promptConfirm = async (message: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmPrompt({
        message,
        onConfirm: () => { setConfirmPrompt(null); resolve(true); },
        onCancel: () => { setConfirmPrompt(null); resolve(false); }
      });
    });
  };

  useEffect(() => {
    activeSongRef.current = activeSong;
  }, [activeSong]);

  // AI Chat States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; text: string; timestamp: Date }>>([
    {
      role: "assistant",
      text: "¡Hola! Soy tu asistente de co-composición. Puedes pedirme cambios como 'Sube el tempo 10 BPM', 'Cambia el título a Luna Gris', o 'Haz el coro menor triste'.",
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [aiProcess, setAiProcess] = useState<{ id: string; label: string } | null>(null);
  const aiAbortControllerRef = useRef<AbortController | null>(null);

  const startAiProcess = (id: string, label: string) => {
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    aiAbortControllerRef.current = controller;
    setAiProcess({ id, label });
    return controller.signal;
  };

  const cancelAiProcess = useCallback(() => {
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
      aiAbortControllerRef.current = null;
    }

    setAiProcess(prev => {
      if (prev) {
        toast.error(`Proceso IA "${prev.label}" cancelado por el usuario.`);
      } else {
        toast.error(`Proceso IA cancelado.`);
      }
      return null;
    });

    setLoading(false);
    setIsGeneratingRhythm(false);
    setIsChatSending(false);
    setGeneratingSectionIds({});
    
    // Clear isGenerating flag on any tracks
    setActiveSong(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tracks: prev.tracks?.map(t => ({
          ...t,
          isGenerating: false
        }))
      };
    });
  }, []);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  const handleSendChatMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const userMessageText = customPrompt || chatInput.trim();
    if (!userMessageText || !activeSong || isChatSending || aiProcess) return;

    if (!customPrompt) {
      setChatInput("");
    }
    
    setChatMessages((prev) => [
      ...prev,
      { role: "user", text: userMessageText, timestamp: new Date() },
    ]);
    setIsChatSending(true);

    const signal = startAiProcess("chat-refinement", "Refinando arreglo con asistente IA");
    startTask("Refinando arreglo con asistente IA...");
    if (!signal) {
      setIsChatSending(false);
      return;
    }

    try {
      const history = chatMessages.map((m) => ({ role: m.role, text: m.text }));
      const result = await refineSongWithAiAction(activeSong, userMessageText, history);
      
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");

      if (result.success && result.data) {
        const mergedSong = result.data;
        setActiveSong(mergedSong);
        saveSongBackground(mergedSong);

        // POST-PROCESSING: If AI flagged tracks with isGenerating: true, trigger the sub-agent
        const tracksToRegen = mergedSong.tracks?.filter(t => t.isGenerating) || [];
        if (tracksToRegen.length > 0) {
          for (const trackToRegen of tracksToRegen) {
            if (signal.aborted) throw new DOMException("Aborted", "AbortError");
            const sectionsWithChords = mergedSong.sections.filter(s => s.chords && s.chords.chords && s.chords.chords.length > 0);
            if (sectionsWithChords.length === 0) continue;
            
            const trackId = trackToRegen.id;
            const toastId = `regen-${trackId}`;
            toast.loading(`Sinfonía AI re-generando pista "${trackToRegen.name}"...`, { id: toastId });
            
            let completedCount = 0;
            const newSectionNotes: Record<string, any> = {};
            const generatedAiSections: Record<string, boolean> = {};
            
            for (let i = 0; i < sectionsWithChords.length; i++) {
              if (signal.aborted) {
                toast.dismiss(toastId);
                throw new DOMException("Aborted", "AbortError");
              }
              const sect = sectionsWithChords[i];
              // Use the prompt specific to this section if available, otherwise the first one, or fallback
              const promptToUse = trackToRegen.prompts?.[sect.id] || Object.values(trackToRegen.prompts || {})[0] || "Generar notas adaptadas a la armonía";
              
              const chordsList = sect.chords!.chords.map(c => ({
                chord: c.chord,
                pianoNotes: c.pianoNotes || [],
                role: c.role
              }));

              const prevSect = i > 0 ? sectionsWithChords[i - 1] : null;
              const nextSect = i < sectionsWithChords.length - 1 ? sectionsWithChords[i + 1] : null;

              const previousChordsList = prevSect?.chords?.chords.map(c => ({
                chord: c.chord,
                pianoNotes: c.pianoNotes || [],
                role: c.role
              })) || undefined;

              const nextChordsList = nextSect?.chords?.chords.map(c => ({
                chord: c.chord,
                pianoNotes: c.pianoNotes || [],
                role: c.role
              })) || undefined;

              try {
                const res = await generateSectionTrackAction({
                  songTitle: mergedSong.title,
                  sectionType: sect.type,
                  sectionKey: sect.key,
                  sectionScale: sect.scale,
                  chordsList,
                  trackName: trackToRegen.name,
                  midiChannel: trackToRegen.midiChannel,
                  userPrompt: promptToUse,
                  previousSectionType: prevSect?.type,
                  previousChordsList,
                  nextSectionType: nextSect?.type,
                  nextChordsList,
                });

                if (signal.aborted) {
                  toast.dismiss(toastId);
                  throw new DOMException("Aborted", "AbortError");
                }

                if (res.success && res.data?.notes && res.data.notes.length > 0) {
                  newSectionNotes[sect.id] = res.data.notes;
                  generatedAiSections[sect.id] = true;
                } else {
                   // Fallback to preserving the old notes if it fails
                   newSectionNotes[sect.id] = trackToRegen.sectionNotes?.[sect.id] || [];
                }
              } catch (e: any) {
                if (e.name === "AbortError") throw e;
                newSectionNotes[sect.id] = trackToRegen.sectionNotes?.[sect.id] || [];
              }
              completedCount++;
              
              // Update progress visually
              setActiveSong(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  tracks: prev.tracks?.map(t => 
                    t.id === trackId ? { ...t, progress: Math.round((completedCount / sectionsWithChords.length) * 100) } : t
                  )
                };
              });
            }
            
            // Finalize
            if (signal.aborted) {
              toast.dismiss(toastId);
              throw new DOMException("Aborted", "AbortError");
            }
            setActiveSong(prev => {
              if (!prev) return prev;
              const updatedTracks = (prev.tracks || []).map(t => {
                if (t.id === trackId) {
                  return {
                    ...t,
                    sectionNotes: { ...t.sectionNotes, ...newSectionNotes },
                    aiSections: { ...t.aiSections, ...generatedAiSections },
                    isGenerating: false,
                    progress: 100
                  };
                }
                return t;
              });
              const updated = { ...prev, tracks: updatedTracks };
              setTimeout(() => saveSongBackground(updated), 0);
              return updated;
            });
            toast.dismiss(toastId);
            toast.success(`¡Pista "${trackToRegen.name}" actualizada con la nueva instrucción!`);
          }
        }

        setChatMessages((prev) => [
          ...prev,
          { 
            role: "assistant", 
            text: result.explanation || "He aplicado los refinamientos solicitados a tu canción.", 
            timestamp: new Date() 
          },
        ]);
        toast.success("¡Canción generada completamente!");
      } else {
        toast.error(result.error || "No se pudo refinar la canción.");
        setChatMessages((prev) => [
          ...prev,
          { 
            role: "assistant", 
            text: `Lo siento, ocurrió un error: ${result.error || "Error desconocido"}.`, 
            timestamp: new Date() 
          },
        ]);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Chat AI refinement aborted.");
        return;
      }
      toast.error("Error al comunicarse con el asistente de co-composición.");
      setChatMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          text: "Lo siento, ocurrió un error al procesar tu solicitud con el asistente.", 
          timestamp: new Date() 
        },
      ]);
    } finally {
      setIsChatSending(false);
      setAiProcess(prev => prev?.id === "chat-refinement" ? null : prev);
      endTask();
    }
  };

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Helper to automatically background-save song changes to DB
  const saveSongBackground = useCallback((updatedSong: SongStructure) => {
    if (!updatedSong.id) return Promise.resolve();
    
    return new Promise<void>((resolve) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveSongAction(updatedSong);
          resolve();
        } catch (e) {
          console.warn("Background auto-save failed:", e);
          resolve();
        }
      }, 1500); // Debounce for 1.5 seconds to prevent spamming DB on every slider tick
    });
  }, []);


  const handleUpdateNote = (
    trackId: string,
    sectionId: string,
    noteIndex: number,
    updatedNote: { pitch: string; durationBeats: number; startBeat: number; velocity?: number }
  ) => {
    if (!activeSong) return;

    const newSong = { ...activeSong, tracks: activeSong.tracks?.map(t => ({ ...t })) || [] };
    const track = newSong.tracks?.find((t) => t.id === trackId);
    if (!track || !track.sectionNotes || !track.sectionNotes[sectionId]) return;

    const notes = [...track.sectionNotes[sectionId]];
    if (noteIndex >= 0 && noteIndex < notes.length) {
      notes[noteIndex] = {
        ...notes[noteIndex],
        note: updatedNote.pitch,
        durationBeats: updatedNote.durationBeats,
        startBeat: updatedNote.startBeat,
        velocity: updatedNote.velocity !== undefined ? updatedNote.velocity : notes[noteIndex].velocity
      };
      
      track.sectionNotes = {
        ...track.sectionNotes,
        [sectionId]: notes
      };

      if (track.isProgressionRhythm) {
        track.aiSections = {
          ...(track.aiSections || {}),
          [sectionId]: true
        };
      }

      setActiveSong(newSong);
      saveSongBackground(newSong);
    }
  };

  // --- useSongPlayback Hook Integration ---
  const {
    isPlaying,
    playbackSectionId,
    setPlaybackSectionId,
    playbackChordIndex,
    setPlaybackChordIndex,
    playbackBpm,
    setPlaybackBpm,
    playbackVolume,
    setPlaybackVolume,
    playbackPreset,
    setPlaybackPreset,
    playbackMode,
    setPlaybackMode,
    selectedRhythmPattern,
    setSelectedRhythmPattern,
    selectedArpeggioPattern,
    setSelectedArpeggioPattern,
    loopMode,
    setLoopMode,
    customRhythmSteps,
    setCustomRhythmSteps,
    savedRhythms,
    setSavedRhythms,
    newRhythmName,
    setNewRhythmName,
    humanizeAmount,
    setHumanizeAmount,
    activePlaybackNotes,
    midiOutputs,
    selectedOutputId,
    setSelectedOutputId,
    midiChannel,
    setMidiChannel,
    isMidiSupported,
    midiActivity,
    applyLoadedSong,
    stopPlayback,
    togglePlayback,
    startPlayback,
    playSingleNote
  } = useSongPlayback(activeSong, setActiveSong, saveSongBackground);

  // Sincronizar automáticamente la sección activa seleccionada con la sección en reproducción
  useEffect(() => {
    if (playbackSectionId) {
      setActiveSectionId(playbackSectionId);
    }
  }, [playbackSectionId]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>("estudio");

  const [visiblePianoRollTracks, setVisiblePianoRollTracks] = useState<Set<string>>(new Set());

  // Database States
  const [savedSongs, setSavedSongs] = useState<SongStructure[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);

  // Section Progress States
  const [generatingSectionIds, setGeneratingSectionIds] = useState<Record<string, boolean>>({});

  // Sinfonía AI Track Dialog states
  const [isTrackComposerOpen, setIsTrackComposerOpen] = useState(false);

  // Sinfonía AI Modular Section Regeneration states
  const [isSectionRegenOpen, setIsSectionRegenOpen] = useState(false);
  const [regenTrackId, setRegenTrackId] = useState<string>("");
  const [regenSectionId, setRegenSectionId] = useState<string>("");

  // AI Rhythm Assistant States
  const [isRhythmAssistantOpen, setIsRhythmAssistantOpen] = useState(false);
  const [rhythmAssistantSectionId, setRhythmAssistantSectionId] = useState<string | null>(null);
  const [isGeneratingRhythm, setIsGeneratingRhythm] = useState(false);
  const { startTask, updateTaskName, endTask, setModelInfo, setOnCancel } = useAiProgress();

  useEffect(() => {
    const activeConfig = initialConfigs?.find((c: any) => c.isActive) || initialConfigs?.[0];
    if (activeConfig) {
      setModelInfo({
        provider: activeConfig.provider,
        modelId: activeConfig.modelId || "Auto"
      });
    }
  }, [initialConfigs, setModelInfo]);

  useEffect(() => {
    setOnCancel(() => (aiProcess ? () => cancelAiProcess() : null));
    if (!aiProcess) {
      endTask();
    }
  }, [aiProcess, cancelAiProcess, setOnCancel, endTask]);

  const handleGenerateAiRhythm = async (
    prompt: string, 
    sectionIds: string[], 
    options: AiRhythmOptions = { useOrnamentalNotes: false, ornamentalTypes: [] },
    providedSong?: SongStructure
  ) => {
    const targetSong = providedSong || activeSong;
    if (!targetSong || aiProcess) return;

    setIsGeneratingRhythm(true);
    const signal = startAiProcess("rhythm-assistant", "Generando ritmo con Asistente IA");

    // ── POLYPHONIC BRANCH ──────────────────────────────────────────────────────
    if (options.polyphonic?.enabled && options.polyphonic.voices.length > 0) {
      const { voices: selectedVoices, rhythmicDensity } = options.polyphonic;
      const toastId = toast.loading(
        `Generando polifonía IA (${selectedVoices.length} voces) para ${sectionIds.length} sección(es)...`
      );
      startTask("Procesando comando de IA para la canción...");
      try {
        // Deep clone song for immutable update
        const newSong = {
          ...targetSong,
          tracks: targetSong.tracks?.map(t => ({
            ...t,
            sectionNotes: { ...(t.sectionNotes || {}) },
            aiSections: { ...(t.aiSections || {}) },
            prompts: { ...(t.prompts || {}) }
          })) || []
        };

        // Ensure the single Progression Rhythm track exists
        let rhythmTrack = newSong.tracks.find(t => t.isProgressionRhythm);
        if (!rhythmTrack) {
          rhythmTrack = {
            id: `track-rhythm-progression-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: "Ritmo de Progresión (Polifónico)",
            midiChannel: 1,
            instrumentPreset: "grand-piano",
            volume: 0.75,
            prompts: {},
            sectionNotes: {},
            isProgressionRhythm: true,
            aiSections: {}
          };
          newSong.tracks.unshift(rhythmTrack);
        }

        // Generate voices section by section sequentially with resume
        for (const sectionId of sectionIds) {
          if (signal.aborted) throw new DOMException("Aborted", "AbortError");
          const section = targetSong.sections.find(s => s.id === sectionId);
          if (!section || !section.chords?.chords) continue;
          updateTaskName(`Componiendo patrón rítmico polifónico para: ${section.type}`);

          let success = false;
          while (!success) {
            if (signal.aborted) throw new DOMException("Aborted", "AbortError");
            
            try {
              const chordsList = section.chords.chords.map(c => ({
                chord: c.chord,
                pianoNotes: c.pianoNotes || [],
                role: c.role || "Tónica"
              }));

              const result = await generatePolyphonicRhythmAction({
                prompt,
                songTitle: targetSong.title || "Mi Canción",
                sectionType: section.type,
                sectionKey: section.key || targetSong.key || "C",
                sectionScale: section.scale || "major",
                chordsList,
                selectedVoices,
                rhythmicDensity,
                tempo: targetSong.tempo || 90,
              });
              
              if (result.success && result.voices) {
                // Merge all notes from all generated voices into the single progression rhythm track
                const allNotes: { note: string; startBeat: number; durationBeats: number; velocity: number }[] = [];
                
                for (const voice of result.voices) {
                  if (voice.notes && voice.notes.length > 0) {
                    allNotes.push(...voice.notes.map(n => ({
                      note: n.note,
                      startBeat: n.startBeat,
                      durationBeats: n.durationBeats,
                      velocity: n.velocity,
                    })));
                  }
                }
                
                // Sort merged notes by startBeat for cleanliness
                allNotes.sort((a, b) => a.startBeat - b.startBeat);
                
                rhythmTrack.sectionNotes = {
                  ...rhythmTrack.sectionNotes,
                  [sectionId]: allNotes
                };
                rhythmTrack.aiSections = { ...rhythmTrack.aiSections, [sectionId]: true };
                rhythmTrack.prompts = { ...rhythmTrack.prompts, [sectionId]: prompt };
                success = true;
              } else {
                throw new Error(result.error || `La IA no generó voces polifónicas para la sección ${section.type}`);
              }
            } catch (err: any) {
              if (err.name === "AbortError") throw err;
              const retry = await promptConfirm(`Fallo al generar ritmo polifónico para la sección "${section.type}". ¿Deseas reintentar y continuar?`);
              if (!retry) {
                throw new Error("Generación rítmica cancelada por el usuario en la sección " + section.type);
              }
            }
          }
        }

        setActiveSong(newSong);
        await saveSongBackground(newSong);
        toast.success(
          `¡Ritmo polifónico generado! Combinado en la pista de progresiones para ${sectionIds.length} sección(es).`
        );
        return newSong;
      } catch (err: any) {
        if (err.name !== "AbortError" && !err.message?.includes("unexpected response") && !signal.aborted) {
          console.error("Error generating polyphonic rhythms:", err);
          toast.error("Error al generar la polifonía con IA.");
        }
      } finally {
        setIsGeneratingRhythm(false);
        setAiProcess(prev => prev?.id === "rhythm-assistant" ? null : prev);
        endTask();
      }
      return targetSong;
    }

    // ── MONOPHONIC BRANCH (original behaviour) ────────────────────────────────
    const toastId = toast.loading(`Generando ritmo IA para ${sectionIds.length} sección(es)...`);
    startTask(`Generando ritmo IA para ${sectionIds.length} sección(es)...`);

    try {
      // Deep clone the song tracks structure to ensure state mutations are properly picked up
      const newSong = {
        ...targetSong,
        tracks: targetSong.tracks?.map(t => ({
          ...t,
          sectionNotes: { ...(t.sectionNotes || {}) },
          aiSections: { ...(t.aiSections || {}) },
          prompts: { ...(t.prompts || {}) }
        })) || []
      };

      // Find or create the progression rhythm track
      let rhythmTrack = newSong.tracks.find(t => t.isProgressionRhythm);
      if (!rhythmTrack) {
        rhythmTrack = {
          id: `track-rhythm-progression-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: "Ritmo de Progresión",
          midiChannel: 1,
          instrumentPreset: "grand-piano",
          volume: 0.75,
          prompts: {},
          sectionNotes: {},
          isProgressionRhythm: true,
          aiSections: {}
        };
        newSong.tracks.unshift(rhythmTrack);
      }

      // Generate rhythm sequentially with resume for all sections
      for (const sectionId of sectionIds) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        const section = targetSong.sections.find(s => s.id === sectionId);
        if (!section || !section.chords || !section.chords.chords) continue;
        updateTaskName(`Componiendo patrón rítmico para: ${section.type}`);

        let success = false;
        while (!success) {
          if (signal.aborted) throw new DOMException("Aborted", "AbortError");

          try {
            const chordsList = section.chords.chords.map(c => ({
              chord: c.chord,
              pianoNotes: c.pianoNotes || [],
              role: c.role || "Tónica"
            }));

            const result = await generateSectionTrackAction({
              songTitle: targetSong.title || "Mi Canción",
              sectionType: section.type,
              sectionKey: section.key || targetSong.key || "C",
              sectionScale: section.scale || "major",
              chordsList,
              trackName: "Ritmo de Progresión",
              midiChannel: 1,
              userPrompt: prompt,
              useOrnamentalNotes: options.useOrnamentalNotes,
              ornamentalTypes: options.ornamentalTypes,
              midiReferencePattern: options.midiReferencePattern
            });

            if (signal.aborted) {
              toast.dismiss(toastId);
              throw new DOMException("Aborted", "AbortError");
            }

            if (result.success && result.data && result.data.notes) {
              rhythmTrack.sectionNotes = {
                ...rhythmTrack.sectionNotes,
                [sectionId]: result.data.notes
              };
              rhythmTrack.aiSections = {
                ...rhythmTrack.aiSections,
                [sectionId]: true
              };
              rhythmTrack.prompts = {
                ...rhythmTrack.prompts,
                [sectionId]: prompt
              };
              success = true;
            } else {
              throw new Error(result.error || `La IA no generó notas para la sección ${section.type}`);
            }
          } catch (err: any) {
            if (err.name === "AbortError") throw err;
            console.error(`Error generating progression rhythm for section ${section.type}:`, err);
            const retry = await promptConfirm(`Fallo al generar ritmo monofónico para la sección "${section.type}". ¿Deseas reintentar y continuar?`);
            if (!retry) {
              throw new Error("Generación rítmica cancelada por el usuario en la sección " + section.type);
            }
          }
        }
      }

      setActiveSong(newSong);
      await saveSongBackground(newSong);
      toast.dismiss(toastId);
      toast.success("¡Ritmo generado con IA y aplicado a la pista de progresiones!");
      return newSong;
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Rhythm AI generation aborted.");
      } else {
        console.error("Error generating progression rhythms:", err);
        toast.dismiss(toastId);
        toast.error("Error al generar los ritmos con IA.");
      }
      return targetSong;
    } finally {
      setIsGeneratingRhythm(false);
      setAiProcess(prev => prev?.id === "rhythm-assistant" ? null : prev);
    }
  };
  
  // Updaters for song-level tracks (with fallback support for legacy section-level tracks)
  const handleUpdateTrackVolume = (sectionId: string | null, trackId: string, vol: number) => {
    if (!activeSong) return;
    
    // Check if it's a song-level track
    const isSongTrack = activeSong.tracks?.some(t => t.id === trackId);
    
    if (isSongTrack) {
      const updated = {
        ...activeSong,
        tracks: (activeSong.tracks || []).map(t => t.id === trackId ? { ...t, volume: vol } : t)
      };
      setActiveSong(updated);
      activeSongRef.current = updated;
      saveSongBackground(updated);
    } else if (sectionId) {
      // Legacy fallback
      const updated = {
        ...activeSong,
        sections: activeSong.sections.map(s => {
          if (s.id === sectionId) {
            return {
              ...s,
              tracks: (s.tracks || []).map(t => t.id === trackId ? { ...t, volume: vol } : t)
            };
          }
          return s;
        })
      };
      setActiveSong(updated);
    }
  };

  const handleUpdateTrackChannel = (sectionId: string | null, trackId: string, channel: number) => {
    if (!activeSong) return;
    
    const isSongTrack = activeSong.tracks?.some(t => t.id === trackId);
    
    if (isSongTrack) {
      const sourceTrack = activeSong.tracks!.find(t => t.id === trackId);
      const oldChannel = sourceTrack?.midiChannel || 1;
      const occupiedTrack = activeSong.tracks?.find(t => t.midiChannel === channel && t.id !== trackId);
      
      const updatedTracks = activeSong.tracks!.map(t => {
        if (t.id === trackId) {
          return { ...t, midiChannel: channel };
        }
        if (occupiedTrack && t.id === occupiedTrack.id) {
          return { ...t, midiChannel: oldChannel };
        }
        return t;
      });

      if (occupiedTrack) {
        toast.info(`Canales intercambiados: "${occupiedTrack.name}" ahora usa el Canal ${oldChannel}.`);
      }
      
      const updated = {
        ...activeSong,
        tracks: updatedTracks
      };
      setActiveSong(updated);
      activeSongRef.current = updated;
      saveSongBackground(updated);
    } else if (sectionId) {
      // Legacy fallback
      const updated = {
        ...activeSong,
        sections: activeSong.sections.map(s => {
          if (s.id === sectionId) {
            return {
              ...s,
              tracks: (s.tracks || []).map(t => t.id === trackId ? { ...t, midiChannel: channel } : t)
            };
          }
          return s;
        })
      };
      setActiveSong(updated);
    }
  };

  const handleDeleteTrack = (sectionId: string | null, trackId: string) => {
    if (!activeSong) return;
    
    const isSongTrack = activeSong.tracks?.some(t => t.id === trackId);
    
    if (isSongTrack) {
      const targetTrack = activeSong.tracks?.find(t => t.id === trackId);
      if (targetTrack?.isProgressionRhythm) {
        toast.error("La pista de Ritmo de Progresión no se puede eliminar porque reproduce la armonía de la canción.");
        return;
      }
      const updated = {
        ...activeSong,
        tracks: (activeSong.tracks || []).filter(t => t.id !== trackId)
      };
      setActiveSong(updated);
      activeSongRef.current = updated;
      toast.success("Pista instrumental global eliminada de la canción.");
      saveSongBackground(updated);
    } else if (sectionId) {
      // Legacy fallback
      const updated = {
        ...activeSong,
        sections: activeSong.sections.map(s => {
          if (s.id === sectionId) {
            return {
              ...s,
              tracks: (s.tracks || []).filter(t => t.id !== trackId)
            };
          }
          return s;
        })
      };
      setActiveSong(updated);
      toast.success("Pista instrumental de sección eliminada.");
    }
  };

  const handleToggleTrackMute = (sectionId: string | null, trackId: string) => {
    if (!activeSong) return;

    const isSongTrack = activeSong.tracks?.some(t => t.id === trackId);
    if (isSongTrack) {
      const updated = {
        ...activeSong,
        tracks: (activeSong.tracks || []).map(t => 
          t.id === trackId ? { ...t, muted: !t.muted } : t
        )
      };
      setActiveSong(updated);
      activeSongRef.current = updated;
      saveSongBackground(updated);
    } else if (sectionId) {
      // Legacy fallback
      const updated = {
        ...activeSong,
        sections: activeSong.sections.map(s => {
          if (s.id === sectionId) {
            return {
              ...s,
              tracks: (s.tracks || []).map(t => 
                t.id === trackId ? { ...t, muted: !t.muted } : t
              )
            };
          }
          return s;
        })
      };
      setActiveSong(updated);
    }
  };

  const handleToggleTrackSolo = (sectionId: string | null, trackId: string) => {
    if (!activeSong) return;

    const isSongTrack = activeSong.tracks?.some(t => t.id === trackId);
    if (isSongTrack) {
      const updated = {
        ...activeSong,
        tracks: (activeSong.tracks || []).map(t => 
          t.id === trackId ? { ...t, soloed: !t.soloed } : t
        )
      };
      setActiveSong(updated);
      activeSongRef.current = updated;
      saveSongBackground(updated);
    } else if (sectionId) {
      // Legacy fallback
      const updated = {
        ...activeSong,
        sections: activeSong.sections.map(s => {
          if (s.id === sectionId) {
            return {
              ...s,
              tracks: (s.tracks || []).map(t => 
                t.id === trackId ? { ...t, soloed: !t.soloed } : t
              )
            };
          }
          return s;
        })
      };
      setActiveSong(updated);
    }
  };

  const handleGenerateTrack = async (params: {
    trackName: string;
    midiChannel: number;
    instrumentPreset: string;
    prompt: string;
    syncWithProgression?: boolean;
  }) => {
    if (!activeSong || aiProcess) return;

    const { trackName, midiChannel, instrumentPreset, prompt, syncWithProgression } = params;
    
    // Check if the song has at least one section with chords
    const sectionsWithChords = activeSong.sections.filter(s => s.chords && s.chords.chords && s.chords.chords.length > 0);
    if (sectionsWithChords.length === 0) {
      toast.error("Ninguna sección tiene acordes generados aún. Por favor genera los acordes de la canción primero.");
      return;
    }

    setIsTrackComposerOpen(false);

    // Initialize pending SongTrack object with isGenerating and progress
    const trackId = `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pendingTrack: SongTrack = {
      id: trackId,
      name: trackName,
      midiChannel: midiChannel,
      instrumentPreset: instrumentPreset,
      volume: 0.7,
      prompts: {},
      sectionNotes: {},
      isGenerating: true,
      progress: 0
    };

    const occupiedTrack = activeSong.tracks?.find(t => t.midiChannel === midiChannel);
    if (occupiedTrack) {
      toast.info(`El Canal ${midiChannel} ya estaba ocupado por la pista "${occupiedTrack.name}". Ha sido sobrescrita.`);
    }

    // Immediately insert the pending track into activeSong state to trigger visual placeholder cards, overwriting any track occupying this channel
    setActiveSong(prev => {
      if (!prev) return prev;
      const cleanTracks = (prev.tracks || []).filter(t => t.midiChannel !== midiChannel);
      return {
        ...prev,
        tracks: [...cleanTracks, pendingTrack]
      };
    });

    const toastId = `track-gen-${trackId}`;
    toast.loading(`Sinfonía AI componiendo pista "${trackName}"...`, { id: toastId });
    const signal = startAiProcess("track-generation", `Componiendo pista "${trackName}"`);
    startTask(`Componiendo pista "${trackName}"...`);

    try {
      let completedCount = 0;
      const totalCount = sectionsWithChords.length;

      // Run sequentially so we can abort between sections
      const results: { sectionId: string; success: boolean; notes?: any }[] = [];
      for (let index = 0; index < sectionsWithChords.length; index++) {
        if (signal.aborted) {
          toast.dismiss(toastId);
          throw new DOMException("Aborted", "AbortError");
        }
        const sect = sectionsWithChords[index];
        updateTaskName(`Componiendo pista individual: ${trackName} (${sect.type})`);
        const chordsList = sect.chords!.chords.map(c => ({
          chord: c.chord,
          pianoNotes: c.pianoNotes || [],
          role: c.role
        }));

        const prevSect = index > 0 ? sectionsWithChords[index - 1] : null;
        const nextSect = index < sectionsWithChords.length - 1 ? sectionsWithChords[index + 1] : null;

        const previousChordsList = prevSect?.chords?.chords.map(c => ({
          chord: c.chord,
          pianoNotes: c.pianoNotes || [],
          role: c.role
        })) || undefined;

        const nextChordsList = nextSect?.chords?.chords.map(c => ({
          chord: c.chord,
          pianoNotes: c.pianoNotes || [],
          role: c.role
        })) || undefined;

        // Extract progression track notes for the current section if syncWithProgression is true
        let progressionRhythmNotes = undefined;
        if (syncWithProgression) {
          const progressionTrack = activeSong.tracks?.find(t => t.isProgressionRhythm);
          if (progressionTrack) {
            progressionRhythmNotes = progressionTrack.sectionNotes?.[sect.id];
          }
        }

        let trackSuccess = false;
        while (!trackSuccess) {
          if (signal.aborted) {
            toast.dismiss(toastId);
            throw new DOMException("Aborted", "AbortError");
          }

          try {
            const payload: any = {
              songTitle: activeSong.title,
              sectionType: sect.type,
              sectionKey: sect.key,
              sectionScale: sect.scale,
              chordsList,
              trackName: trackName,
              midiChannel: midiChannel,
              userPrompt: prompt || `Arreglo instrumental para ${trackName}`
            };
            if (prevSect?.type) payload.previousSectionType = prevSect.type;
            if (previousChordsList) payload.previousChordsList = previousChordsList;
            if (nextSect?.type) payload.nextSectionType = nextSect.type;
            if (nextChordsList) payload.nextChordsList = nextChordsList;
            if (progressionRhythmNotes) payload.progressionRhythmNotes = progressionRhythmNotes;

            const res = await generateSectionTrackAction(payload);

            if (signal.aborted) {
              toast.dismiss(toastId);
              throw new DOMException("Aborted", "AbortError");
            }

            if (res.success && res.data?.notes && res.data.notes.length > 0) {
              results.push({ sectionId: sect.id, success: true, notes: res.data.notes });
              trackSuccess = true;
            } else {
              throw new Error(res.error || "La IA devolvió un arreglo vacío");
            }
          } catch (sectErr: any) {
            if (sectErr.name === "AbortError") throw sectErr;
            console.error(`Error generating notes for section ${sect.type}:`, sectErr);
            const retry = await promptConfirm(`Fallo al generar pistas para la sección "${sect.type}".\n\nDetalle del error:\n${sectErr.message || JSON.stringify(sectErr)}\n\n¿Deseas reintentar y continuar?`);
            if (!retry) {
              throw new Error("Generación cancelada por el usuario en la sección " + sect.type);
            }
          }
        }

        completedCount++;
        const currentProgress = Math.round((completedCount / totalCount) * 100);
        setActiveSong(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            tracks: prev.tracks?.map(t => 
              t.id === trackId ? { ...t, progress: currentProgress } : t
            )
          };
        });
      }

      const newSectionNotes: Record<string, any> = {};
      const newPrompts: Record<string, string> = {};
      let generatedSectionsCount = 0;

      results.forEach(res => {
        if (res.success && res.notes) {
          newSectionNotes[res.sectionId] = res.notes;
          newPrompts[res.sectionId] = prompt;
          generatedSectionsCount++;
        }
      });

      toast.dismiss(toastId);

      if (generatedSectionsCount > 0) {
        let finalTrack: SongTrack | null = null;
        setActiveSong(prev => {
          if (!prev) return prev;
          const updatedTracks = (prev.tracks || []).map(t => {
            if (t.id === trackId) {
              finalTrack = {
                ...t,
                prompts: newPrompts,
                sectionNotes: newSectionNotes,
                isGenerating: false,
                progress: 100
              };
              return finalTrack;
            }
            return t;
          });
          const updated = {
            ...prev,
            tracks: updatedTracks
          };
          setTimeout(() => saveSongBackground(updated), 0);
          return updated;
        });
        toast.success(`¡Pista global "${trackName}" generada exitosamente (${generatedSectionsCount} secciones compuestas)!`);
      } else {
        // No notes generated at all: remove the pending track card
        setActiveSong(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            tracks: prev.tracks?.filter(t => t.id !== trackId)
          };
        });
        toast.error("No se pudo generar notas para ninguna de las secciones de la canción.");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Track generation aborted.");
        // Remove the pending track on abort
        setActiveSong(prev => {
          if (!prev) return prev;
          return { ...prev, tracks: prev.tracks?.filter(t => t.id !== trackId) };
        });
        toast.dismiss(toastId);
      } else {
        console.error("Track generation error:", err);
        toast.dismiss(toastId);
        // Remove track on error
        setActiveSong(prev => {
          if (!prev) return prev;
          return { ...prev, tracks: prev.tracks?.filter(t => t.id !== trackId) };
        });
        toast.error("Fallo inesperado al generar el arreglo melódico.");
      }
    } finally {
      setAiProcess(prev => prev?.id === "track-generation" ? null : prev);
    }
  };

  const handleRegenerateTrackSection = async (
    trackId: string,
    sectionId: string,
    customPrompt: string,
    syncWithProgression?: boolean
  ) => {
    if (!activeSong || aiProcess) return;
    const track = activeSong.tracks?.find(t => t.id === trackId);
    if (!track) {
      toast.error("Pista no encontrada.");
      return;
    }
    const section = activeSong.sections.find(s => s.id === sectionId);
    if (!section) {
      toast.error("Sección no encontrada.");
      return;
    }
    if (!section.chords || !section.chords.chords || section.chords.chords.length === 0) {
      toast.error("Esta sección no tiene acordes aún. Por favor genera los acordes primero.");
      return;
    }

    setGeneratingSectionIds(prev => ({ ...prev, [sectionId]: true }));
    toast.loading(`IA regenerando sección ${section.type} para la pista "${track.name}"...`, { id: "sec-regen-toast" });
    const signal = startAiProcess("section-regen", `Regenerando sección ${section.type}`);
    startTask(`Regenerando sección ${section.type} de ${track.name}...`);

    const sectionIndex = activeSong.sections.findIndex(s => s.id === sectionId);
    const prevSect = sectionIndex > 0 ? activeSong.sections[sectionIndex - 1] : null;
    const nextSect = sectionIndex < activeSong.sections.length - 1 ? activeSong.sections[sectionIndex + 1] : null;

    const previousChordsList = prevSect?.chords?.chords.map(c => ({
      chord: c.chord,
      pianoNotes: c.pianoNotes || [],
      role: c.role
    })) || undefined;

    const nextChordsList = nextSect?.chords?.chords.map(c => ({
      chord: c.chord,
      pianoNotes: c.pianoNotes || [],
      role: c.role
    })) || undefined;

    const previousSectionNotes = prevSect ? track.sectionNotes?.[prevSect.id] : undefined;

    // Extract progression track notes for the current section if syncWithProgression is true
    let progressionRhythmNotes = undefined;
    if (syncWithProgression) {
      const progressionTrack = activeSong.tracks?.find(t => t.isProgressionRhythm);
      if (progressionTrack) {
        progressionRhythmNotes = progressionTrack.sectionNotes?.[sectionId];
      }
    }

    try {
      const chordsList = section.chords.chords.map(c => ({
        chord: c.chord,
        pianoNotes: c.pianoNotes || [],
        role: c.role
      }));

      const res = await generateSectionTrackAction({
        songTitle: activeSong.title,
        sectionType: section.type,
        sectionKey: section.key,
        sectionScale: section.scale,
        chordsList,
        trackName: track.name,
        midiChannel: track.midiChannel,
        userPrompt: customPrompt || "Melodía alternativa expresiva",
        previousSectionType: prevSect?.type,
        previousChordsList,
        previousSectionNotes,
        nextSectionType: nextSect?.type,
        nextChordsList,
        progressionRhythmNotes
      });

      if (signal.aborted) {
        toast.dismiss("sec-regen-toast");
        return;
      }

      toast.dismiss("sec-regen-toast");

      if (res.success && res.data) {
        const updatedTracks = (activeSong.tracks || []).map(t => {
          if (t.id === trackId) {
            return {
              ...t,
              prompts: {
                ...(t.prompts || {}),
                [sectionId]: customPrompt
              },
              sectionNotes: {
                ...t.sectionNotes,
                [sectionId]: res.data!.notes
              },
              aiSections: {
                ...(t.aiSections || {}),
                [sectionId]: true
              }
            };
          }
          return t;
        });

        const updated = {
          ...activeSong,
          tracks: updatedTracks
        };

        setActiveSong(updated);
        activeSongRef.current = updated;
        saveSongBackground(updated);
        toast.success(`¡Sección ${section.type} de la pista "${track.name}" regenerada exitosamente!`);
      } else {
        toast.error(res.error || "Error al regenerar la sección.");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Section track regeneration error:", err);
        toast.dismiss("sec-regen-toast");
        toast.error("Fallo inesperado al regenerar la sección.");
      }
    } finally {
      setGeneratingSectionIds(prev => ({ ...prev, [sectionId]: false }));
      setAiProcess(prev => prev?.id === "section-regen" ? null : prev);
    }
  };

  const handleResetSectionSync = useCallback((trackId: string, sectionId: string) => {
    if (!activeSongRef.current) return;

    const updatedTracks = (activeSongRef.current.tracks || []).map(t => {
      if (t.id === trackId) {
        const nextAiSections = { ...(t.aiSections || {}) };
        delete nextAiSections[sectionId];
        return {
          ...t,
          aiSections: nextAiSections
        };
      }
      return t;
    });

    const baseSong = {
      ...activeSongRef.current,
      tracks: updatedTracks
    };

    const synced = syncChordRhythmTrackNotes(
      baseSong,
      selectedRhythmPattern,
      playbackMode,
      customRhythmSteps,
      selectedArpeggioPattern
    );

    setActiveSong(synced);
    activeSongRef.current = synced;
    saveSongBackground(synced);
    toast.success("Sección re-sincronizada con el patrón de ritmo global.");
  }, [selectedRhythmPattern, playbackMode, customRhythmSteps, selectedArpeggioPattern, setActiveSong, saveSongBackground]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SongInput>({
    resolver: zodResolver(songInputSchema) as any,
    defaultValues: {
      prompt: "",
      key: "Automático",
      scale: "Automático",
      tempo: ""
    }
  });

  // Keep ref in sync with state
  useEffect(() => {
    activeSongRef.current = activeSong;
  }, [activeSong]);

  // Load user songs from DB on mount
  const fetchSavedSongs = useCallback(async () => {
    setIsLoadingSongs(true);
    try {
      const res = await loadUserSongsAction();
      if (res.success && res.songs) {
        // Inject the DB row id into the song data payload so saves become updates
        setSavedSongs(
          res.songs.map(s => ({
            ...s.data,
            id: s.id, // ensure the DB id is always present
          }))
        );
      }
    } catch (err) {
      console.error("Error loading saved songs:", err);
    } finally {
      setIsLoadingSongs(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedSongs();
  }, [fetchSavedSongs]);

  // Generate Chords for a specific section
  const generateSectionChords = async (section: SongSection, tempoVal: number, songTitle: string, musicStyle?: string) => {
    setGeneratingSectionIds(prev => ({ ...prev, [section.id]: true }));
    try {
      const styleInstruction = musicStyle && musicStyle !== "Automático" ? `\n\nESTILO MUSICAL OBJETIVO: ${musicStyle}. Adapta la complejidad armónica (tipo de acordes, extensiones, ritmo armónico) para que encaje perfectamente en este estilo.` : "";
      const result = await generateChordProgressionAction({
        prompt: `${section.prompt}. Sección: ${section.type} de la canción ${songTitle}${styleInstruction}`,
        key: section.key,
        scale: section.scale,
        tempo: String(tempoVal),
        chordCount: section.chordCount
      });

      if (result.success && result.data) {
        setActiveSong(prev => {
          if (!prev) return null;
          const updatedSections = prev.sections.map(s => {
            if (s.id === section.id) {
              return { ...s, chords: result.data };
            }
            return s;
          });
          return { ...prev, sections: updatedSections };
        });
        toast.success(`¡Sección ${section.type} completada!`);
        return result.data;
      } else {
        toast.error(`Error en sección ${section.type}: ${result.error}`);
        return null;
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Fallo en sección ${section.type}`);
      return null;
    } finally {
      setGeneratingSectionIds(prev => ({ ...prev, [section.id]: false }));
    }
  };


  // Submit form: Generate Song Blueprint and compile sections
  const onSubmit = async (data: SongInput) => {
    if (aiProcess) return;
    setLoading(true);
    setSongGenProgress(5);
    setSongGenStatus("Analizando estilo musical y diseñando plano estructurado...");
    setActiveSong(null);
    setActiveSectionId(null);
    setActiveTab("estudio");
    const signal = startAiProcess("song-composition", "Componiendo canción completa");
    startTask("Componiendo canción completa...");
    try {
      const res = await generateSongBlueprintAction(data);
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      if (res.success && res.data) {
        setSongGenProgress(20);
        setSongGenStatus("Estructura de canción generada con éxito. Orquestando secciones...");
        const blueprint: SongBlueprint = res.data;
        
        // Structure the active song with new dynamic properties from the blueprint
        const newSong: SongStructure = {
          title: blueprint.title,
          genre: blueprint.genre,
          key: blueprint.key,
          tempo: blueprint.tempo,
          description: blueprint.description,
          sections: blueprint.sections.map((sect, index) => ({
            id: `sec-${index}-${Date.now()}`,
            type: sect.type,
            prompt: sect.prompt,
            key: sect.key,
            scale: sect.scale,
            chordCount: sect.chordCount,
            reusedFrom: sect.reusedFrom,
            variationOf: sect.variationOf,
            chords: null
          }))
        };

        setActiveSong(newSong);
        setActiveSectionId(newSong.sections[0].id);
        toast.success("¡Estructura de canción creada! Generando progresiones...");

        // Map to keep track of generated progressions per section type (e.g. "Coro 1" -> chords)
        const generatedSectionsMap = new Map<string, any>();

        const totalSections = newSong.sections.length;
        let index = 0;

        // Phase 1: Generate base sections sequentially with resume (no reusedFrom, no variationOf)
        setSongGenStatus("Componiendo armonía de secciones base...");
        startTask("Componiendo armonía de secciones base...");
        const baseSections = newSong.sections.filter(s => !s.reusedFrom && !s.variationOf);
        
        for (const sect of baseSections) {
          if (signal.aborted) throw new DOMException("Aborted", "AbortError");
          setGeneratingSectionIds(prev => ({ ...prev, [sect.id]: true }));
          updateTaskName(`Componiendo acordes para la sección: ${sect.type}`);
          
          let success = false;
          while (!success) {
            if (signal.aborted) throw new DOMException("Aborted", "AbortError");
            try {
              const chords = await generateSectionChords(sect, newSong.tempo, newSong.title, data.musicStyle);
              if (chords) {
                generatedSectionsMap.set(sect.type, chords);
                success = true;
              } else {
                throw new Error("No se devolvieron acordes");
              }
            } catch (err: any) {
              if (err.name === "AbortError") throw err;
              const retry = await promptConfirm(`La IA falló al generar acordes para la sección "${sect.type}".\n\nDetalle del error:\n${err.message || JSON.stringify(err)}\n\n¿Deseas reintentar y continuar desde aquí?`);
              if (!retry) {
                throw new Error("Generación cancelada por el usuario en la sección " + sect.type);
              }
            }
          }
          setGeneratingSectionIds(prev => ({ ...prev, [sect.id]: false }));
        }

        setSongGenProgress(60);
        
        // Phase 2: Generate variations sequentially with resume
        setSongGenStatus("Generando variaciones armónicas de las secciones base...");
        startTask("Generando variaciones armónicas...");
        const variationSections = newSong.sections.filter(s => s.variationOf);

        for (const sect of variationSections) {
          if (signal.aborted) throw new DOMException("Aborted", "AbortError");
          const baseChords = generatedSectionsMap.get(sect.variationOf!);
          if (baseChords) {
            setGeneratingSectionIds(prev => ({ ...prev, [sect.id]: true }));
            updateTaskName(`Generando variación armónica para la sección: ${sect.type}`);
            let success = false;
            while (!success) {
              if (signal.aborted) throw new DOMException("Aborted", "AbortError");
              try {
                const baseChordsStr = baseChords.chords.map((c: any) => `${c.chord} (${c.role})`).join(", ");
                const styleInstruction = data.musicStyle && data.musicStyle !== "Automático" ? `\n\nESTILO MUSICAL OBJETIVO: ${data.musicStyle}. Adapta la complejidad armónica (tipo de acordes, extensiones) para que encaje en este estilo.` : "";
                const result = await generateChordProgressionAction({
                  prompt: `Variación armónica de la progresión previa [${baseChordsStr}]. Variación deseada: ${sect.prompt}. Sección: ${sect.type} de la canción ${newSong.title}${styleInstruction}`,
                  key: sect.key,
                  scale: sect.scale,
                  tempo: String(newSong.tempo),
                  chordCount: sect.chordCount
                });

                if (result.success && result.data) {
                  generatedSectionsMap.set(sect.type, result.data);
                  toast.success(`¡Sección ${sect.type} (variación de ${sect.variationOf}) generada!`);
                  success = true;
                } else {
                  throw new Error(result.error || "Error al generar variación");
                }
              } catch (err: any) {
                if (err.name === "AbortError") throw err;
                const retry = await promptConfirm(`La IA falló al generar la variación para la sección "${sect.type}".\n\nDetalle del error:\n${err.message || JSON.stringify(err)}\n\n¿Deseas reintentar y continuar desde aquí?`);
                if (!retry) {
                  throw new Error("Generación cancelada por el usuario en la sección " + sect.type);
                }
              }
            }
            setGeneratingSectionIds(prev => ({ ...prev, [sect.id]: false }));
          }
        }

        setSongGenProgress(85);

        // Phase 3: Check for clones (reusedFrom)
        for (const sect of newSong.sections) {
          if (sect.reusedFrom) {
            const sourceChords = generatedSectionsMap.get(sect.reusedFrom);
            if (sourceChords) {
              generatedSectionsMap.set(sect.type, sourceChords);
              toast.success(`¡Sección ${sect.type} clonada exactamente de ${sect.reusedFrom}!`);
            }
          }
        }

        // Construct final song structure with all generated chords
        const finalSections = newSong.sections.map(sect => ({
          ...sect,
          chords: generatedSectionsMap.get(sect.type) || null
        }));

        const completedSong: SongStructure = {
          ...newSong,
          sections: finalSections
        };

        // Initialize the progression track explicitly with block chords (basic mode)
        const initializedSong = syncChordRhythmTrackNotes(
          completedSong,
          "pop-ballad",
          "basic",
          Array(5).fill(null).map(() => Array(16).fill(false)),
          "up-down"
        );

        setActiveSong(initializedSong);
        activeSongRef.current = initializedSong;
        setActiveSectionId(initializedSong.sections[0].id);

        setSongGenProgress(100);
        setSongGenStatus("¡Composición finalizada!");
        
        let finalSong = initializedSong;

        // Auto-generate rhythm if requested
        if (data.autoGenerateRhythm) {
          setSongGenStatus("Auto-generando pistas de acompañamiento...");
          const sectionIds = finalSong.sections.map(s => s.id);
          const aiOptions = {
            useOrnamentalNotes: !!(data.musicStyle?.includes("Jazz") || data.musicStyle?.includes("Clásica")),
            ornamentalTypes: ["passing-tones" as any, "neighbor-tones" as any, "9th-11th-13th" as any],
            polyphonic: data.rhythmPolyphonic ? {
              enabled: true,
              voices: (data.polyphonicVoices as any) || ["bass", "melody"],
              rhythmicDensity: data.rhythmDensity as any || "medium"
            } : undefined
          };
          
          const resultSong = await handleGenerateAiRhythm(
            data.prompt || "Auto-generación de ritmo base", 
            sectionIds, 
            aiOptions,
            finalSong
          );
          if (resultSong) {
            finalSong = resultSong;
          }
        }

        toast.success("¡Canción completa generada!");
        setIsComposerOpen(false);
      } else {
        toast.error(res.error || "Fallo al crear estructura de canción.");
      }
    } catch (error: any) {
      if (error.name !== "AbortError" && !error.message?.includes("unexpected response") && !signal.aborted) {
        console.error(error);
        toast.error("Ocurrió un error inesperado al generar la canción");
      }
    } finally {
      setLoading(false);
      setSongGenProgress(0);
      setSongGenStatus("");
      setAiProcess(prev => prev?.id === "song-composition" ? null : prev);
      endTask();
    }
  };

  // DB Trigger: Save Active Song
  // Uses ref for the latest state (avoids stale closures), falls back to state
  const handleSaveSong = async () => {
    // Always prefer the ref (most up-to-date after section generation), fall back to state
    const currentSong = activeSongRef.current ?? activeSong;
    if (!currentSong) {
      toast.error("No hay canción activa para guardar. Genera una canción primero.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await saveSongAction(currentSong);
      if (res.success && res.song) {
        toast.success("¡Canción guardada con éxito en la base de datos!");
        // Merge the DB id back into active song so future saves do updates
        const savedData: SongStructure = {
          ...(res.song.data as SongStructure),
          id: res.song.id,
        };
        setActiveSong(savedData);
        activeSongRef.current = savedData;
        await fetchSavedSongs();
      } else {
        toast.error(`No se pudo guardar: ${res.error ?? "Error desconocido"}`);
      }
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(`Error al guardar: ${err?.message ?? "Error desconocido"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // DB Trigger: Delete Song
  const handleDeleteSong = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Seguro que deseas eliminar esta canción?")) return;
    try {
      const res = await deleteSongAction(id);
      if (res.success) {
        toast.success("Canción eliminada.");
        if (activeSong?.id === id) {
          setActiveSong(null);
          setActiveSectionId(null);
        }
        fetchSavedSongs();
      } else {
        toast.error("Error al eliminar la canción.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Import JSON File Project
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.title && parsed.sections) {
          applyLoadedSong(parsed);
          setActiveSectionId(parsed.sections[0]?.id || null);
          setActiveTab("estudio");
          toast.success("¡Proyecto JSON de canción importado con éxito!");
        } else {
          toast.error("El formato del JSON no es válido.");
        }
      } catch (err) {
        toast.error("Error al parsear el JSON.");
      }
    };
    reader.readAsText(file);
  };



  // Trigger individual section regeneration along with all synchronized melody tracks (except percussion)
  const handleRegenerateSection = async (section: SongSection) => {
    if (!activeSong || aiProcess) return;
    const toastId = `section-regen-${section.id}`;
    toast.loading(`Regenerando sección ${section.type} y sincronizando melodias...`, { id: toastId });
    setGeneratingSectionIds(prev => ({ ...prev, [section.id]: true }));
    const signal = startAiProcess("full-section-regen", `Regenerando sección ${section.type} completa`);

    try {
      // 1. Regenerate chords for this section
      const newChords = await generateSectionChords(section, activeSong.tempo, activeSong.title);
      if (!newChords || !newChords.chords || newChords.chords.length === 0) {
        toast.dismiss(toastId);
        return;
      }

      if (signal.aborted) {
        toast.dismiss(toastId);
        return;
      }

      // 2. Filter out percussion tracks and progression rhythm track
      const tracksToRegenerate = (activeSong.tracks || []).filter(t => {
        if (t.isProgressionRhythm) return false;
        const isPerc = 
          t.midiChannel === 10 ||
          t.instrumentPreset === "drum-kit" ||
          t.name.toLowerCase().includes("drum") ||
          t.name.toLowerCase().includes("percusion") ||
          t.name.toLowerCase().includes("percusión") ||
          t.name.toLowerCase().includes("bateria") ||
          t.name.toLowerCase().includes("batería");
        return !isPerc;
      });

      if (tracksToRegenerate.length === 0) {
        // No melody tracks: update chords and sync rhythm track
        const baseUpdated = {
          ...activeSong,
          sections: activeSong.sections.map(s => 
            s.id === section.id ? { ...s, chords: newChords } : s
          ),
          tracks: (activeSong.tracks || []).map(t => {
            if (t.isProgressionRhythm) {
              const aiSections = { ...t.aiSections };
              delete aiSections[section.id];
              return {
                ...t,
                aiSections
              };
            }
            return t;
          })
        };

        const synced = syncChordRhythmTrackNotes(
          baseUpdated,
          selectedRhythmPattern,
          playbackMode,
          customRhythmSteps,
          selectedArpeggioPattern
        );

        setActiveSong(synced);
        saveSongBackground(synced);
        toast.dismiss(toastId);
        toast.success(`¡Sección ${section.type} y progresiones regeneradas con éxito!`);
        return;
      }

      // 3. Set generating status to true for all melody tracks
      setActiveSong(prev => {
        if (!prev) return null;
        return {
          ...prev,
          sections: prev.sections.map(s => 
            s.id === section.id ? { ...s, chords: newChords } : s
          ),
          tracks: prev.tracks?.map(t => {
            const shouldRegen = tracksToRegenerate.some(rt => rt.id === t.id);
            if (shouldRegen) {
              return { ...t, isGenerating: true, progress: 0 };
            }
            return t;
          })
        };
      });

      // 4. Prepare section indexing and chords mapping for generating tracks
      const sectionIndex = activeSong.sections.findIndex(s => s.id === section.id);
      const prevSect = sectionIndex > 0 ? activeSong.sections[sectionIndex - 1] : null;
      const nextSect = sectionIndex < activeSong.sections.length - 1 ? activeSong.sections[sectionIndex + 1] : null;

      const previousChordsList = prevSect?.chords?.chords.map(c => ({
        chord: c.chord,
        pianoNotes: c.pianoNotes || [],
        role: c.role
      })) || undefined;

      const nextChordsList = nextSect?.chords?.chords.map(c => ({
        chord: c.chord,
        pianoNotes: c.pianoNotes || [],
        role: c.role
      })) || undefined;

      const chordsList = newChords.chords.map((c: any) => ({
        chord: c.chord,
        pianoNotes: c.pianoNotes || [],
        role: c.role
      }));

      // 5. Generate all track melodies sequentially so we can abort between them
      const results: { trackId: string; success: boolean; notes?: any }[] = [];
      const currentChordsList = chordsList;
      const progressionRhythmTrack = activeSong.tracks?.find(t => t.isProgressionRhythm);
      const progressionRhythmNotes = progressionRhythmTrack?.sectionNotes?.[section.id];
      
      for (const track of tracksToRegenerate) {
        if (signal.aborted) {
          toast.dismiss(toastId);
          throw new DOMException("Aborted", "AbortError");
        }
        const previousSectionNotes = prevSect ? track.sectionNotes?.[prevSect.id] : undefined;
        const customPrompt = track.prompts?.[section.id] || `Arreglo instrumental para ${track.name}`;

        try {
          const actionPayload: any = {
            songTitle: activeSong.title,
            sectionType: section.type,
            sectionKey: section.key,
            sectionScale: section.scale,
            chordsList: currentChordsList,
            trackName: track.name,
            midiChannel: track.midiChannel,
            userPrompt: customPrompt
          };
          if (prevSect?.type) actionPayload.previousSectionType = prevSect.type;
          if (previousChordsList) actionPayload.previousChordsList = previousChordsList;
          if (previousSectionNotes) actionPayload.previousSectionNotes = previousSectionNotes;
          if (nextSect?.type) actionPayload.nextSectionType = nextSect.type;
          if (nextChordsList) actionPayload.nextChordsList = nextChordsList;
          if (progressionRhythmNotes) actionPayload.progressionRhythmNotes = progressionRhythmNotes;

          const res = await generateSectionTrackAction(actionPayload);

          if (signal.aborted) {
            toast.dismiss(toastId);
            throw new DOMException("Aborted", "AbortError");
          }

          if (res.success && res.data?.notes) {
            results.push({ trackId: track.id, success: true, notes: res.data.notes });
          } else {
            results.push({ trackId: track.id, success: false });
          }
        } catch (err: any) {
          if (err.name === "AbortError") throw err;
          console.error(`Error regenerating track section for ${track.name}:`, err);
          results.push({ trackId: track.id, success: false });
        }
      }

      // 6. Consolidate results and save everything to DB
      setActiveSong(prev => {
        if (!prev) return null;
        const updatedTracks = (prev.tracks || []).map(t => {
          const res = results.find(r => r.trackId === t.id);
          if (res) {
            if (res.success && res.notes) {
              return {
                ...t,
                isGenerating: false,
                progress: 100,
                sectionNotes: {
                  ...t.sectionNotes,
                  [section.id]: res.notes
                }
              };
            } else {
              return {
                ...t,
                isGenerating: false,
                progress: 100
              };
            }
          }
          return t;
        });

        // Clear any AI-generated custom rhythm notes flag for the regenerated section 
        // on the progression rhythm track so that syncChordRhythmTrackNotes regenerates it.
        const cleanedTracks = updatedTracks.map(t => {
          if (t.isProgressionRhythm) {
            const aiSections = { ...t.aiSections };
            delete aiSections[section.id];
            return {
              ...t,
              aiSections
            };
          }
          return t;
        });

        const updated = {
          ...prev,
          tracks: cleanedTracks
        };

        const synced = syncChordRhythmTrackNotes(
          updated,
          selectedRhythmPattern,
          playbackMode,
          customRhythmSteps,
          selectedArpeggioPattern
        );

        setTimeout(() => saveSongBackground(synced), 0);
        return synced;
      });

      toast.dismiss(toastId);
      toast.success(`¡Sección ${section.type} y todas las melodias sincronizadas (excepto percusión) regeneradas con éxito!`);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Error regenerating section chords and track melodies:", err);
        toast.dismiss(toastId);
        toast.error("Error al regenerar progresiones y melodias.");
      }
      // Reset generating flag on error or abort
      setActiveSong(prev => {
        if (!prev) return null;
        return {
          ...prev,
          tracks: prev.tracks?.map(t => ({ ...t, isGenerating: false }))
        };
      });
    } finally {
      setGeneratingSectionIds(prev => ({ ...prev, [section.id]: false }));
      setAiProcess(prev => prev?.id === "full-section-regen" ? null : prev);
    }
  };

  const selectedSection = activeSong?.sections.find(s => s.id === activeSectionId);

  const portalTarget = typeof window !== "undefined" ? document.getElementById("header-portal") : null;
  const headerPortalElement = mounted && portalTarget
    ? createPortal(
        <TooltipProvider>
          <div className="flex items-center gap-2.5 bg-muted/20 p-1 rounded-2xl border border-border/30 backdrop-blur-sm shadow-sm flex-shrink-0 select-none">
            {/* Transporte Global Master */}
            {activeSong && (
              <div className="flex items-center gap-2 px-1">
                {/* Play/Pause Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePlayback()}
                      className={`w-8 h-8 rounded-xl transition-all duration-200 active:scale-95 ${
                        isPlaying 
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20" 
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                    >
                      {isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isPlaying ? "Pausar" : "Reproducir"}</TooltipContent>
                </Tooltip>

                {/* Stop Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => stopPlayback()}
                      disabled={!isPlaying && playbackChordIndex === -1}
                      className="w-8 h-8 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Detener</TooltipContent>
                </Tooltip>

                {/* Loop Mode Cycling Selector Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (loopMode === "off") setLoopMode("song");
                        else if (loopMode === "song") setLoopMode("section");
                        else setLoopMode("off");
                      }}
                      className={`w-8 h-8 rounded-xl transition-colors duration-150 ${
                        loopMode !== "off"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Repeat className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {loopMode === "off"
                      ? "Bucle Desactivado (Click para Canción)"
                      : loopMode === "song"
                      ? "Bucle: Toda la Canción (Click para Sección)"
                      : "Bucle: Sección Activa (Click para Desactivar)"}
                  </TooltipContent>
                </Tooltip>

                {/* Vertical Separator */}
                <div className="h-4 w-[1px] bg-border/40 mx-0.5" />

                {/* BPM Input / Control */}
                <div className="flex items-center gap-1.5 bg-muted/40 border border-border/50 rounded-xl px-2.5 h-8 select-none">
                  <Activity className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <input
                    type="number"
                    min={40}
                    max={220}
                    value={playbackBpm}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setPlaybackBpm(Math.max(40, Math.min(220, val)));
                    }}
                    className="w-10 bg-transparent text-xs font-bold text-foreground focus:outline-none text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    title="Ajustar tempo manual"
                  />
                  <span className="text-[9px] font-black text-muted-foreground tracking-wider uppercase font-sans">BPM</span>
                </div>

                {/* Volume Control Icon Button with Hover Popover/Slider */}
                <div className="flex items-center gap-1.5 bg-muted/40 border border-border/50 rounded-xl px-2.5 h-8">
                  {playbackVolume === 0 ? (
                    <VolumeX className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <Volume2 className="w-3 h-3 text-emerald-600 dark:text-emerald-450" />
                  )}
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={playbackVolume}
                    onChange={(e) => setPlaybackVolume(parseFloat(e.target.value))}
                    className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer accent-emerald-500 focus:outline-none"
                    title={`Volumen Maestro: ${Math.round(playbackVolume * 100)}%`}
                  />
                </div>

                {/* Vertical Separator */}
                <div className="h-4 w-[1px] bg-border/40 mx-0.5" />

                {/* Humanization Slider */}
                <div className="flex items-center gap-1.5 bg-muted/40 border border-border/50 rounded-xl px-2.5 h-8">
                  <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 tracking-wider uppercase font-sans">Human</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={humanizeAmount}
                    onChange={(e) => setHumanizeAmount(parseFloat(e.target.value))}
                    className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer accent-purple-500 focus:outline-none"
                    title={`Humanización / Groove: ${Math.round(humanizeAmount * 100)}%`}
                  />
                </div>
              </div>
            )}

            {activeSong && (
              <div className="h-5 w-[1px] bg-border/60 mx-0.5 flex-shrink-0" />
            )}

            {/* Mode Selector Stepper Tabs */}
            <TabsList className="bg-transparent p-0 border-0 h-auto space-x-1 flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger 
                    value="estudio" 
                    className="rounded-xl w-8 h-8 p-0 flex items-center justify-center data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <Music className="w-3.5 h-3.5 text-primary" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>Mesa de Composición</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger 
                    value="pianoroll" 
                    disabled={!activeSong}
                    className="rounded-xl w-8 h-8 p-0 flex items-center justify-center data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200 disabled:opacity-50"
                  >
                    <Keyboard className="w-3.5 h-3.5 text-primary" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>Piano Roll</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger 
                    value="biblioteca" 
                    className="rounded-xl w-8 h-8 p-0 flex items-center justify-center data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-primary" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>Biblioteca ({savedSongs.length})</TooltipContent>
              </Tooltip>
            </TabsList>

            {/* Vertical DAW Separator */}
            <div className="h-5 w-[1px] bg-border/60 mx-1 flex-shrink-0" />

            {/* GROUP 1: IA Composition */}
            <div className="flex items-center gap-1 px-1">
              <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest mr-0.5 hidden sm:block">IA</span>
              {/* Primary IA Composer Button */}
              <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button disabled={!!aiProcess} className="rounded-xl w-8 h-8 p-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center justify-center transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                        <Sparkles className="w-3.5 h-3.5 text-primary-foreground animate-pulse" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Componer con IA</TooltipContent>
                </Tooltip>

                {/* Collapsible Chat assistant toggle button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => setIsChatOpen(!isChatOpen)}
                      disabled={!activeSong || !!aiProcess}
                      variant={isChatOpen ? "default" : "outline"}
                      className={`rounded-xl w-8 h-8 p-0 flex items-center justify-center transition-all duration-200 ${
                        isChatOpen 
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 border-primary" 
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <MessageSquare className={`w-3.5 h-3.5 ${isChatOpen ? "text-primary-foreground" : "text-primary"}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Asistente Chat IA</TooltipContent>
                </Tooltip>
                
                {/* The wide modal content with vertical scroll */}
                <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto rounded-3xl border-border bg-card/95 backdrop-blur-md shadow-2xl p-0 overflow-x-hidden flex flex-col">
                  <DialogHeader className="p-6 pb-2 border-b border-border/30">
                    <DialogTitle className="text-lg font-black flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                      Compositor de Canciones Inteligente
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Define el concepto de tu canción y configura los parámetros a tu gusto. La IA se encargará de realizar el arreglo armónico por ti.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-6 pt-4">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-12 px-4 space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="relative">
                          {/* Inner spin ring */}
                          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                          {/* Outer glowing glow */}
                          <div className="absolute inset-0 w-16 h-16 bg-primary/10 rounded-full blur-xl animate-pulse" />
                        </div>
                        
                        <div className="text-center space-y-2 max-w-md">
                          <h3 className="text-lg font-black text-foreground">Componiendo tu Canción con IA</h3>
                          <p className="text-xs text-muted-foreground font-medium italic min-h-[1.5rem]">
                            "{songGenStatus || "Analizando estilo y estructurando plano musical..."}"
                          </p>
                        </div>

                        <div className="w-full max-w-md space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-black text-primary uppercase tracking-wider">
                            <span>Progreso de Composición AI</span>
                            <span className="font-mono">{songGenProgress}%</span>
                          </div>
                          <div className="w-full bg-muted/60 rounded-full h-3 overflow-hidden border border-border/30 shadow-inner">
                            <div 
                              className="bg-gradient-to-r from-primary via-purple-500 to-indigo-500 h-full transition-all duration-300 rounded-full shadow-lg"
                              style={{ width: `${songGenProgress}%` }}
                            />
                          </div>
                          <div className="text-[9px] text-muted-foreground/80 text-center font-medium">
                            Por favor espera mientras la IA orquesta tu canción (15-30 seg).
                          </div>
                        </div>
                      </div>
                    ) : (
                      <SongComposerForm
                        loading={loading}
                        onGenerateSong={onSubmit}
                        onImportSong={(song) => {
                          applyLoadedSong(song);
                          setActiveSectionId(song.sections[0]?.id || null);
                          setActiveTab("estudio");
                          setIsComposerOpen(false);
                        }}
                      />
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Vertical Separator */}
            <div className="h-5 w-[1px] bg-border/60 mx-1 flex-shrink-0" />

            {/* GROUP 2: Project Actions (Save + Settings) */}
            <div className="flex items-center gap-1 px-1">
              <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest mr-0.5 hidden sm:block">Proyecto</span>

              {/* Standalone Save Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!activeSong || isSaving}
                    onClick={handleSaveSong}
                    className={`rounded-xl w-8 h-8 p-0 border-border flex items-center justify-center transition-all ${
                      isSaving
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 animate-pulse"
                        : "bg-background hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600"
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isSaving ? "Guardando..." : "Guardar proyecto"}</TooltipContent>
              </Tooltip>

              {/* Studio Settings Modal (AI Config + MIDI Routing) */}
              <Dialog open={isAiSettingsOpen} onOpenChange={setIsAiSettingsOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="rounded-xl w-8 h-8 p-0 border-border bg-background hover:bg-muted/50 flex items-center justify-center">
                        <Settings className="w-3.5 h-3.5 text-primary" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Configuración del Estudio</TooltipContent>
                </Tooltip>
                <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-3xl border-border bg-card/95 backdrop-blur-md shadow-2xl p-6">
                  <DialogHeader className="pb-4 border-b border-border/30">
                    <DialogTitle className="text-lg font-black flex items-center gap-2">
                      <Settings className="w-5 h-5 text-primary" />
                      Configuración del Estudio
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Ajusta los dispositivos MIDI de salida y los proveedores de IA para la composición.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="pt-4 space-y-6 overflow-x-hidden">
                    {/* MIDI Output Routing Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                        <Keyboard className="w-4 h-4 text-primary" />
                        <span className="text-sm font-black">Dispositivo de Salida MIDI</span>
                      </div>
                      {isMidiSupported ? (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Dispositivo</label>
                          <select
                            value={selectedOutputId}
                            onChange={(e) => setSelectedOutputId(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background text-foreground h-9 px-3 text-[11px] font-semibold focus:outline-none hover:bg-muted transition-colors cursor-pointer"
                          >
                            <option value="">🔇 Ninguno (Silencio)</option>
                            {midiOutputs.map((output) => (
                              <option key={output.id} value={output.id}>
                                🎛️ {output.name}
                              </option>
                            ))}
                          </select>
                          {selectedOutputId && (
                            <>
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mt-2">Canal Global</label>
                              <select
                                value={midiChannel}
                                onChange={(e) => setMidiChannel(parseInt(e.target.value, 10))}
                                className="w-full rounded-xl border border-border bg-background text-foreground h-9 px-3 text-[11px] font-semibold focus:outline-none hover:bg-muted transition-colors cursor-pointer"
                              >
                                {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                                  <option key={ch} value={ch}>Canal {ch}</option>
                                ))}
                              </select>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-amber-500 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                          ⚠️ Web MIDI API no soportada en este navegador.
                        </div>
                      )}
                    </div>

                    {/* AI Providers Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                        <Cpu className="w-4 h-4 text-primary" />
                        <span className="text-sm font-black">Proveedores de IA</span>
                      </div>
                      <AiConfigForm initialConfigs={initialConfigs} />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>{/* end GROUP 2: Proyecto */}
          </div>{/* end outer portal div */}
        </TooltipProvider>,


        portalTarget
      )
    : null;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      {/* DAW Root Tabs Navigation Wrapper */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full h-full flex flex-col overflow-hidden">
        {headerPortalElement}



        <div className="flex flex-1 overflow-hidden w-full h-full relative">
          {/* LEFT SIDEBAR PANEL: Transport & Mixer */}
          {activeSong && (
            <div className="w-[360px] border-r border-border/40 bg-zinc-50/50 dark:bg-zinc-950/25 flex flex-col shrink-0 p-5 space-y-4 h-full select-none min-h-0">
              
              {/* Consola de Mezcla Multicanal */}
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between flex-shrink-0 pb-1.5 border-b border-border/30">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Consola de Mezcla</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="w-7 h-7 rounded-lg border-border"
                    onClick={() => setIsTrackComposerOpen(true)}
                    title="Agregar nueva pista con IA"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary" />
                  </Button>
                </div>

                <div className="space-y-3 overflow-y-auto no-scrollbar flex-1 pr-1">
                  {(() => {
                    const getTrackColorClasses = (trackName: string, channel: number) => {
                      const midiColors = [
                        "from-indigo-500 to-blue-600 dark:from-indigo-600/95 dark:to-blue-700/95 border-indigo-400 dark:border-indigo-500/60 text-white dark:text-indigo-100 shadow-[0_0_8px_rgba(99,102,241,0.3)]",
                        "from-amber-500 to-orange-600 dark:from-amber-600/95 dark:to-orange-700/95 border-amber-400 dark:border-amber-500/60 text-white dark:text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.3)]",
                        "from-emerald-500 to-teal-600 dark:from-emerald-600/95 dark:to-teal-700/95 border-emerald-400 dark:border-emerald-500/60 text-white dark:text-emerald-100 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
                        "from-violet-500 to-purple-600 dark:from-violet-600/95 dark:to-purple-700/95 border-violet-400 dark:border-violet-500/60 text-white dark:text-violet-100 shadow-[0_0_8px_rgba(139,92,246,0.3)]",
                        "from-cyan-500 to-blue-600 dark:from-cyan-600/95 dark:to-blue-700/95 border-cyan-400 dark:border-cyan-500/60 text-white dark:text-cyan-100 shadow-[0_0_8px_rgba(6,182,212,0.3)]",
                        "from-pink-500 to-rose-600 dark:from-pink-600/95 dark:to-rose-700/95 border-pink-400 dark:border-pink-500/60 text-white dark:text-pink-100 shadow-[0_0_8px_rgba(236,72,153,0.3)]",
                        "from-lime-500 to-green-600 dark:from-lime-600/95 dark:to-green-700/95 border-lime-400 dark:border-lime-500/60 text-white dark:text-lime-100 shadow-[0_0_8px_rgba(132,204,22,0.3)]",
                        "from-sky-500 to-blue-600 dark:from-sky-600/95 dark:to-blue-700/95 border-sky-400 dark:border-sky-500/60 text-white dark:text-sky-100 shadow-[0_0_8px_rgba(14,165,233,0.3)]",
                        "from-yellow-400 to-amber-500 dark:from-yellow-500/95 dark:to-amber-600/95 border-yellow-300 dark:border-yellow-400/60 text-yellow-900 dark:text-yellow-100 shadow-[0_0_8px_rgba(234,179,8,0.3)]",
                        "from-rose-500 to-red-600 dark:from-rose-600/95 dark:to-red-700/95 border-rose-400 dark:border-rose-500/60 text-white dark:text-rose-100 shadow-[0_0_8px_rgba(244,63,94,0.3)]",
                        "from-orange-500 to-red-600 dark:from-orange-600/95 dark:to-red-700/95 border-orange-400 dark:border-orange-500/60 text-white dark:text-orange-100 shadow-[0_0_8px_rgba(249,115,22,0.3)]",
                        "from-teal-500 to-cyan-600 dark:from-teal-600/95 dark:to-cyan-700/95 border-teal-400 dark:border-teal-500/60 text-white dark:text-teal-100 shadow-[0_0_8px_rgba(20,184,166,0.3)]",
                        "from-fuchsia-500 to-purple-600 dark:from-fuchsia-600/95 dark:to-purple-700/95 border-fuchsia-400 dark:border-fuchsia-500/60 text-white dark:text-fuchsia-100 shadow-[0_0_8px_rgba(217,70,239,0.3)]",
                        "from-blue-500 to-indigo-600 dark:from-blue-600/95 dark:to-indigo-700/95 border-blue-400 dark:border-blue-500/60 text-white dark:text-blue-100 shadow-[0_0_8px_rgba(59,130,246,0.3)]",
                        "from-red-500 to-rose-600 dark:from-red-600/95 dark:to-rose-700/95 border-red-400 dark:border-red-500/60 text-white dark:text-red-100 shadow-[0_0_8px_rgba(239,68,68,0.3)]",
                        "from-purple-500 to-fuchsia-600 dark:from-purple-600/95 dark:to-fuchsia-700/95 border-purple-400 dark:border-purple-500/60 text-white dark:text-purple-100 shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                      ];
                      const safeChannel = Math.max(1, Math.min(16, channel || 1));
                      return midiColors[safeChannel - 1];
                    };

                    return activeSong.tracks?.map((track) => {
                      if (track.isGenerating) {
                        return (
                          <div
                            key={track.id}
                            className="flex flex-col gap-2 p-3 rounded-2xl bg-purple-500/5 border border-purple-500/20 transition-all duration-300 relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-purple-500/5 pointer-events-none" />
                            
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 block border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                              <div className="text-[11px] font-black text-foreground truncate flex-grow">
                                {track.name}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[8px] font-black text-purple-400 uppercase tracking-wider">
                                <span>IA Componiendo...</span>
                                <span className="font-mono">{track.progress || 0}%</span>
                              </div>
                              <div className="w-full bg-muted/50 rounded-full h-1 overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-purple-600 to-indigo-500 h-full transition-all duration-300 rounded-full"
                                  style={{ width: `${track.progress || 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      }


                    const sectionsCount = Object.keys(track.sectionNotes || {}).length;
                    const totalSections = activeSong.sections.length;

                    const isMuted = track.muted === true;
                    const anySoloed = activeSong.tracks?.some(t => t.soloed === true) || false;
                    const isImplicitlyMuted = anySoloed && !track.soloed;
                    const isSilent = isMuted || isImplicitlyMuted;

                    return (
                      <div
                        key={track.id}
                        className={`flex flex-col gap-2.5 p-3 rounded-2xl border transition-all duration-300 relative group overflow-hidden ${
                          isSilent
                            ? "bg-muted/10 border-border/30 opacity-70"
                            : "bg-card/45 border-border/80 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 bg-gradient-to-r ${getTrackColorClasses(track.name, track.midiChannel)}`}>
                              <Music className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-[11px] font-black text-foreground truncate max-w-[120px]" title={track.name}>
                                {track.name}
                              </h4>
                              <div className="text-[8px] text-muted-foreground">
                                {sectionsCount}/{totalSections} secciones
                              </div>
                            </div>
                          </div>

                          {/* Track controls: Mute, Solo, Delete */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setVisiblePianoRollTracks(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(track.id)) {
                                    newSet.delete(track.id);
                                  } else {
                                    newSet.add(track.id);
                                  }
                                  return newSet;
                                });
                              }}
                              className={`w-5.5 h-5.5 rounded flex items-center justify-center transition-all ${
                                visiblePianoRollTracks.has(track.id)
                                  ? "bg-blue-500/20 text-blue-500 border border-blue-500/40"
                                  : "bg-muted/40 hover:bg-muted/80 text-muted-foreground"
                              }`}
                              title="Ver en Piano Roll"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleToggleTrackMute(null, track.id)}
                              className={`w-5.5 h-5.5 rounded text-[10px] font-black transition-all ${
                                isMuted
                                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                                  : "bg-muted/40 hover:bg-muted/80 text-muted-foreground"
                              }`}
                              title="Mute (M)"
                            >
                              M
                            </button>
                            <button
                              onClick={() => handleToggleTrackSolo(null, track.id)}
                              className={`w-5.5 h-5.5 rounded text-[10px] font-black transition-all ${
                                track.soloed
                                  ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/40"
                                  : "bg-muted/40 hover:bg-muted/80 text-muted-foreground"
                              }`}
                              title="Solo (S)"
                            >
                              S
                            </button>
                            
                            {!track.isProgressionRhythm && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-5.5 h-5.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                onClick={() => handleDeleteTrack(null, track.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Volume Slider & MIDI Channel selector */}
                        <div className="grid grid-cols-2 gap-2 items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-muted-foreground font-black">VOL</span>
                            <input
                              type="range"
                              min="0.0"
                              max="1.0"
                              step="0.05"
                              value={track.volume !== undefined ? track.volume : 0.7}
                              onChange={(e) => handleUpdateTrackVolume(null, track.id, Number(e.target.value))}
                              className="w-full accent-purple-550 h-1 bg-muted rounded-lg cursor-pointer"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[8px] text-muted-foreground font-black">CH</span>
                            <select
                              value={track.midiChannel || 1}
                              onChange={(e) => handleUpdateTrackChannel(null, track.id, Number(e.target.value))}
                              className="rounded-lg border border-border bg-background text-foreground h-6 px-1.5 text-[9px] font-bold focus:outline-none hover:bg-muted cursor-pointer flex-grow"
                            >
                              {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                                <option key={ch} value={ch}>
                                  Ch {ch}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Modular AI Generation Section Pills */}
                        <div className="space-y-1 border-t border-border/10 pt-2">
                          {track.isProgressionRhythm ? (
                            <div className="space-y-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRhythmAssistantSectionId(null);
                                  setIsRhythmAssistantOpen(true);
                                }}
                                className="w-full text-[9px] font-black h-7 rounded-xl border-purple-500/25 bg-purple-500/5 hover:bg-purple-500/10 text-purple-450 dark:text-purple-400 cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Sliders className="w-2.5 h-2.5" />
                                Ajustar Ritmo y Acompañamiento
                              </Button>
                              <div className="flex flex-wrap gap-1">
                                {activeSong.sections.map((sect) => {
                                  const isAi = track.aiSections?.[sect.id] === true;
                                  return (
                                    <button
                                      key={sect.id}
                                      onClick={() => {
                                        setRhythmAssistantSectionId(sect.id);
                                        setIsRhythmAssistantOpen(true);
                                      }}
                                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold border transition-all duration-150 cursor-pointer ${
                                        isAi
                                          ? "bg-purple-500/5 border-purple-500/20 text-purple-400 hover:bg-purple-500/15"
                                          : "bg-muted/20 border-dashed border-border/50 text-muted-foreground hover:bg-muted/50"
                                      }`}
                                      title={isAi ? `Sección ${sect.type} personalizada con IA. Click para cambiar.` : `Sección ${sect.type} sincronizada globalmente. Click para personalizar con IA.`}
                                    >
                                      {isAi ? (
                                        <Check className="w-2.5 h-2.5 text-purple-400" />
                                      ) : (
                                        <span className="w-1 h-1 bg-muted-foreground/40 rounded-full" />
                                      )}
                                      <span>{sect.type.substring(0, 4)}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {activeSong.sections.map((sect) => {
                                const notesList = track.sectionNotes?.[sect.id];
                                const hasNotes = notesList && notesList.length > 0;
                                const isGenerating = generatingSectionIds[sect.id];

                                return (
                                  <button
                                    key={sect.id}
                                    disabled={isGenerating}
                                    onClick={() => {
                                      setRegenTrackId(track.id);
                                      setRegenSectionId(sect.id);
                                      setIsSectionRegenOpen(true);
                                    }}
                                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold border transition-all duration-150 ${
                                      hasNotes
                                        ? "bg-purple-500/5 border-purple-500/20 text-purple-400 hover:bg-purple-500/15"
                                        : "bg-muted/20 border-dashed border-border/50 text-muted-foreground hover:bg-muted/50"
                                    }`}
                                    title={`Componer / regenerar melodía de la sección ${sect.type}`}
                                  >
                                    {isGenerating ? (
                                      <span className="w-1.5 h-1.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                                    ) : hasNotes ? (
                                      <Check className="w-2.5 h-2.5 text-purple-400" />
                                    ) : (
                                      <Sparkles className="w-2.5 h-2.5 text-muted-foreground/60" />
                                    )}
                                    <span>{sect.type.substring(0, 4)}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
                </div>
              </div>

              {/* MIDI Activity Indicator (minimal) */}
              <div className="border-t border-border/30 pt-2 flex-shrink-0 flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${midiActivity ? 'bg-indigo-500 shadow-sm animate-pulse' : 'bg-muted-foreground/30'}`} />
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  {midiActivity ? 'MIDI Activo' : 'MIDI en Espera'}
                </span>
              </div>

            </div>
          )}

          {/* RIGHT VIEWING PANEL: Studio, PianoRoll, Library */}
          <div className="flex-1 flex flex-col overflow-y-auto w-full p-6 relative h-full">
            
            {/* Tab 1: Studio Composer Workbench */}
            <TabsContent value="estudio" className="mt-0 focus-visible:outline-none focus-visible:ring-0 flex-1 flex flex-col">
          <div className="w-full space-y-6">
            {!activeSong ? (
                <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-dashed border-border/70 bg-card/25 backdrop-blur-sm p-8 space-y-4">
                  <div className="p-4 bg-primary/10 rounded-full text-primary">
                    <ListMusic className="w-10 h-10 animate-bounce" />
                  </div>
                  <div className="max-w-md space-y-2">
                    <h3 className="text-xl font-bold">Estudio Musical Vacío</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Abre el asistente de composición inteligente para crear tu estructura armónica modular con IA, o carga un proyecto de tu biblioteca.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                      <Button onClick={() => setIsComposerOpen(true)} variant="default" className="rounded-xl flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/20">
                        <Sparkles className="w-4 h-4" />
                        Componer Nueva Canción
                      </Button>
                      <Button onClick={() => setActiveTab("biblioteca")} variant="outline" className="rounded-xl flex items-center gap-2 border-border">
                        <FolderOpen className="w-4 h-4 text-primary" />
                        Explorar Biblioteca
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Song Header Card */}
                  <div className="rounded-3xl border border-primary/10 bg-card/35 backdrop-blur-sm p-6 space-y-4 relative overflow-hidden shadow-lg">
                    <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/15 text-primary">
                          {activeSong.genre}
                        </span>
                        {activeSong.id && (
                          <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Sincronizada con DB
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-3xl font-black tracking-tight text-foreground">
                        {activeSong.title}
                      </h3>
                      <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed italic">
                        "{activeSong.description}"
                      </p>
                    </div>

                    {/* Song-level badges bar */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-muted/50 border border-border text-xs font-semibold text-muted-foreground">
                        <Compass className="w-3.5 h-3.5 text-primary" />
                        Tonalidad General: <span className="text-foreground">{activeSong.key}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-muted/50 border border-border text-xs font-semibold text-muted-foreground">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                        Tempo General: <span className="text-foreground">{activeSong.tempo} BPM</span>
                      </div>
                    </div>
                  </div>

                  <ArrangementTimeline
                    activeSong={activeSong}
                    activeSectionId={activeSectionId}
                    setActiveSectionId={setActiveSectionId}
                    generatingSectionIds={generatingSectionIds}
                    handleRegenerateSection={handleRegenerateSection}
                    loading={loading || !!aiProcess}
                    playbackSectionId={playbackSectionId}
                  />

                  {selectedSection && (
                    <SectionChordEditor
                      selectedSection={selectedSection}
                      generatingSectionIds={generatingSectionIds}
                      getRoleColor={getRoleColor}
                      tracks={activeSong.tracks || []}
                      onRegenerateTrackSectionClick={(trackId, sectionId) => {
                        const track = activeSong.tracks?.find(t => t.id === trackId);
                        if (track?.isProgressionRhythm) {
                          setRhythmAssistantSectionId(sectionId);
                          setIsRhythmAssistantOpen(true);
                        } else {
                          setRegenTrackId(trackId);
                          setRegenSectionId(sectionId);
                          setIsSectionRegenOpen(true);
                        }
                      }}
                      onResetSectionSyncClick={handleResetSectionSync}
                      isAiLoading={!!aiProcess}
                    />
                  )}
                </div>
              )}
          </div>
        </TabsContent>

        {/* Tab 3: Interactive Piano Roll View */}
        <TabsContent value="pianoroll" className="mt-0 focus-visible:outline-none focus-visible:ring-0 flex-1 flex flex-col w-full h-full">
          {activeSong && activeTab === "pianoroll" ? (
            <PianoRoll
              activeSong={activeSong}
              isPlaying={isPlaying}
              playbackSectionId={playbackSectionId}
              playbackChordIndex={playbackChordIndex}
              playbackBpm={playbackBpm}
              playbackVolume={playbackVolume}
              togglePlayback={togglePlayback}
              startPlayback={startPlayback}
              stopPlayback={stopPlayback}
              setPlaybackSectionId={setPlaybackSectionId}
              setPlaybackChordIndex={setPlaybackChordIndex}
              visibleTrackIds={visiblePianoRollTracks}
              onUpdateNote={handleUpdateNote}
            />
          ) : activeSong ? (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-dashed border-border/70 bg-card/25 backdrop-blur-sm p-8 space-y-4">
              <h3 className="text-xl font-bold">Cargando Piano Roll...</h3>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-dashed border-border/70 bg-card/25 backdrop-blur-sm p-8 space-y-4">
              <h3 className="text-xl font-bold">Carga una canción para ver el Piano Roll</h3>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Premium Visual Project Library Explorer */}
        <TabsContent value="biblioteca" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
          <SongLibrary
            isLoadingSongs={isLoadingSongs}
            savedSongs={savedSongs}
            setActiveTab={setActiveTab}
            handleDeleteSong={handleDeleteSong}
            onLoadSong={(song) => {
              applyLoadedSong(song);
              setActiveSectionId(song.sections[0]?.id || null);
              setActiveTab("estudio");
              toast.success(`Abierta: "${song.title}"`);
            }}
          />
        </TabsContent>
          </div>

          {/* AI CO-COMPOSITION CHAT SIDEBAR */}
          {activeSong && isChatOpen && (
            <div className="w-[350px] border-l border-border/40 bg-zinc-50/50 dark:bg-zinc-950/25 backdrop-blur-md flex flex-col shrink-0 h-full animate-in slide-in-from-right duration-300 min-h-0 select-none">
              {/* Chat Header */}
              <div className="p-4 border-b border-border/30 flex items-center justify-between bg-card/15">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Copiloto IA</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => setIsChatOpen(false)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {chatMessages.map((msg, idx) => {
                  const isUser = msg.role === "user";
                  return (
                    <div 
                      key={idx} 
                      className={`flex gap-2 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                    >
                      <div 
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                          isUser ? "bg-primary/20 text-primary" : "bg-purple-500/20 text-purple-400"
                        }`}
                      >
                        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>
                      <div 
                        className={`rounded-2xl p-3 text-xs leading-relaxed border shadow-sm ${
                          isUser 
                            ? "bg-primary text-primary-foreground border-primary/25 rounded-tr-none" 
                            : "bg-card/45 text-foreground border-border/35 rounded-tl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <span className="text-[8px] opacity-60 block mt-1 font-mono text-right">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {isChatSending && (
                  <div className="flex gap-2 max-w-[85%] mr-auto animate-pulse">
                    <div className="w-7 h-7 rounded-lg bg-purple-550/20 text-purple-400 flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 animate-bounce" />
                    </div>
                    <div className="rounded-2xl p-3 text-xs bg-card/45 text-muted-foreground border border-border/35 rounded-tl-none flex items-center gap-1">
                      <span>Procesando arreglo con IA</span>
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce delay-75" />
                        <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce delay-150" />
                        <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce delay-225" />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Interactive Quick Prompts (chips) */}
              <div className="p-3 border-t border-border/20 bg-card/5 flex flex-col gap-2">
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">Sugerencias:</span>
                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto no-scrollbar">
                  {[
                    "Sube el tempo 10 BPM",
                    "Reduce el tempo 10 BPM",
                    "Haz el coro menor triste",
                    "Cambia el título a Noche Estrellada",
                    "Cambia el género a Balada Lo-Fi"
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={!!aiProcess}
                      onClick={() => handleSendChatMessage(undefined, chip)}
                      className="px-2 py-1 text-[10px] font-bold rounded-xl bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-150 active:scale-95 disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <form 
                onSubmit={handleSendChatMessage} 
                className="p-3 border-t border-border/30 bg-card/25 flex gap-2"
              >
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Instrucción de refinamiento..."
                  disabled={!!aiProcess}
                  className="rounded-xl h-9 text-xs border-border/65 bg-background/50 focus-visible:ring-1"
                />
                {isChatSending ? (
                  <Button
                    type="button"
                    onClick={cancelAiProcess}
                    className="rounded-xl h-9 w-9 p-0 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 shadow-sm shrink-0"
                    title="Cancelar proceso IA"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={!!aiProcess || !chatInput.trim()}
                    className="rounded-xl h-9 w-9 p-0 bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/20 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                )}
              </form>
            </div>
          )}
        </div>
      </Tabs>

      {/* AI Track Composer Modal Dialog */}
      <TrackComposerDialog
        open={isTrackComposerOpen}
        onOpenChange={setIsTrackComposerOpen}
        activeSong={activeSong}
        onGenerateTrack={(trackName, midiChannel, instrumentPreset, prompt, syncWithProgression) =>
          handleGenerateTrack({ trackName, midiChannel, instrumentPreset, prompt, syncWithProgression })
        }
      />

      {/* AI Section Melody Regeneration Modal Dialog */}
      <SectionRegenDialog
        open={isSectionRegenOpen}
        onOpenChange={setIsSectionRegenOpen}
        activeSong={activeSong}
        regenTrackId={regenTrackId}
        regenSectionId={regenSectionId}
        onRegenerate={(trackId, sectionId, prompt, syncWithProgression) =>
          handleRegenerateTrackSection(trackId, sectionId, prompt, syncWithProgression)
        }
      />

      {/* Progression Rhythm & Accompaniment Assistant Dialog */}
      <ProgressionRhythmDialog
        open={isRhythmAssistantOpen}
        onOpenChange={setIsRhythmAssistantOpen}
        activeSong={activeSong}
        playbackMode={playbackMode}
        setPlaybackMode={setPlaybackMode}
        selectedRhythmPattern={selectedRhythmPattern}
        setSelectedRhythmPattern={setSelectedRhythmPattern}
        selectedArpeggioPattern={selectedArpeggioPattern}
        setSelectedArpeggioPattern={setSelectedArpeggioPattern}
        onGenerateAiRhythm={async (p, s, o) => { await handleGenerateAiRhythm(p, s, o); }}
        isGeneratingAiRhythm={isGeneratingRhythm}
        defaultSectionId={rhythmAssistantSectionId}
      />


    {/* Interactive Error Resumption Dialog */}
    <Dialog 
      open={!!confirmPrompt} 
      onOpenChange={(val) => { 
        if (!val && confirmPrompt) confirmPrompt.onCancel(); 
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-500">
            <AlertCircle className="w-5 h-5" />
            Fallo en Generación IA
          </DialogTitle>
          <DialogDescription className="text-base text-foreground mt-2">
            {confirmPrompt?.message}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => confirmPrompt?.onCancel()}>
            No, Cancelar
          </Button>
          <Button variant="default" onClick={() => confirmPrompt?.onConfirm()}>
            Sí, Reintentar
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    </div>

  );
}

export function SongGenerator(props: SongGeneratorProps) {
  return (
    <AiProgressProvider>
      <SongGeneratorInner {...props} />
      <AiProgressIndicator />
    </AiProgressProvider>
  );
}
