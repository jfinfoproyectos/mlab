"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  generateSectionTrackAction
} from "../actions/song-generator.actions";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Music, 
  Sparkles, 
  Copy, 
  Check, 
  AlertCircle, 
  Compass, 
  Activity, 
  RefreshCw, 
  BookOpen, 
  ChevronRight, 
  ChevronDown,
  Upload, 
  Download, 
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
  VolumeX
} from "lucide-react";

import { PianoKeyboard } from "./piano-keyboard";
import { SongLibrary } from "./song-library";
import { RhythmSequencer } from "./rhythm-sequencer";
import { SongComposerForm } from "./song-composer-form";
import { SidebarSongLibrary } from "./sidebar-song-library";
import { PlaybackControls } from "./playback-controls";
import { ArrangementTimeline } from "./arrangement-timeline";
import { SectionChordEditor } from "./section-chord-editor";

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
// High-Precision Web Worker Timer to prevent background throttling in browsers
let workerInstance: Worker | null = null;
const activeWorkerCallbacks: Record<number, () => void> = {};
let workerTimerIdCounter = 1;

const getWorkerInstance = (): Worker | null => {
  if (typeof window === "undefined") return null;
  if (workerInstance) return workerInstance;

  try {
    const blobCode = `
      const activeTimers = {};
      self.onmessage = function(e) {
        const { action, id, delay } = e.data;
        if (action === "setTimeout") {
          activeTimers[id] = setTimeout(() => {
            self.postMessage({ action: "trigger", id });
            delete activeTimers[id];
          }, delay);
        } else if (action === "clearTimeout") {
          if (activeTimers[id]) {
            clearTimeout(activeTimers[id]);
            delete activeTimers[id];
          }
        }
      };
    `;
    const blob = new Blob([blobCode], { type: "application/javascript" });
    workerInstance = new Worker(URL.createObjectURL(blob));
    workerInstance.onmessage = (e) => {
      const { action, id } = e.data;
      if (action === "trigger") {
        const cb = activeWorkerCallbacks[id];
        if (cb) {
          cb();
          delete activeWorkerCallbacks[id];
        }
      }
    };
    return workerInstance;
  } catch (err) {
    console.warn("Failed to initialize background Web Worker Timer:", err);
    return null;
  }
};

const workerSetTimeout = (callback: () => void, delay: number): number => {
  const worker = getWorkerInstance();
  if (!worker) {
    return window.setTimeout(callback, delay) as any;
  }
  const id = workerTimerIdCounter++;
  activeWorkerCallbacks[id] = callback;
  worker.postMessage({ action: "setTimeout", id, delay });
  return id;
};

const workerClearTimeout = (id: number | null) => {
  if (!id) return;
  const worker = getWorkerInstance();
  if (!worker) {
    window.clearTimeout(id);
    return;
  }
  worker.postMessage({ action: "clearTimeout", id });
  delete activeWorkerCallbacks[id];
};

export function SongGenerator() {
  // Alias high-precision Web Worker timers to shadow global setTimeout/clearTimeout in this scope.
  // This automatically runs all playback and arpeggio scheduling in a non-throttled background thread.
  const setTimeout = workerSetTimeout as any;
  const clearTimeout = workerClearTimeout as any;

  const [loading, setLoading] = useState(false);
  const [songGenProgress, setSongGenProgress] = useState<number>(0);
  const [songGenStatus, setSongGenStatus] = useState<string>("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [activeSong, setActiveSong] = useState<SongStructure | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // --- Web MIDI API Integration (MIDI Output Only) ---
  const [midiOutputs, setMidiOutputs] = useState<any[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState<string>("");
  const [midiChannel, setMidiChannel] = useState<number>(1);
  const [isMidiSupported, setIsMidiSupported] = useState<boolean>(false);
  const [midiActivity, setMidiActivity] = useState<boolean>(false);

  const midiAccessRef = useRef<any>(null);
  const activeOutputPortRef = useRef<any>(null);
  const midiChannelRef = useRef<number>(1);
  const previouslyPlayedMidiNotesRef = useRef<number[]>([]);

  // Sync MIDI Channel ref
  useEffect(() => {
    midiChannelRef.current = midiChannel;
  }, [midiChannel]);

  // --- MIDI Playback States ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSectionId, setPlaybackSectionId] = useState<string | null>(null);
  const [playbackChordIndex, setPlaybackChordIndex] = useState<number>(-1);
  const [playbackBpm, setPlaybackBpm] = useState<number>(80);
  const [playbackVolume, setPlaybackVolume] = useState<number>(0.7);
  const [playbackPreset, setPlaybackPreset] = useState<string>("grand-piano");
  const [playbackMode, setPlaybackMode] = useState<"basic" | "rhythm" | "arpeggio" | "custom-rhythm">("basic");
  const [selectedRhythmPattern, setSelectedRhythmPattern] = useState<string>("pop-ballad");
  const [selectedArpeggioPattern, setSelectedArpeggioPattern] = useState<string>("up-down");
  const [loopMode, setLoopMode] = useState<"song" | "section" | "off">("off");

  // --- Custom Rhythmic Sequencer ---
  const [customRhythmSteps, setCustomRhythmSteps] = useState<boolean[][]>(
    Array(5).fill(null).map(() => Array(16).fill(false))
  );
  const [savedRhythms, setSavedRhythms] = useState<Array<{ id: string, name: string, steps: boolean[][] }>>([]);
  const [newRhythmName, setNewRhythmName] = useState<string>("");
  
  const customRhythmStepsRef = useRef<boolean[][]>(Array(5).fill(null).map(() => Array(16).fill(false)));
  const savedRhythmsRef = useRef<any[]>([]);
  const [activePlaybackNotes, setActivePlaybackNotes] = useState<string[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const globalGainNodeRef = useRef<GainNode | null>(null);
  const playbackTimerRef = useRef<any>(null);
  const isPlayingRef = useRef(false);
  const activePlaybackNotesRef = useRef<string[]>([]);
  const playbackVolumeRef = useRef(0.7);
  const playbackPresetRef = useRef("grand-piano");
  const playbackModeRef = useRef<"basic" | "rhythm" | "arpeggio" | "custom-rhythm">("basic");
  const selectedRhythmPatternRef = useRef<string>("pop-ballad");
  const selectedArpeggioPatternRef = useRef<string>("up-down");
  const loopModeRef = useRef<"song" | "section" | "off">("off");

  const playbackBpmRef = useRef(80);

  const subTimeoutsRef = useRef<any[]>([]);
  const trackTimeoutsRef = useRef<any[]>([]);
  const playbackWorkerRef = useRef<Worker | null>(null);
  const activeMidiNotesRef = useRef<number[]>([]);

  // Sync refs to avoid stale closures, and update master volume (Web Audio & MIDI CC) in real-time
  useEffect(() => {
    playbackVolumeRef.current = playbackVolume;
    
    // Update Web Audio Master Gain in real-time
    if (audioContextRef.current && globalGainNodeRef.current) {
      try {
        const now = audioContextRef.current.currentTime;
        globalGainNodeRef.current.gain.setTargetAtTime(playbackVolume, now, 0.01);
      } catch (e) {
        console.warn("Error updating global Web Audio volume:", e);
      }
    }

    // Broadcast MIDI Channel Volume (CC 7) in real-time to active MIDI output
    if (activeOutputPortRef.current) {
      try {
        const out = activeOutputPortRef.current;
        const channelIdx = midiChannelRef.current - 1; // 0 to 15
        const volVal = Math.round(playbackVolume * 127);
        out.send([0xB0 | channelIdx, 7, volVal]); // CC 7
      } catch (e) {
        console.warn("Error sending MIDI volume CC:", e);
      }
    }
  }, [playbackVolume, midiChannel]);
  useEffect(() => { playbackPresetRef.current = playbackPreset; }, [playbackPreset]);
  useEffect(() => { playbackModeRef.current = playbackMode; }, [playbackMode]);
  useEffect(() => { selectedRhythmPatternRef.current = selectedRhythmPattern; }, [selectedRhythmPattern]);
  useEffect(() => { selectedArpeggioPatternRef.current = selectedArpeggioPattern; }, [selectedArpeggioPattern]);
  useEffect(() => { loopModeRef.current = loopMode; }, [loopMode]);

  useEffect(() => {
    customRhythmStepsRef.current = customRhythmSteps;
  }, [customRhythmSteps]);
  
  useEffect(() => {
    savedRhythmsRef.current = savedRhythms;
  }, [savedRhythms]);

  // Load saved custom rhythms from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("musiclab_custom_rhythms");
        if (stored) {
          const parsed = JSON.parse(stored);
          const migrated = parsed.map((item: any) => ({
            ...item,
            steps: migrate1DTo2D(item.steps)
          }));
          setSavedRhythms(migrated);
        } else {
          // Pre-populate with a cool default groove!
          const popGroove2D = migrate1DTo2D([
            "both", "rest", "single", "chord", "rest", "single", "chord", "rest",
            "bass", "rest", "single", "chord", "rest", "single", "both", "rest"
          ]);
          const defaultCustom = [
            {
              id: "groove-pop-1",
              name: "🎸 Mi Primer Pop Groove",
              steps: popGroove2D
            }
          ];
          setSavedRhythms(defaultCustom);
          localStorage.setItem("musiclab_custom_rhythms", JSON.stringify(defaultCustom));
        }
      } catch (e) {
        console.error("Error loading custom rhythms:", e);
      }
    }
  }, []);

  const toggleStepNote = (rowIdx: number, stepIdx: number) => {
    const newSteps = customRhythmSteps.map((row, rIdx) => 
      rIdx === rowIdx 
        ? row.map((val, sIdx) => sIdx === stepIdx ? !val : val)
        : [...row]
    );
    setCustomRhythmSteps(newSteps);
    
    // Auto-select "custom" option if modifying active grid steps while on another pattern
    if (!selectedRhythmPattern.startsWith("custom")) {
      setSelectedRhythmPattern("custom");
    }
  };

  const clearCustomSteps = () => {
    setCustomRhythmSteps(Array(5).fill(null).map(() => Array(16).fill(false)));
    setSelectedRhythmPattern("custom");
    toast.success("Piano Roll limpiado.");
  };

  const fillFourOnFloorChords = () => {
    const grid = Array(5).fill(null).map(() => Array(16).fill(false));
    [0, 4, 8, 12].forEach(step => {
      grid[0][step] = true; // Bass
      grid[1][step] = true; // Chord note 1
      grid[2][step] = true; // Chord note 2
      grid[3][step] = true; // Chord note 3
      grid[4][step] = true; // Chord note 4
    });
    setCustomRhythmSteps(grid);
    setSelectedRhythmPattern("custom");
    toast.success("Patrón 4-on-the-Floor cargado.");
  };

  const loadPopGrooveTemplate = () => {
    const popGroove2D = migrate1DTo2D([
      "both", "rest", "single", "chord", "rest", "single", "chord", "rest",
      "bass", "rest", "single", "chord", "rest", "single", "both", "rest"
    ]);
    setCustomRhythmSteps(popGroove2D);
    setSelectedRhythmPattern("custom");
    toast.success("Relleno Pop cargado.");
  };

  const saveCustomRhythm = () => {
    if (!newRhythmName.trim()) {
      toast.error("Por favor, introduce un nombre para tu patrón rítmico.");
      return;
    }
    const newId = `rhythm-${Date.now()}`;
    const newPattern = {
      id: newId,
      name: newRhythmName.trim(),
      steps: customRhythmSteps.map(row => [...row])
    };
    const updated = [...savedRhythms, newPattern];
    setSavedRhythms(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("musiclab_custom_rhythms", JSON.stringify(updated));
    }
    setSelectedRhythmPattern(`custom-${newId}`);
    setNewRhythmName("");
    toast.success(`¡Patrón "${newPattern.name}" guardado exitosamente!`);
  };

  const deleteCustomRhythm = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedRhythms.filter(r => r.id !== id);
    setSavedRhythms(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("musiclab_custom_rhythms", JSON.stringify(updated));
    }
    if (selectedRhythmPattern === `custom-${id}` || selectedRhythmPattern === "custom") {
      setSelectedRhythmPattern("pop-ballad");
    }
    toast.success("Patrón rítmico eliminado.");
  };
  useEffect(() => { playbackBpmRef.current = playbackBpm; }, [playbackBpm]);

  // Synchronize playback configurations to activeSong and DB
  useEffect(() => {
    setActiveSong(prev => {
      if (!prev) return null;

      let hasChanges = false;
      const updatedConfig: Partial<SongStructure> = {};

      if (prev.tempo !== playbackBpm) {
        updatedConfig.tempo = playbackBpm;
        hasChanges = true;
      }
      if (prev.playbackMode !== playbackMode) {
        updatedConfig.playbackMode = playbackMode;
        hasChanges = true;
      }
      if (prev.selectedRhythmPattern !== selectedRhythmPattern) {
        updatedConfig.selectedRhythmPattern = selectedRhythmPattern;
        hasChanges = true;
      }
      if (prev.selectedArpeggioPattern !== selectedArpeggioPattern) {
        updatedConfig.selectedArpeggioPattern = selectedArpeggioPattern;
        hasChanges = true;
      }
      if (prev.playbackVolume !== playbackVolume) {
        updatedConfig.playbackVolume = playbackVolume;
        hasChanges = true;
      }
      if (prev.loopMode !== loopMode) {
        updatedConfig.loopMode = loopMode;
        hasChanges = true;
      }

      const isCustomStepsDifferent = () => {
        if (!prev.customRhythmSteps) return true;
        if (prev.customRhythmSteps.length !== customRhythmSteps.length) return true;
        for (let r = 0; r < customRhythmSteps.length; r++) {
          if (prev.customRhythmSteps[r].length !== customRhythmSteps[r].length) return true;
          for (let c = 0; c < customRhythmSteps[r].length; c++) {
            if (prev.customRhythmSteps[r][c] !== customRhythmSteps[r][c]) return true;
          }
        }
        return false;
      };

      if (isCustomStepsDifferent()) {
        updatedConfig.customRhythmSteps = customRhythmSteps;
        hasChanges = true;
      }

      if (hasChanges) {
        const updated = {
          ...prev,
          ...updatedConfig
        };
        activeSongRef.current = updated;
        saveSongBackground(updated);
        return updated;
      }

      return prev;
    });
  }, [
    playbackBpm,
    playbackMode,
    selectedRhythmPattern,
    selectedArpeggioPattern,
    playbackVolume,
    customRhythmSteps,
    loopMode
  ]);

  // Clean up playback on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
      }
      if (playbackWorkerRef.current) {
        playbackWorkerRef.current.postMessage({ action: "stop" });
        playbackWorkerRef.current.terminate();
        playbackWorkerRef.current = null;
      }
      subTimeoutsRef.current.forEach(clearTimeout);
      trackTimeoutsRef.current.forEach(clearTimeout);

      // Silenciar cualquier nota MIDI activa al desmontar
      if (activeOutputPortRef.current) {
        try {
          const out = activeOutputPortRef.current;
          const notesToTurnOff = Array.from(
            new Set([...activeMidiNotesRef.current, ...previouslyPlayedMidiNotesRef.current])
          );

          notesToTurnOff.forEach((midiNum) => {
            for (let ch = 0; ch < 16; ch++) {
              out.send([0x80 | ch, midiNum, 0x00]);
            }
          });

          // Enviar CC All Notes Off y All Sound Off a todos los canales
          for (let ch = 0; ch < 16; ch++) {
            out.send([0xB0 | ch, 123, 0]);
            out.send([0xB0 | ch, 120, 0]);
          }
        } catch (e) {
          console.warn("Error silenciando MIDI en desmontaje:", e);
        }
      }
    };
  }, []);



  // Convert note name (e.g. "C3") to MIDI number
  const noteToMidi = (noteStr: string): number => {
    const semitones: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'DB': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'EB': 3, 'E': 4,
      'F': 5, 'F#': 6, 'Gb': 6, 'GB': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'AB': 8, 'A': 9,
      'A#': 10, 'Bb': 10, 'BB': 10, 'B': 11
    };
    const match = noteStr.trim().toUpperCase().match(/^([A-G][#B]?)([0-9])$/);
    if (!match) return 60;
    const name = match[1];
    const octave = parseInt(match[2], 10);
    const semitone = semitones[name] ?? 0;
    return (octave + 1) * 12 + semitone;
  };

  // Pulse MIDI activity lamp
  const triggerMidiActivity = () => {
    setMidiActivity(true);
    setTimeout(() => setMidiActivity(false), 120);
  };

  // Request MIDI Access on mount or when requested
  const initMidi = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.requestMIDIAccess) {
      console.log("Web MIDI API not supported in this browser.");
      setIsMidiSupported(false);
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess();
      midiAccessRef.current = access;
      setIsMidiSupported(true);

      const outputs = Array.from(access.outputs.values()) as any[];
      setMidiOutputs(outputs);

      // Listen for connection changes
      access.onstatechange = () => {
        const outs = Array.from(access.outputs.values()) as any[];
        setMidiOutputs(outs);
      };
    } catch (e) {
      console.warn("Could not access MIDI devices:", e);
      setIsMidiSupported(false);
    }
  }, []);

  useEffect(() => {
    initMidi();
  }, [initMidi]);

  // Bind selected output
  useEffect(() => {
    if (!midiAccessRef.current) return;
    
    const selectedPort = Array.from(midiAccessRef.current.outputs.values()).find(
      (output: any) => output.id === selectedOutputId
    ) as any;

    if (selectedPort) {
      activeOutputPortRef.current = selectedPort;
      console.log(`MIDI Output connected: ${selectedPort.name}`);
    } else {
      activeOutputPortRef.current = null;
    }
  }, [selectedOutputId]);

  // Convert note name (e.g. "C3", "Eb4") to frequency
  const noteToFreq = (noteStr: string): number => {
    const semitones: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'DB': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'EB': 3, 'E': 4,
      'F': 5, 'F#': 6, 'Gb': 6, 'GB': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'AB': 8, 'A': 9,
      'A#': 10, 'Bb': 10, 'BB': 10, 'B': 11
    };

    const match = noteStr.trim().toUpperCase().match(/^([A-G][#B]?)([0-9])$/);
    if (!match) return 440;
    const name = match[1];
    const octave = parseInt(match[2], 10);
    const semitone = semitones[name] ?? 0;
    const midi = (octave + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midi - 69) / 12);
  };

  const getAudioContext = (): AudioContext => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const playSingleNote = (noteName: string, durationMs: number, velocity: number = 1.0, startTimeMs?: number) => {
    try {
      const freq = noteToFreq(noteName);
      if (!freq || isNaN(freq)) return;

      const out = activeOutputPortRef.current || (midiOutputs && midiOutputs[0]);
      if (out) {
        try {
          triggerMidiActivity();
          const midiNum = noteToMidi(noteName);
          const channelIdx = midiChannelRef.current - 1; // 0 to 15
          
          const scaledVelocity = Math.round(velocity * playbackVolumeRef.current * 127);
          const finalVelocity = Math.min(127, Math.max(0, scaledVelocity));
          
          const start = startTimeMs !== undefined ? startTimeMs : performance.now();
          out.send([0x90 | channelIdx, midiNum, finalVelocity], start); // Note On (Hardware Precise)
          out.send([0x80 | channelIdx, midiNum, 0x00], start + durationMs); // Note Off (Hardware Precise)
          
          const delay = start - performance.now();
          const visualTimeout = setTimeout(() => {
            if (!activeMidiNotesRef.current.includes(midiNum)) {
              activeMidiNotesRef.current.push(midiNum);
            }
            setActivePlaybackNotes(prev => {
              if (prev.includes(noteName)) return prev;
              return [...prev, noteName];
            });

            const offTimeout = setTimeout(() => {
              activeMidiNotesRef.current = activeMidiNotesRef.current.filter(n => n !== midiNum);
              setActivePlaybackNotes(prev => prev.filter(n => n !== noteName));
            }, durationMs);
            subTimeoutsRef.current.push(offTimeout);
          }, Math.max(0, delay));
          subTimeoutsRef.current.push(visualTimeout);
        } catch (midiErr) {
          console.warn("MIDI Output send error:", midiErr);
        }
      }
      
      // Mute internal web synth entirely
      return;
    } catch (e) {
      console.error("Synth note playback error:", e);
    }
  };

  const playTrackSingleNote = (
    noteName: string,
    durationMs: number,
    velocity: number = 1.0,
    midiChannel: number = 1,
    instrumentPreset: string = "grand-piano",
    startTimeMs?: number
  ) => {
    try {
      const freq = noteToFreq(noteName);
      if (!freq || isNaN(freq)) return;

      const out = activeOutputPortRef.current || (midiOutputs && midiOutputs[0]);
      if (out) {
        try {
          triggerMidiActivity();
          const midiNum = noteToMidi(noteName);
          const channelIdx = midiChannel - 1; // 0 to 15 (based on the track's configured channel!)

          const scaledVelocity = Math.round(velocity * 127);
          const finalVelocity = Math.min(127, Math.max(0, scaledVelocity));

          const start = startTimeMs !== undefined ? startTimeMs : performance.now();
          out.send([0x90 | channelIdx, midiNum, finalVelocity], start); // Note On (Hardware Precise)
          out.send([0x80 | channelIdx, midiNum, 0x00], start + durationMs); // Note Off (Hardware Precise)

          const delay = start - performance.now();
          const visualTimeout = setTimeout(() => {
            if (!activeMidiNotesRef.current.includes(midiNum)) {
              activeMidiNotesRef.current.push(midiNum);
            }

            const offTimeout = setTimeout(() => {
              activeMidiNotesRef.current = activeMidiNotesRef.current.filter(n => n !== midiNum);
            }, durationMs);
            trackTimeoutsRef.current.push(offTimeout);
          }, Math.max(0, delay));
          trackTimeoutsRef.current.push(visualTimeout);
        } catch (midiErr) {
          console.warn("Track MIDI Output send error:", midiErr);
        }
      }
      
      // Mute internal web synth entirely
      return;
    } catch (e) {
      console.error("Synth track note playback error:", e);
    }
  };

  const playChordNotes = (notes: string[], durationMs: number, chordIndex: number = 0, startTimeMs?: number) => {
    if (!notes || notes.length === 0) return;
    
    // Clear any previous sub-timeouts to avoid overlapping
    subTimeoutsRef.current.forEach(clearTimeout);
    subTimeoutsRef.current = [];

    const mode = playbackModeRef.current;

    const baseStart = startTimeMs !== undefined ? startTimeMs : performance.now();
    let currentDelayMs = 0;

    // Local synchronous scheduler to execute notes immediately with future timestamps
    const localSetTimeout = (callback: () => void, delay: number): any => {
      const prevDelay = currentDelayMs;
      currentDelayMs = prevDelay + delay;
      callback();
      currentDelayMs = prevDelay;
      return 0; // dummy timer ID
    };

    // Shadow setTimeout locally for all rhythm patterns
    const setTimeout = localSetTimeout;
    
    const playSingleNoteWithVisuals = (noteName: string, noteDurationMs: number, velocity: number) => {
      playSingleNote(noteName, noteDurationMs, velocity, baseStart + currentDelayMs);
    };

    if (mode === "basic") {
      // Modo Básico: Play all notes simultaneously for the full duration
      notes.forEach((noteName) => {
        playSingleNoteWithVisuals(noteName, durationMs, 1.0);
      });
    } else if (mode === "custom-rhythm") {
      // Custom Step Sequencer Pattern (16 Steps in a measure)
      const stepMs = durationMs / 16;
      const bass = notes[0];
      const voicing = notes.length > 1 ? notes.slice(1) : notes;

      const getLowerOctave = (noteName: string): string => {
        const matchNote = noteName.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchNote) {
          const name = matchNote[1];
          const octave = parseInt(matchNote[2], 10);
          return `${name}${Math.max(1, octave - 1)}`;
        }
        return noteName;
      };

      const bassLower = getLowerOctave(bass);
      let bassAlt = bassLower;
      const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
      if (matchAlt) {
        const name = matchAlt[1];
        const octave = parseInt(matchAlt[2], 10);
        bassAlt = `${name}${Math.min(1, octave)}`;
      }

      // We alternate bass octave for interest
      const getBassNoteForStep = (stepIdx: number): string => {
        return stepIdx % 8 >= 4 ? bassAlt : bassLower;
      };

      // Determine which custom steps array to play
      let activeCustomSteps = customRhythmStepsRef.current;
      const pattern = selectedRhythmPatternRef.current;
      
      if (pattern && pattern.startsWith("custom-")) {
        const savedId = pattern.replace("custom-", "");
        const found = savedRhythmsRef.current.find((r: any) => r.id === savedId);
        if (found && found.steps) {
          activeCustomSteps = found.steps;
        }
      }

      // Loop over the 16 steps using 2D matrix structure
      for (let i = 0; i < 16; i++) {
        const activeRows: number[] = [];
        for (let rowIdx = 0; rowIdx < 5; rowIdx++) {
          if (activeCustomSteps[rowIdx] && activeCustomSteps[rowIdx][i]) {
            activeRows.push(rowIdx);
          }
        }

        if (activeRows.length === 0) continue;

        subTimeoutsRef.current.push(setTimeout(() => {
          const currentBass = getBassNoteForStep(i);
          activeRows.forEach((rowIdx) => {
            if (rowIdx === 0) {
              // Bass note
              playSingleNoteWithVisuals(currentBass, stepMs * 0.95, 1.0);
            } else {
              // Chord voicing note index: rowIdx - 1
              const noteIdx = rowIdx - 1;
              if (voicing[noteIdx]) {
                playSingleNoteWithVisuals(voicing[noteIdx], stepMs * 0.95, 0.85);
              }
            }
          });
        }, i * stepMs));
      }
    } else if (mode === "rhythm") {
      const beatMs = durationMs / 4;
      const bass = notes[0];
      const voicing = notes.length > 1 ? notes.slice(1) : notes;

      const getLowerOctave = (noteName: string): string => {
        const matchNote = noteName.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchNote) {
          const name = matchNote[1];
          const octave = parseInt(matchNote[2], 10);
          return `${name}${Math.max(1, octave - 1)}`;
        }
        return noteName;
      };

      const bassLower = getLowerOctave(bass);
      const pattern = selectedRhythmPatternRef.current;
      const isEvenMeasure = chordIndex % 2 === 1; // Creates AB measure variation patterns

      if (pattern === "pop-ballad") {
        if (!isEvenMeasure) {
          // A-Bar: Standard pop ballad (sustaining bass + basic chord/arpeggio pulse)
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 3.8, 1.0);
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.9, 0.85));
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.8, 0.75));
          }, beatMs));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(voicing[0], beatMs * 0.5, 0.8);
          }, beatMs * 1.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.9, 0.85));
          }, beatMs * 2));

          subTimeoutsRef.current.push(setTimeout(() => {
            const noteToPlay = voicing[1] || voicing[0];
            playSingleNoteWithVisuals(noteToPlay, beatMs * 0.5, 0.8);
          }, beatMs * 2.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            const noteToPlay = voicing[voicing.length - 1];
            playSingleNoteWithVisuals(noteToPlay, beatMs * 0.5, 0.8);
          }, beatMs * 3));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.4, 0.8));
          }, beatMs * 3.5));
        } else {
          // B-Bar: Beautiful Pop fill variation (rising arpeggio run + dynamic syncopation)
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 3.8, 1.0);
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.9, 0.9));
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.8, 0.75));
          }, beatMs));

          // Cascading rising arpeggio filling beats 3 and 4
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(voicing[0], beatMs * 0.4, 0.8);
          }, beatMs * 2.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            const note = voicing[1] || voicing[0];
            playSingleNoteWithVisuals(note, beatMs * 0.4, 0.8);
          }, beatMs * 2.33));

          subTimeoutsRef.current.push(setTimeout(() => {
            const note = voicing[2] || voicing[voicing.length - 1];
            playSingleNoteWithVisuals(note, beatMs * 0.4, 0.85);
          }, beatMs * 2.66));

          subTimeoutsRef.current.push(setTimeout(() => {
            const note = voicing[voicing.length - 1];
            playSingleNoteWithVisuals(note, beatMs * 0.5, 0.9);
          }, beatMs * 3.0));

          // Resolved chord strike on the last eighth-note
          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.4, 0.85));
          }, beatMs * 3.5));
        }

      } else if (pattern === "classical-alberti") {
        const stepMs = durationMs / 8;
        const lowNote = bassLower;
        const highNote = voicing[voicing.length - 1];
        const midNote = voicing[Math.floor(voicing.length / 2)] || lowNote;

        if (!isEvenMeasure) {
          // A-Bar: Standard low-high-mid-high pattern
          const sequence = [lowNote, highNote, midNote, highNote, lowNote, highNote, midNote, highNote];
          sequence.forEach((noteName, i) => {
            subTimeoutsRef.current.push(setTimeout(() => {
              playSingleNoteWithVisuals(noteName, stepMs * 0.95, 0.85);
            }, i * stepMs));
          });
        } else {
          // B-Bar: Classical Scale-run / Cadential arpeggio variation
          const sequence = [lowNote, midNote, highNote, midNote, lowNote, midNote, highNote, highNote];
          sequence.forEach((noteName, i) => {
            const vel = i === 7 ? 0.95 : 0.8;
            const durationMultiplier = i === 7 ? 1.4 : 0.95;
            subTimeoutsRef.current.push(setTimeout(() => {
              playSingleNoteWithVisuals(noteName, stepMs * durationMultiplier, vel);
            }, i * stepMs));
          });
        }

      } else if (pattern === "neo-soul-arpeggio") {
        const stepMs = beatMs / 2; // 8th note
        if (!isEvenMeasure) {
          // A-Bar: Standard neo-soul (warm blocks on 1 & 3, arpeggios on 2 & 4)
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.8, 0.95);
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 1.4, 0.9));
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            const note = voicing[Math.floor(voicing.length / 2)] || voicing[0];
            playSingleNoteWithVisuals(note, stepMs * 1.5, 0.8);
          }, beatMs));

          subTimeoutsRef.current.push(setTimeout(() => {
            const note = voicing[voicing.length - 1];
            playSingleNoteWithVisuals(note, stepMs * 1.5, 0.8);
          }, beatMs * 1.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.8, 0.85);
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 1.4, 0.8));
          }, beatMs * 2));

          subTimeoutsRef.current.push(setTimeout(() => {
            const note = voicing[voicing.length - 1];
            playSingleNoteWithVisuals(note, stepMs * 1.2, 0.75);
          }, beatMs * 3));

          subTimeoutsRef.current.push(setTimeout(() => {
            const note = voicing[Math.floor(voicing.length / 2)] || voicing[0];
            playSingleNoteWithVisuals(note, stepMs * 1.2, 0.75);
          }, beatMs * 3.5));
        } else {
          // B-Bar: Beautiful neo-soul variation with jazzy grace notes (slide / hammer-on effect)
          subTimeoutsRef.current.push(setTimeout(() => {
            // Warm strummed chord at the start
            playSingleNoteWithVisuals(bassLower, beatMs * 1.8, 0.95);
            voicing.forEach((n, idx) => {
              setTimeout(() => playSingleNoteWithVisuals(n, beatMs * 1.4, 0.9), idx * 25);
            });
          }, 0));

          // Beat 2: Jazzy grace-note slide (two notes played extremely close together)
          subTimeoutsRef.current.push(setTimeout(() => {
            const graceNote = voicing[0];
            const targetNote = voicing[1] || voicing[0];
            playSingleNoteWithVisuals(graceNote, stepMs * 0.4, 0.75);
            setTimeout(() => {
              playSingleNoteWithVisuals(targetNote, stepMs * 1.1, 0.85);
            }, 40);
          }, beatMs));

          subTimeoutsRef.current.push(setTimeout(() => {
            const note = voicing[voicing.length - 1];
            playSingleNoteWithVisuals(note, stepMs * 1.5, 0.8);
          }, beatMs * 1.5));

          // Beat 3: Warm chord strike
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.8, 0.85);
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 1.4, 0.8));
          }, beatMs * 2));

          // Beat 4: Descending jazzy sweep fill
          subTimeoutsRef.current.push(setTimeout(() => {
            const topNote = voicing[voicing.length - 1];
            const midNote = voicing[Math.floor(voicing.length / 2)] || voicing[0];
            const lowNote = voicing[0];
            playSingleNoteWithVisuals(topNote, stepMs * 0.8, 0.75);
            setTimeout(() => playSingleNoteWithVisuals(midNote, stepMs * 0.8, 0.75), 60);
            setTimeout(() => playSingleNoteWithVisuals(lowNote, stepMs * 0.8, 0.8), 120);
          }, beatMs * 3));
        }

      } else if (pattern === "bossa-nova") {
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const noteName = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${noteName}${Math.max(1, octave)}`;
        }

        if (!isEvenMeasure) {
          // A-Bar: Standard Brazilian bossa syncopation
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.2, 1.0);
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.8, 0.9));
          }, beatMs * 0.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach((n, idx) => {
              const strumTimeout = setTimeout(() => {
                playSingleNoteWithVisuals(n, beatMs * 0.7, 0.8);
              }, idx * 30);
              subTimeoutsRef.current.push(strumTimeout);
            });
          }, beatMs * 1.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassAlt, beatMs * 1.2, 0.9);
          }, beatMs * 2));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.8, 0.85));
          }, beatMs * 2.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach((n, idx) => {
              const strumTimeout = setTimeout(() => {
                playSingleNoteWithVisuals(n, beatMs * 0.4, 0.75);
              }, idx * 30);
              subTimeoutsRef.current.push(strumTimeout);
            });
          }, beatMs * 3.5));
        } else {
          // B-Bar: Bossa Nova variation with dynamic swing chords (mambo-bossa style)
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.2, 1.0);
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.8, 0.9));
          }, beatMs * 0.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.8, 0.85));
          }, beatMs * 1.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassAlt, beatMs * 1.2, 0.9);
          }, beatMs * 2.0));

          // Triple off-beat chords at the end to create Latin anticipation
          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.5, 0.85));
          }, beatMs * 2.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.5, 0.9));
          }, beatMs * 3.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.4, 0.8));
          }, beatMs * 3.5));
        }

      } else if (pattern === "lofi-chill") {
        if (!isEvenMeasure) {
          // A-Bar: Standard slow elegant strum over deep bass and ambient echo
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 3.9, 0.9);
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach((n, idx) => {
              const strumTimeout = setTimeout(() => {
                playSingleNoteWithVisuals(n, beatMs * 2.5, 0.8);
              }, idx * 60);
              subTimeoutsRef.current.push(strumTimeout);
            });
          }, beatMs * 0.25));

          subTimeoutsRef.current.push(setTimeout(() => {
            const topNote = voicing[voicing.length - 1];
            playSingleNoteWithVisuals(topNote, beatMs * 1.0, 0.45);
          }, beatMs * 2.5));
        } else {
          // B-Bar: Dreamy reversed strum and high-filter echo variation
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 3.9, 0.9);
          }, 0));

          // Reversed slow strum (high-to-low note order) for a dreamy vinyl-rewind feel
          subTimeoutsRef.current.push(setTimeout(() => {
            const reversedVoicing = [...voicing].reverse();
            reversedVoicing.forEach((n, idx) => {
              const strumTimeout = setTimeout(() => {
                playSingleNoteWithVisuals(n, beatMs * 2.5, 0.75);
              }, idx * 60);
              subTimeoutsRef.current.push(strumTimeout);
            });
          }, beatMs * 0.25));

          // Magical dual-tone echo (recreating jazzy chord extensions) on beat 3
          subTimeoutsRef.current.push(setTimeout(() => {
            const topNote = voicing[voicing.length - 1];
            const extensionNote = voicing[voicing.length - 2] || voicing[0];
            playSingleNoteWithVisuals(topNote, beatMs * 1.0, 0.4);
            playSingleNoteWithVisuals(extensionNote, beatMs * 1.0, 0.35);
          }, beatMs * 2.5));
        }

      } else if (pattern === "salsa-tumbao") {
        const highNote = voicing[voicing.length - 1];
        const innerVoicing = voicing.length > 1 ? voicing.slice(0, voicing.length - 1) : voicing;
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.max(1, octave)}`;
        }

        if (!isEvenMeasure) {
          // A-Bar: Standard Salsa Tumbao (Montuno 1)
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.2, 1.0);
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(highNote, beatMs * 0.4, 1.0);
          }, beatMs * 0.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            innerVoicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.4, 0.9));
          }, beatMs));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(highNote, beatMs * 0.4, 1.0);
          }, beatMs * 1.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassAlt, beatMs * 1.2, 0.95);
          }, beatMs * 2.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(highNote, beatMs * 0.4, 1.0);
          }, beatMs * 2.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            innerVoicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.4, 0.9));
          }, beatMs * 3.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(highNote, beatMs * 0.4, 1.0);
          }, beatMs * 3.5));
        } else {
          // B-Bar: Salsa Tumbao Variation (Montuno 2 - Blazing Octave Punch & Fills)
          // Hits powerful double-octave punches on off-beats with walking octave fills
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.2, 1.0);
          }, 0));

          // Beat 1.5: Blazing double-octave punch (playing top and lowest note of voicing)
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(highNote, beatMs * 0.45, 1.0);
            playSingleNoteWithVisuals(voicing[0], beatMs * 0.45, 0.95);
          }, beatMs * 0.5));

          // Beat 2.0: Inner block
          subTimeoutsRef.current.push(setTimeout(() => {
            innerVoicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.4, 0.9));
          }, beatMs * 1.0));

          // Beat 2.5: High punch
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(highNote, beatMs * 0.4, 1.0);
          }, beatMs * 1.5));

          // Beat 3.0: Dynamic double-bass roll
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassAlt, beatMs * 0.6, 0.95);
            setTimeout(() => {
              playSingleNoteWithVisuals(bassLower, beatMs * 0.6, 0.9);
            }, beatMs * 0.5);
          }, beatMs * 2.0));

          // Beat 3.5: Double-octave punch
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(highNote, beatMs * 0.45, 1.0);
            playSingleNoteWithVisuals(voicing[0], beatMs * 0.45, 0.95);
          }, beatMs * 2.5));

          // Beat 4.0 & 4.5: Downward rolling octave montuno fill
          subTimeoutsRef.current.push(setTimeout(() => {
            const mid = voicing[Math.floor(voicing.length / 2)] || voicing[0];
            playSingleNoteWithVisuals(mid, beatMs * 0.4, 0.85);
          }, beatMs * 3.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(voicing[0], beatMs * 0.4, 0.9);
          }, beatMs * 3.5));
        }

      } else if (pattern === "bachata-bolero") {
        const stepMs = durationMs / 8; // 8th notes
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.max(1, octave)}`;
        }

        if (!isEvenMeasure) {
          // A-Bar: Standard fluid constant bachata arpeggio
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, stepMs * 1.8, 1.0);
          }, 0));

          const arpeggioFlow = [voicing[0], voicing[1] || voicing[0], voicing[voicing.length - 1], voicing[0], voicing[1] || voicing[0]];

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(arpeggioFlow[0], stepMs * 0.8, 0.85);
          }, stepMs));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(arpeggioFlow[1], stepMs * 0.8, 0.8);
          }, stepMs * 2));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(arpeggioFlow[2], stepMs * 0.8, 0.85);
          }, stepMs * 3));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassAlt, stepMs * 1.8, 0.95);
          }, stepMs * 4));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(arpeggioFlow[3], stepMs * 0.8, 0.8);
          }, stepMs * 5));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(arpeggioFlow[4], stepMs * 0.8, 0.85);
          }, stepMs * 6));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(voicing[0], stepMs * 0.8, 0.8);
          }, stepMs * 7));
        } else {
          // B-Bar: Bachata Majao swing section fill! Sharp staccato double-stops on offbeats
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, stepMs * 1.8, 1.0);
          }, 0));

          // In majao section, the piano hits sharp double notes on beats 1.5, 2.5, 3.5, 4.5
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(voicing[0], stepMs * 0.6, 0.9);
            playSingleNoteWithVisuals(voicing[voicing.length - 1], stepMs * 0.6, 0.9);
          }, stepMs));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(voicing[0], stepMs * 0.6, 0.85);
            playSingleNoteWithVisuals(voicing[voicing.length - 2] || voicing[0], stepMs * 0.6, 0.85);
          }, stepMs * 2));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(voicing[0], stepMs * 0.6, 0.9);
            playSingleNoteWithVisuals(voicing[voicing.length - 1], stepMs * 0.6, 0.9);
          }, stepMs * 3));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassAlt, stepMs * 1.8, 0.95);
          }, stepMs * 4));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(voicing[0], stepMs * 0.6, 0.85);
            playSingleNoteWithVisuals(voicing[voicing.length - 1], stepMs * 0.6, 0.85);
          }, stepMs * 5));

          subTimeoutsRef.current.push(setTimeout(() => {
            // Blazing triplet arpeggio fill at the end of the majao bar
            playSingleNoteWithVisuals(voicing[0], stepMs * 0.5, 0.8);
            setTimeout(() => playSingleNoteWithVisuals(voicing[1] || voicing[0], stepMs * 0.5, 0.8), stepMs * 0.33);
            setTimeout(() => playSingleNoteWithVisuals(voicing[voicing.length - 1], stepMs * 0.5, 0.85), stepMs * 0.66);
          }, stepMs * 6));
        }

      } else if (pattern === "reggaeton-dembow") {
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.max(1, octave)}`;
        }

        if (!isEvenMeasure) {
          // A-Bar: Standard Reggaeton Dembow rhythm with cascading arpeggios
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.5, 1.0);
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.5, 0.95));
          }, beatMs * 0.75));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach((n, idx) => {
              const strumTimeout = setTimeout(() => {
                playSingleNoteWithVisuals(n, beatMs * 0.4, 0.85);
              }, idx * 25);
              subTimeoutsRef.current.push(strumTimeout);
            });
          }, beatMs * 1.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassAlt, beatMs * 1.5, 0.9);
          }, beatMs * 2.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.5, 0.9));
          }, beatMs * 2.75));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach((n, idx) => {
              const strumTimeout = setTimeout(() => {
                playSingleNoteWithVisuals(n, beatMs * 0.4, 0.8);
              }, idx * 25);
              subTimeoutsRef.current.push(strumTimeout);
            });
          }, beatMs * 3.5));
        } else {
          // B-Bar: Urban Dembow Fill variation (slamming offbeats + triple-stroke chord rolls on Beat 4)
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.5, 1.0);
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.5, 0.95));
          }, beatMs * 0.75));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.5, 0.9));
          }, beatMs * 1.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassAlt, beatMs * 1.5, 0.9);
          }, beatMs * 2.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.5, 0.85));
          }, beatMs * 2.75));

          // Blazing high-energy triple-stroke dembow fill ending on Beat 4
          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.35, 0.9));
          }, beatMs * 3.25));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.35, 0.95));
          }, beatMs * 3.50));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.35, 1.0));
          }, beatMs * 3.75));
        }

      } else if (pattern === "bolero-romantico") {
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.max(1, octave)}`;
        }

        if (!isEvenMeasure) {
          // A-Bar: Standard slow strum + elegant romantic bolero flow
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.8, 0.95);
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach((n, idx) => {
              const strumTimeout = setTimeout(() => {
                playSingleNoteWithVisuals(n, beatMs * 0.8, 0.8);
              }, idx * 40);
              subTimeoutsRef.current.push(strumTimeout);
            });
          }, beatMs * 0.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            const note = voicing[1] || voicing[0];
            playSingleNoteWithVisuals(note, beatMs * 0.4, 0.75);
          }, beatMs * 1.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassAlt, beatMs * 1.8, 0.85);
          }, beatMs * 2.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            const note = voicing[voicing.length - 1];
            playSingleNoteWithVisuals(note, beatMs * 0.4, 0.75);
          }, beatMs * 2.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            const note = voicing[1] || voicing[0];
            playSingleNoteWithVisuals(note, beatMs * 0.4, 0.7);
          }, beatMs * 3.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(voicing[0], beatMs * 0.4, 0.75);
          }, beatMs * 3.5));
        } else {
          // B-Bar: Bolero Rubato variation with warm romantic grace turn on beat 2.5
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.8, 0.95);
          }, 0));

          // Soft rolled block chord
          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach((n, idx) => {
              const strumTimeout = setTimeout(() => {
                playSingleNoteWithVisuals(n, beatMs * 0.8, 0.8);
              }, idx * 30);
              subTimeoutsRef.current.push(strumTimeout);
            });
          }, beatMs * 0.5));

          // Romantic grace turn (fast triplet triplet notes) on Beat 2.5
          subTimeoutsRef.current.push(setTimeout(() => {
            const n0 = voicing[0];
            const n1 = voicing[1] || voicing[0];
            const n2 = voicing[voicing.length - 1];
            playSingleNoteWithVisuals(n0, beatMs * 0.3, 0.75);
            setTimeout(() => playSingleNoteWithVisuals(n1, beatMs * 0.3, 0.75), 50);
            setTimeout(() => playSingleNoteWithVisuals(n2, beatMs * 0.5, 0.8), 100);
          }, beatMs * 1.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassAlt, beatMs * 1.8, 0.85);
          }, beatMs * 2.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            const note = voicing[voicing.length - 2] || voicing[0];
            playSingleNoteWithVisuals(note, beatMs * 0.4, 0.75);
          }, beatMs * 2.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            const note = voicing[1] || voicing[0];
            playSingleNoteWithVisuals(note, beatMs * 0.4, 0.7);
          }, beatMs * 3.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(voicing[0], beatMs * 0.4, 0.75);
          }, beatMs * 3.5));
        }

      } else if (pattern === "jazz-swing") {
        // Jazz Swing Walk: Walking bassline on all 4 quarter beats with syncopated right hand comping
        // Determine walking bass notes
        let bassAlt = bassLower;
        let bassWalk3 = bassLower;
        let bassWalk4 = bassLower;
        
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          // Scale degree walking notes
          bassAlt = `${name}${Math.min(1, octave)}`; // Perfect fifth or octave up
          // Create simple chromatic walking steps:
          const nextNoteLetter = name === "G" ? "A" : String.fromCharCode(name.charCodeAt(0) + 1);
          bassWalk3 = `${nextNoteLetter}${Math.max(1, octave - 1)}`;
          bassWalk4 = `${name}#${Math.max(1, octave - 1)}`;
        }

        // Walking Bass scheduled on every Beat (1, 2, 3, 4)
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassLower, beatMs * 0.9, 0.95), 0));
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassAlt, beatMs * 0.9, 0.85), beatMs));
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassWalk3, beatMs * 0.9, 0.85), beatMs * 2));
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassWalk4, beatMs * 0.9, 0.9), beatMs * 3));

        if (!isEvenMeasure) {
          // A-Bar: Standard swing comping (Beat 1.0 and Beat 2.66 - swing offbeat)
          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.6, 0.85));
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.5, 0.8));
          }, beatMs * 1.66)); // Triplet swing feel

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.6, 0.85));
          }, beatMs * 3.0));
        } else {
          // B-Bar: Dynamic swing variation (Charleston comping rhythm on Beat 1.0 and Beat 2.5)
          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.6, 0.9));
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.6, 0.85));
          }, beatMs * 1.5)); // Charleston syncopation pulse

          subTimeoutsRef.current.push(setTimeout(() => {
            // Fast jazz triplet roll right before the end
            voicing.forEach((n, idx) => {
              setTimeout(() => playSingleNoteWithVisuals(n, beatMs * 0.35, 0.75), idx * 25);
            });
          }, beatMs * 3.66));
        }

      } else if (pattern === "boogie-woogie") {
        // Rock / Boogie-Woogie: Driving eighth-note octave bass walks with downbeat slamming chords
        let bassWalk: string[] = [bassLower];
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          const root = `${name}${Math.max(1, octave - 1)}`;
          const fifth = `${name === "C" ? "G" : "D"}${Math.max(1, octave - 1)}`; // Approximation for standard keys
          const sixth = `${name === "C" ? "A" : "E"}${Math.max(1, octave - 1)}`;
          bassWalk = [root, root, fifth, fifth, sixth, sixth, fifth, fifth];
        }

        // Schedule driving 8th-note bassline
        const stepMs = durationMs / 8;
        for (let i = 0; i < 8; i++) {
          const note = bassWalk[i % bassWalk.length] || bassLower;
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(note, stepMs * 0.8, 1.0);
          }, i * stepMs));
        }

        if (!isEvenMeasure) {
          // A-Bar: Slamming rock chords on the main beats 1, 2, 3, 4
          subTimeoutsRef.current.push(setTimeout(() => voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 1.5, 0.95)), 0));
          subTimeoutsRef.current.push(setTimeout(() => voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 1.5, 0.9)), beatMs));
          subTimeoutsRef.current.push(setTimeout(() => voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 1.5, 0.9)), beatMs * 2));
          subTimeoutsRef.current.push(setTimeout(() => voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 1.5, 0.95)), beatMs * 3));
        } else {
          // B-Bar: Boogie variation (Slamming rock chords + blazing eighth-note rock arpeggio fill on beats 3.5 & 4)
          subTimeoutsRef.current.push(setTimeout(() => voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 1.5, 0.95)), 0));
          subTimeoutsRef.current.push(setTimeout(() => voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 1.5, 0.9)), beatMs));

          // Blazing rock & roll piano arpeggio lick cascading up
          subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(voicing[0], stepMs * 0.9, 0.85), beatMs * 2.0));
          subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(voicing[1] || voicing[0], stepMs * 0.9, 0.85), beatMs * 2.5));
          subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(voicing[voicing.length - 1], stepMs * 0.9, 0.9), beatMs * 3.0));
          subTimeoutsRef.current.push(setTimeout(() => {
            // High octave slide finish
            const highName = voicing[voicing.length - 1];
            playSingleNoteWithVisuals(highName, stepMs * 1.6, 1.0);
          }, beatMs * 3.5));
        }

      } else if (pattern === "funk-clav") {
        const stepMs = durationMs / 16; // 16th notes
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.min(1, octave)}`;
        }

        // Schedule syncopated walking bass
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassLower, stepMs * 2.8, 1.0), 0));
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassAlt, stepMs * 2.8, 0.9), beatMs));
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassLower, stepMs * 2.8, 0.95), beatMs * 2));
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassAlt, stepMs * 2.8, 0.9), beatMs * 3));

        if (!isEvenMeasure) {
          // A-Bar: Staccato funk clav comping
          const hits = [2, 5, 8, 11, 14]; // 16th note indexes
          hits.forEach((hIndex) => {
            subTimeoutsRef.current.push(setTimeout(() => {
              voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 0.9, 0.95));
            }, hIndex * stepMs));
          });
        } else {
          // B-Bar: Faster funk response with syncopated double strikes
          const hits = [2, 4, 7, 10, 12, 14];
          hits.forEach((hIndex) => {
            subTimeoutsRef.current.push(setTimeout(() => {
              voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 0.8, 0.9));
            }, hIndex * stepMs));
          });
        }

      } else if (pattern === "ambient-drone") {
        // Slow swelling cinematic block drone
        const slowStrum = (notesArray: string[], delay: number) => {
          notesArray.forEach((n, idx) => {
            const strumTimeout = setTimeout(() => {
              playSingleNoteWithVisuals(n, durationMs * 0.9, 0.65);
            }, idx * 60 + delay);
            subTimeoutsRef.current.push(strumTimeout);
          });
        };
        
        // Deep bass note holding all bar
        subTimeoutsRef.current.push(setTimeout(() => {
          playSingleNoteWithVisuals(bassLower, durationMs * 0.95, 0.7);
        }, 0));

        // Soft cascading block chord strum
        slowStrum(voicing, 120);

        if (isEvenMeasure) {
          // Subtle higher harmony echo halfway
          subTimeoutsRef.current.push(setTimeout(() => {
            const topNote = voicing[voicing.length - 1];
            playSingleNoteWithVisuals(topNote, beatMs * 1.8, 0.45);
          }, beatMs * 2));
        }

      } else if (pattern === "cumbia-colombiana") {
        // Cumbia Colombiana: Traditional "contratiempo" key strikes
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.min(1, octave)}`;
        }

        // Bass on all four beats (1, 2, 3, 4) walking between root and fifth
        const bassCumbia = [bassLower, bassAlt, bassLower, bassAlt];
        bassCumbia.forEach((bNote, idx) => {
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bNote, beatMs * 0.7, 0.95);
          }, idx * beatMs));
        });

        // Sharp staccato off-beat chord comping (hits on beat 1.5, 2.5, 3.5, 4.5)
        const compTimes = [beatMs * 0.5, beatMs * 1.5, beatMs * 2.5, beatMs * 3.5];
        compTimes.forEach((time) => {
          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.35, 0.95));
          }, time));
        });

        if (isEvenMeasure) {
          // B-Bar: Beautiful double-octave melodic pickup sweep at the end
          subTimeoutsRef.current.push(setTimeout(() => {
            const highNote = voicing[voicing.length - 1];
            const lowerHighNote = voicing[0];
            playSingleNoteWithVisuals(lowerHighNote, beatMs * 0.4, 0.85);
            setTimeout(() => playSingleNoteWithVisuals(highNote, beatMs * 0.4, 0.95), 100);
          }, beatMs * 3.7));
        }

      } else if (pattern === "edm-house") {
        // EDM / House: Driving 4-on-the-floor block comping with dynamic sixteenth syncopation
        // Slamming beats on 1, 2, 3, 4
        for (let i = 0; i < 4; i++) {
          subTimeoutsRef.current.push(setTimeout(() => {
            // Bass + chord strike together
            playSingleNoteWithVisuals(bassLower, beatMs * 0.65, 1.0);
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.65, 0.95));
          }, i * beatMs));
        }

        // Sidechain / offbeat pumping: dynamic sixteenth note high octave bounces
        const bounceTimes = [beatMs * 0.75, beatMs * 1.75, beatMs * 2.75, beatMs * 3.75];
        bounceTimes.forEach((time) => {
          subTimeoutsRef.current.push(setTimeout(() => {
            const highNote = voicing[voicing.length - 1];
            playSingleNoteWithVisuals(highNote, beatMs * 0.3, 0.75);
          }, time));
        });

      } else if (pattern === "rb-trap-soul") {
        const stepMs = durationMs / 16;
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.min(1, octave)}`;
        }

        // Strummed chords on 1 and 3
        subTimeoutsRef.current.push(setTimeout(() => {
          playSingleNoteWithVisuals(bassLower, beatMs * 1.8, 1.0);
          voicing.forEach((n, idx) => {
            setTimeout(() => playSingleNoteWithVisuals(n, beatMs * 1.6, 0.9), idx * 30);
          });
        }, 0));

        subTimeoutsRef.current.push(setTimeout(() => {
          playSingleNoteWithVisuals(bassAlt, beatMs * 1.8, 0.9);
          voicing.forEach((n, idx) => {
            setTimeout(() => playSingleNoteWithVisuals(n, beatMs * 1.6, 0.85), idx * 30);
          });
        }, beatMs * 2));

        if (!isEvenMeasure) {
          // A-Bar: Rapid rolling trap-hat simulated sweep on Beat 4 (16th notes index 12-15)
          const rollTimes = [12, 13, 14, 15];
          rollTimes.forEach((rIndex, idx) => {
            subTimeoutsRef.current.push(setTimeout(() => {
              const note = voicing[idx % voicing.length];
              playSingleNoteWithVisuals(note, stepMs * 0.9, 0.8);
            }, rIndex * stepMs));
          });
        } else {
          // B-Bar: Beautiful double-time rolling arpeggio fill
          const rollTimes = [12, 13.5, 14, 15];
          rollTimes.forEach((rIndex, idx) => {
            subTimeoutsRef.current.push(setTimeout(() => {
              const note = voicing[(voicing.length - 1 - idx) % voicing.length];
              playSingleNoteWithVisuals(note, stepMs * 0.9, 0.85);
            }, rIndex * stepMs));
          });
        }

      } else if (pattern === "flamenco-rumba") {
        // Flamenco / Rumba Catalan: Strumming ventilador simulation
        const stepMs = durationMs / 8;
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.min(1, octave)}`;
        }

        // Root bass strike on beat 1.0 and 3.0
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassLower, beatMs * 0.9, 1.0), 0));
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassAlt, beatMs * 0.9, 0.9), beatMs * 2));

        const strumBlock = (time: number, velocity: number) => {
          voicing.forEach((n, idx) => {
            setTimeout(() => playSingleNoteWithVisuals(n, stepMs * 0.8, velocity), idx * 20);
          });
        };

        // Triplet strumming sweeps on beat 1.5, 2.0, 3.5, 4.0
        subTimeoutsRef.current.push(setTimeout(() => strumBlock(beatMs * 0.5, 0.85), beatMs * 0.5));
        subTimeoutsRef.current.push(setTimeout(() => strumBlock(beatMs * 1.0, 0.95), beatMs * 1.0));
        subTimeoutsRef.current.push(setTimeout(() => strumBlock(beatMs * 2.5, 0.85), beatMs * 2.5));
        subTimeoutsRef.current.push(setTimeout(() => strumBlock(beatMs * 3.0, 1.0), beatMs * 3.0));

        if (isEvenMeasure) {
          // B-Bar: Aggressive flamenco roll response at the end of the bar
          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach((n, idx) => {
              setTimeout(() => playSingleNoteWithVisuals(n, stepMs * 0.5, 1.0), idx * 25);
            });
          }, beatMs * 3.5));
        }
      }

    } else if (mode === "arpeggio") {
      // Modo Arpegios: Premium arpeggiator engine supporting diverse styles
      const beatMs = durationMs / 4;
      const stepMs = durationMs / 8; // 8th note duration

      const bass = notes[0];
      let bassLower = bass;
      const match = bass.match(/^([A-G][#b]?)([0-9])$/i);
      if (match) {
        const noteName = match[1];
        const octave = parseInt(match[2], 10);
        bassLower = `${noteName}${Math.max(1, octave - 1)}`;
      }

      // Helper to shift octaves dynamically
      const getNoteWithOctaveShift = (noteStr: string, shift: number): string => {
        const matchNote = noteStr.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchNote) {
          const name = matchNote[1];
          const octave = parseInt(matchNote[2], 10);
          return `${name}${Math.max(1, Math.min(8, octave + shift))}`;
        }
        return noteStr;
      };

      // 1. Play deep sustaining bass note at t = 0
      const bassTimeout = setTimeout(() => {
        playSingleNoteWithVisuals(bassLower, beatMs * 3.8, 0.95);
      }, 0);
      subTimeoutsRef.current.push(bassTimeout);

      // 2. Select pattern
      const pattern = selectedArpeggioPatternRef.current;
      const voicing = notes.length > 1 ? notes.slice(1) : notes;
      const len = voicing.length;

      if (pattern === "cascade") {
        // Fast 16th-note sweep across octaves (16 steps!)
        const fastStepMs = durationMs / 16;
        const cascadeSequence: string[] = [];

        // Build cascading sequence:
        // Beat 1: Voicing normal (Up)
        for (let i = 0; i < 4; i++) {
          cascadeSequence.push(voicing[i % len]);
        }
        // Beat 2: Voicing shifted 1 octave up (Up)
        for (let i = 0; i < 4; i++) {
          cascadeSequence.push(getNoteWithOctaveShift(voicing[i % len], 1));
        }
        // Beat 3: Voicing shifted 1 octave up (Down)
        for (let i = 0; i < 4; i++) {
          cascadeSequence.push(getNoteWithOctaveShift(voicing[(len - 1 - i) % len] || voicing[0], 1));
        }
        // Beat 4: Voicing normal (Down)
        for (let i = 0; i < 4; i++) {
          cascadeSequence.push(voicing[(len - 1 - i) % len] || voicing[0]);
        }

        cascadeSequence.forEach((noteName, i) => {
          const stepTimeout = setTimeout(() => {
            playSingleNoteWithVisuals(noteName, fastStepMs * 1.15, 0.8);
          }, i * fastStepMs);
          subTimeoutsRef.current.push(stepTimeout);
        });

      } else {
        // Standard 8th-note arpeggiator patterns
        const arpeggioSequence: string[][] = [];

        if (pattern === "up") {
          for (let i = 0; i < 8; i++) {
            arpeggioSequence.push([voicing[i % len]]);
          }
        } else if (pattern === "down") {
          for (let i = 0; i < 8; i++) {
            arpeggioSequence.push([voicing[(len - 1 - i) % len] || voicing[0]]);
          }
        } else if (pattern === "down-up") {
          let dir = -1;
          let idx = len - 1;
          for (let i = 0; i < 8; i++) {
            arpeggioSequence.push([voicing[idx]]);
            idx += dir;
            if (idx === 0) {
              dir = 1;
            } else if (idx === len - 1) {
              dir = -1;
            }
          }
        } else if (pattern === "cross") {
          // Cross spiral arpeggio: Alternates outer and inner notes
          for (let i = 0; i < 8; i++) {
            const step = i % 4;
            if (step === 0) arpeggioSequence.push([voicing[0]]);
            else if (step === 1) arpeggioSequence.push([voicing[len - 1]]);
            else if (step === 2) arpeggioSequence.push([voicing[Math.max(0, Math.min(len - 1, 1))]]);
            else arpeggioSequence.push([voicing[Math.max(0, Math.min(len - 1, len - 2))]]);
          }
        } else if (pattern === "double-strike") {
          // Double note strikes at each arpeggio step
          for (let i = 0; i < 8; i++) {
            const idx1 = i % len;
            const idx2 = (i + 1) % len;
            arpeggioSequence.push([voicing[idx1], voicing[idx2]]);
          }
        } else if (pattern === "random") {
          for (let i = 0; i < 8; i++) {
            const rIndex = Math.floor(Math.random() * len);
            arpeggioSequence.push([voicing[rIndex]]);
          }
        } else {
          // Default: "up-down" Triangle
          let dir = 1;
          let idx = 0;
          for (let i = 0; i < 8; i++) {
            arpeggioSequence.push([voicing[idx]]);
            idx += dir;
            if (idx === len - 1) {
              dir = -1;
            } else if (idx === 0) {
              dir = 1;
            }
          }
        }

        // Schedule standard 8th note steps
        arpeggioSequence.forEach((stepNotes, i) => {
          const stepTimeout = setTimeout(() => {
            stepNotes.forEach(noteName => {
              playSingleNoteWithVisuals(noteName, stepMs * 1.15, 0.8);
            });
          }, i * stepMs);
          subTimeoutsRef.current.push(stepTimeout);
        });
      }
    }
  };

  const getPlayableChords = useCallback((song: SongStructure): PlayableChord[] => {
    const list: PlayableChord[] = [];
    let globalIndex = 0;
    song.sections.forEach((sect) => {
      if (sect.chords && sect.chords.chords) {
        sect.chords.chords.forEach((chord, chordIdx) => {
          list.push({
            chordName: chord.chord,
            notes: chord.pianoNotes || [],
            sectionId: sect.id,
            sectionType: sect.type,
            chordIndexInSection: chordIdx,
            globalIndex: globalIndex++,
          });
        });
      }
    });
    return list;
  }, []);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (playbackWorkerRef.current) {
      playbackWorkerRef.current.postMessage({ action: "stop" });
      playbackWorkerRef.current.terminate();
      playbackWorkerRef.current = null;
    }
    
    // Clear all scheduled rhythmic and arpeggio sub-timeouts
    subTimeoutsRef.current.forEach(clearTimeout);
    subTimeoutsRef.current = [];

    // Clear track note timeouts
    trackTimeoutsRef.current.forEach(clearTimeout);
    trackTimeoutsRef.current = [];

    setPlaybackChordIndex(-1);
    setPlaybackSectionId(null);
    setActivePlaybackNotes([]);
    activePlaybackNotesRef.current = [];

    // Send MIDI Note Off and CC Panic messages to all 16 channels for complete silencing
    if (activeOutputPortRef.current) {
      try {
        const out = activeOutputPortRef.current;
        triggerMidiActivity();

        // 1. Recopilar todas las notas activas o previamente reproducidas y enviar Note Off
        const notesToTurnOff = Array.from(
          new Set([...activeMidiNotesRef.current, ...previouslyPlayedMidiNotesRef.current])
        );

        notesToTurnOff.forEach((midiNum) => {
          for (let ch = 0; ch < 16; ch++) {
            out.send([0x80 | ch, midiNum, 0x00]); // Note Off en todos los canales
          }
        });

        // 2. Enviar CC All Notes Off (CC 123) y All Sound Off (CC 120) a todos los canales
        for (let ch = 0; ch < 16; ch++) {
          out.send([0xB0 | ch, 123, 0]);
          out.send([0xB0 | ch, 120, 0]);
        }
      } catch (e) {
        console.warn("Error enviando apagado completo de MIDI:", e);
      }
      activeMidiNotesRef.current = [];
      previouslyPlayedMidiNotesRef.current = [];
    }
  }, []);

  const startPlayback = useCallback(() => {
    if (!activeSong) return;
    
    const playableChords = getPlayableChords(activeSong);
    if (playableChords.length === 0) {
      toast.error("No hay acordes generados en esta canción para reproducir.");
      return;
    }

    getAudioContext();

    setIsPlaying(true);
    isPlayingRef.current = true;

    // Clear all previously scheduled timeouts
    subTimeoutsRef.current.forEach(clearTimeout);
    subTimeoutsRef.current = [];
    trackTimeoutsRef.current.forEach(clearTimeout);
    trackTimeoutsRef.current = [];

    // Initialize Web Worker metronome for background playback
    if (playbackWorkerRef.current) {
      playbackWorkerRef.current.terminate();
    }
    try {
      const blobCode = `
        let timerId = null;
        self.onmessage = function(e) {
          if (e.data.action === "start") {
            if (timerId) clearTimeout(timerId);
            timerId = setTimeout(() => {
              self.postMessage("tick");
            }, e.data.delay);
          } else if (e.data.action === "stop") {
            if (timerId) {
              clearTimeout(timerId);
              timerId = null;
            }
          }
        };
      `;
      const blob = new Blob([blobCode], { type: "text/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      playbackWorkerRef.current = new Worker(workerUrl);
    } catch (err) {
      console.warn("Could not instantiate Web Worker for playback, falling back to standard setTimeout.", err);
      playbackWorkerRef.current = null;
    }

    // Start from active chord if possible, else from beginning
    let startIdx = 0;
    if (activeSectionId && playbackChordIndex >= 0) {
      const foundIdx = playableChords.findIndex(
        c => c.sectionId === activeSectionId && c.chordIndexInSection === playbackChordIndex
      );
      if (foundIdx !== -1) {
        startIdx = foundIdx;
      }
    }

    const runPlaybackStep = (currentIdx: number) => {
      if (!isPlayingRef.current) return;

      const chord = playableChords[currentIdx];
      if (!chord) {
        const currentLoop = loopModeRef.current;
        if (currentLoop === "song") {
          runPlaybackStep(0);
        } else {
          stopPlayback();
          toast.info("Fin de la reproducción de la canción.");
        }
        return;
      }

      // Update UI states
      setPlaybackSectionId(chord.sectionId);
      setPlaybackChordIndex(chord.chordIndexInSection);
      setActiveSectionId(chord.sectionId);
      
      const currentBpm = playbackBpmRef.current;
      const beatDurationSec = 60 / currentBpm;
      const chordDurationMs = beatDurationSec * 4 * 1000; // 4 beats per chord
      const startTimeMs = performance.now();
      
      // Determine if any track is soloed
      const anySoloed = activeSongRef.current?.tracks?.some(t => t.soloed === true) || false;
      
      // Chords play only if there is no track soloed (or if they are un-soloed they are muted, just like standard DAW)
      if (!anySoloed) {
        playChordNotes(chord.notes, chordDurationMs, chord.globalIndex, startTimeMs);
      }

      // Reproducir pistas melódicas/instrumentales en paralelo (Soporte Global de Canción y Fallback de Sección)
      if (activeSongRef.current) {
        const currentChordStart = chord.chordIndexInSection * 4;
        const currentChordEnd = currentChordStart + 4;

        if (chord.chordIndexInSection === 0 || currentIdx === startIdx) {
          // Clear previous section track notes timeouts to prevent overlapping/leakage
          trackTimeoutsRef.current.forEach(clearTimeout);
          trackTimeoutsRef.current = [];
        }

        // 1. Play global song-level tracks
        if (activeSongRef.current.tracks && activeSongRef.current.tracks.length > 0) {
          activeSongRef.current.tracks.forEach((track) => {
            const isMuted = track.muted === true;
            const isSoloed = track.soloed === true;
            const shouldPlay = !isMuted && (!anySoloed || isSoloed);

            if (!shouldPlay) return;

            const notesForSection = track.sectionNotes?.[chord.sectionId];
            if (notesForSection && notesForSection.length > 0) {
              const trackVolume = track.volume !== undefined ? track.volume : 0.7;

              notesForSection.forEach((noteObj) => {
                if (noteObj.startBeat >= currentChordStart && noteObj.startBeat < currentChordEnd) {
                  const startDelayMs = (noteObj.startBeat - currentChordStart) * beatDurationSec * 1000;
                  const noteDurationMs = noteObj.durationBeats * beatDurationSec * 1000;
                  
                  playTrackSingleNote(
                    noteObj.note,
                    noteDurationMs,
                    noteObj.velocity * trackVolume,
                    track.midiChannel,
                    "grand-piano",
                    startTimeMs + startDelayMs
                  );
                }
              });
            }
          });
        }

        // 2. Fallback: Play legacy section-level tracks
        const currentSection = activeSongRef.current.sections.find(s => s.id === chord.sectionId);
        if (currentSection && currentSection.tracks && currentSection.tracks.length > 0) {
          const anySectionSoloed = currentSection.tracks.some(t => t.soloed === true);
          currentSection.tracks.forEach((track) => {
            const isMuted = track.muted === true;
            const isSoloed = track.soloed === true;
            const shouldPlay = !isMuted && (!anySectionSoloed || isSoloed);

            if (!shouldPlay) return;

            if (track.notes && track.notes.length > 0) {
              const trackVolume = track.volume !== undefined ? track.volume : 0.7;

              track.notes.forEach((noteObj) => {
                if (noteObj.startBeat >= currentChordStart && noteObj.startBeat < currentChordEnd) {
                  const startDelayMs = (noteObj.startBeat - currentChordStart) * beatDurationSec * 1000;
                  const noteDurationMs = noteObj.durationBeats * beatDurationSec * 1000;
                  
                  playTrackSingleNote(
                    noteObj.note,
                    noteDurationMs,
                    noteObj.velocity * trackVolume,
                    track.midiChannel,
                    track.instrumentPreset || "grand-piano",
                    startTimeMs + startDelayMs
                  );
                }
              });
            }
          });
        }
      }

      // Handling is fully automated within playChordNotes, which takes care of scheduling,
      // AudioContext triggers, active visual piano keys, and external MIDI output!

      // Schedule next step
      const nextIdx = currentIdx + 1;
      let targetNextIdx = nextIdx;

      // Handle Section Looping
      const currentLoop = loopModeRef.current;
      if (currentLoop === "section") {
        const sectionChords = playableChords.filter(c => c.sectionId === chord.sectionId);
        const lastSectionChord = sectionChords[sectionChords.length - 1];
        if (chord.globalIndex === lastSectionChord.globalIndex) {
          const firstSectionChord = sectionChords[0];
          targetNextIdx = firstSectionChord.globalIndex;
        }
      }

      if (playbackWorkerRef.current) {
        playbackWorkerRef.current.onmessage = () => {
          runPlaybackStep(targetNextIdx);
        };
        playbackWorkerRef.current.postMessage({ action: "start", delay: chordDurationMs });
      } else {
        playbackTimerRef.current = setTimeout(() => {
          runPlaybackStep(targetNextIdx);
        }, chordDurationMs);
      }
    };

    runPlaybackStep(startIdx);
  }, [activeSong, activeSectionId, playbackChordIndex, getPlayableChords, stopPlayback]);

  // Handle Play/Pause toggle
  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  // Ref to always read the latest activeSong (avoids stale closure in save handler)
  const activeSongRef = useRef<SongStructure | null>(null);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>("estudio");

  // Database States
  const [savedSongs, setSavedSongs] = useState<SongStructure[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);

  // Section Progress States
  const [generatingSectionIds, setGeneratingSectionIds] = useState<Record<string, boolean>>({});

  // Sinfonía AI Track Composer states
  const [isTrackComposerOpen, setIsTrackComposerOpen] = useState(false);
  const [composerSectionId, setComposerSectionId] = useState<string>("");
  const [composerTrackName, setComposerTrackName] = useState<string>("Voz Principal");
  const [composerMidiChannel, setComposerMidiChannel] = useState<number>(2);
  const [composerInstrumentPreset, setComposerInstrumentPreset] = useState<string>("grand-piano");
  const [composerUserPrompt, setComposerUserPrompt] = useState<string>("");

  // Sinfonía AI Modular Section Regeneration states
  const [isSectionRegenOpen, setIsSectionRegenOpen] = useState(false);
  const [regenTrackId, setRegenTrackId] = useState<string>("");
  const [regenSectionId, setRegenSectionId] = useState<string>("");
  const [regenUserPrompt, setRegenUserPrompt] = useState<string>("");

  // Helper to automatically background-save song changes to DB
  const saveSongBackground = async (updatedSong: SongStructure) => {
    if (!updatedSong.id) return;
    try {
      await saveSongAction(updatedSong);
    } catch (e) {
      console.warn("Background auto-save failed:", e);
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
      const occupiedTrack = activeSong.tracks?.find(t => t.midiChannel === channel && t.id !== trackId);
      if (occupiedTrack) {
        toast.info(`El Canal ${channel} ya estaba ocupado por la pista "${occupiedTrack.name}". Ha sido sobrescrita.`);
      }
      
      const filteredTracks = (activeSong.tracks || []).filter(t => t.id === trackId || t.midiChannel !== channel);
      const updated = {
        ...activeSong,
        tracks: filteredTracks.map(t => t.id === trackId ? { ...t, midiChannel: channel } : t)
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

  const handleGenerateTrack = async () => {
    if (!activeSong) return;
    
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
      name: composerTrackName,
      midiChannel: composerMidiChannel,
      instrumentPreset: composerInstrumentPreset,
      volume: 0.7,
      prompts: {},
      sectionNotes: {},
      isGenerating: true,
      progress: 0
    };

    const occupiedTrack = activeSong.tracks?.find(t => t.midiChannel === composerMidiChannel);
    if (occupiedTrack) {
      toast.info(`El Canal ${composerMidiChannel} ya estaba ocupado por la pista "${occupiedTrack.name}". Ha sido sobrescrita.`);
    }

    // Immediately insert the pending track into activeSong state to trigger visual placeholder cards, overwriting any track occupying this channel
    setActiveSong(prev => {
      if (!prev) return prev;
      const cleanTracks = (prev.tracks || []).filter(t => t.midiChannel !== composerMidiChannel);
      return {
        ...prev,
        tracks: [...cleanTracks, pendingTrack]
      };
    });

    const toastId = `track-gen-${trackId}`;
    toast.loading(`Sinfonía AI componiendo pista "${composerTrackName}"...`, { id: toastId });

    try {
      let completedCount = 0;
      const totalCount = sectionsWithChords.length;
      
      const promises = sectionsWithChords.map(async (sect, index) => {
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

        try {
          const res = await generateSectionTrackAction({
            songTitle: activeSong.title,
            sectionType: sect.type,
            sectionKey: sect.key,
            sectionScale: sect.scale,
            chordsList,
            trackName: composerTrackName,
            midiChannel: composerMidiChannel,
            userPrompt: composerUserPrompt || `Arreglo instrumental para ${composerTrackName}`,
            previousSectionType: prevSect?.type,
            previousChordsList,
            nextSectionType: nextSect?.type,
            nextChordsList
          });

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

          if (res.success && res.data?.notes && res.data.notes.length > 0) {
            return { sectionId: sect.id, success: true, notes: res.data.notes };
          }
          return { sectionId: sect.id, success: false };
        } catch (sectErr) {
          console.error(`Error generating notes for section ${sect.type}:`, sectErr);
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
          return { sectionId: sect.id, success: false };
        }
      });

      const results = await Promise.all(promises);

      const newSectionNotes: Record<string, any> = {};
      const newPrompts: Record<string, string> = {};

      results.forEach(r => {
        if (r.success && r.notes) {
          newSectionNotes[r.sectionId] = r.notes;
          newPrompts[r.sectionId] = composerUserPrompt;
        }
      });

      toast.dismiss(toastId);

      const generatedSectionsCount = Object.keys(newSectionNotes).length;

      if (generatedSectionsCount > 0) {
        // Complete the track: remove isGenerating flag and save final section notes
        const currentSong = activeSongRef.current ?? activeSong;
        if (currentSong) {
          const updated = {
            ...currentSong,
            tracks: (currentSong.tracks || []).map(t => 
              t.id === trackId 
                ? { 
                    ...t, 
                    isGenerating: false, 
                    progress: 100, 
                    sectionNotes: newSectionNotes, 
                    prompts: newPrompts 
                  } 
                : t
            )
          };
          setActiveSong(updated);
          activeSongRef.current = updated;
          saveSongBackground(updated);
        }
        toast.success(`¡Pista global "${composerTrackName}" generada exitosamente (${generatedSectionsCount} secciones compuestas)!`);
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
      console.error("Track generation error:", err);
      toast.dismiss(toastId);
      // Remove track on error
      setActiveSong(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tracks: prev.tracks?.filter(t => t.id !== trackId)
        };
      });
      toast.error("Fallo inesperado al generar el arreglo melódico.");
    } finally {
      setComposerUserPrompt("");
    }
  };

  const handleRegenerateTrackSection = async (trackId: string, sectionId: string, customPrompt: string) => {
    if (!activeSong) return;
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
        nextChordsList
      });

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
      console.error("Section track regeneration error:", err);
      toast.dismiss("sec-regen-toast");
      toast.error("Fallo inesperado al regenerar la sección.");
    } finally {
      setGeneratingSectionIds(prev => ({ ...prev, [sectionId]: false }));
    }
  };

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SongInput>({
    resolver: zodResolver(songInputSchema),
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
  const generateSectionChords = async (section: SongSection, tempoVal: number, songTitle: string) => {
    setGeneratingSectionIds(prev => ({ ...prev, [section.id]: true }));
    try {
      const result = await generateChordProgressionAction({
        prompt: `${section.prompt}. Sección: ${section.type} de la canción ${songTitle}`,
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

  // Helper to load song settings and sync React states/refs
  const applyLoadedSong = (song: SongStructure) => {
    const songWithTracks = {
      ...song,
      tracks: song.tracks || []
    };

    // 1. Sync states first to avoid automatic overwrite by useEffect
    if (song.tempo) {
      setPlaybackBpm(song.tempo);
      playbackBpmRef.current = song.tempo;
    }
    if (song.playbackMode) {
      setPlaybackMode(song.playbackMode as any);
      playbackModeRef.current = song.playbackMode as any;
    } else {
      setPlaybackMode("basic");
      playbackModeRef.current = "basic";
    }
    if (song.selectedRhythmPattern) {
      setSelectedRhythmPattern(song.selectedRhythmPattern);
      selectedRhythmPatternRef.current = song.selectedRhythmPattern;
    } else {
      setSelectedRhythmPattern("pop-ballad");
      selectedRhythmPatternRef.current = "pop-ballad";
    }
    if (song.selectedArpeggioPattern) {
      setSelectedArpeggioPattern(song.selectedArpeggioPattern);
      selectedArpeggioPatternRef.current = song.selectedArpeggioPattern;
    } else {
      setSelectedArpeggioPattern("up-down");
      selectedArpeggioPatternRef.current = "up-down";
    }
    if (song.playbackVolume !== undefined) {
      setPlaybackVolume(song.playbackVolume);
      playbackVolumeRef.current = song.playbackVolume;
    } else {
      setPlaybackVolume(0.7);
      playbackVolumeRef.current = 0.7;
    }
    if (song.customRhythmSteps) {
      setCustomRhythmSteps(song.customRhythmSteps);
      customRhythmStepsRef.current = song.customRhythmSteps;
    } else {
      const defaultSteps = Array(5).fill(null).map(() => Array(16).fill(false));
      setCustomRhythmSteps(defaultSteps);
      customRhythmStepsRef.current = defaultSteps;
    }
    if (song.loopMode) {
      setLoopMode(song.loopMode as any);
      loopModeRef.current = song.loopMode as any;
    } else {
      setLoopMode("off");
      loopModeRef.current = "off";
    }

    // 2. Set activeSong state and ref
    setActiveSong(songWithTracks);
    activeSongRef.current = songWithTracks;
  };

  // Submit form: Generate Song Blueprint and compile sections
  const onSubmit = async (data: SongInput) => {
    setLoading(true);
    setSongGenProgress(5);
    setSongGenStatus("Analizando estilo musical y diseñando plano estructurado...");
    setActiveSong(null);
    setActiveSectionId(null);
    setActiveTab("estudio");
    try {
      const res = await generateSongBlueprintAction(data);
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

        // Sequentially generate chords for each section, supporting clones & variations
        for (const sect of newSong.sections) {
          index++;
          const sectionProgress = 20 + Math.round((index / totalSections) * 75);
          setSongGenProgress(sectionProgress);
          setSongGenStatus(`Armonizando y componiendo progresiones para: ${sect.type}...`);

          // 1. Check for clones (reusedFrom)
          if (sect.reusedFrom) {
            const sourceChords = generatedSectionsMap.get(sect.reusedFrom);
            if (sourceChords) {
              setActiveSong(prev => {
                if (!prev) return null;
                const updatedSections = prev.sections.map(s => {
                  if (s.id === sect.id) {
                    return { ...s, chords: sourceChords };
                  }
                  return s;
                });
                return { ...prev, sections: updatedSections };
              });
              toast.success(`¡Sección ${sect.type} clonada exactamente de ${sect.reusedFrom}!`);
              generatedSectionsMap.set(sect.type, sourceChords);
              continue;
            }
          }

          // 2. Check for variations (variationOf)
          if (sect.variationOf) {
            const baseChords = generatedSectionsMap.get(sect.variationOf);
            if (baseChords) {
              setGeneratingSectionIds(prev => ({ ...prev, [sect.id]: true }));
              try {
                const baseChordsStr = baseChords.chords.map((c: any) => `${c.chord} (${c.role})`).join(", ");
                const result = await generateChordProgressionAction({
                  prompt: `Variación armónica de la progresión previa [${baseChordsStr}]. Variación deseada: ${sect.prompt}. Sección: ${sect.type} de la canción ${newSong.title}`,
                  key: sect.key,
                  scale: sect.scale,
                  tempo: String(newSong.tempo),
                  chordCount: sect.chordCount
                });

                if (result.success && result.data) {
                  setActiveSong(prev => {
                    if (!prev) return null;
                    const updatedSections = prev.sections.map(s => {
                      if (s.id === sect.id) {
                        return { ...s, chords: result.data };
                      }
                      return s;
                    });
                    return { ...prev, sections: updatedSections };
                  });
                  generatedSectionsMap.set(sect.type, result.data);
                  toast.success(`¡Sección ${sect.type} (variación de ${sect.variationOf}) generada!`);
                  continue;
                }
              } catch (err) {
                console.error("Error generating section variation, falling back to normal:", err);
              } finally {
                setGeneratingSectionIds(prev => ({ ...prev, [sect.id]: false }));
              }
            }
          }

          // 3. Normal generation
          const chords = await generateSectionChords(sect, newSong.tempo, newSong.title);
          if (chords) {
            generatedSectionsMap.set(sect.type, chords);
          }
        }

        setSongGenProgress(100);
        setSongGenStatus("¡Composición finalizada! Sincronizando mezclador multipista...");
        toast.success("¡Canción completa generada!");
        setIsComposerOpen(false);
      } else {
        toast.error(res.error || "Fallo al crear estructura de canción.");
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Ocurrió un error inesperado al componer.");
    } finally {
      setLoading(false);
      setSongGenProgress(0);
      setSongGenStatus("");
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

  // Export JSON File Project
  const handleExportJson = () => {
    if (!activeSong) return;
    const blob = new Blob([JSON.stringify(activeSong, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `musiclab_song_${activeSong.title.toLowerCase().replace(/\s+/g, "_")}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("¡Proyecto de canción exportado en JSON!");
  };

  // Trigger individual section regeneration
  const handleRegenerateSection = async (section: SongSection) => {
    if (!activeSong) return;
    toast.loading(`Regenerando sección ${section.type}...`, { id: "regen-toast" });
    await generateSectionChords(section, activeSong.tempo, activeSong.title);
    toast.dismiss("regen-toast");
  };

  const selectedSection = activeSong?.sections.find(s => s.id === activeSectionId);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      {/* DAW Root Tabs Navigation Wrapper */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Top Title & DAW Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <ListMusic className="w-8 h-8 text-primary" />
              Organizador de Canciones Inteligente
            </h2>
            <p className="text-muted-foreground text-sm">
              Estructura canciones completas con generación de progresiones aisladas por secciones y guardado en base de datos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-shrink-0">
            {/* Unified DAW Control Toolbar */}
            <div className="flex items-center gap-3 bg-muted/20 p-1.5 rounded-2xl border border-border/30 backdrop-blur-sm shadow-sm">
              {/* Mode Selector Stepper Tabs */}
              <TabsList className="bg-transparent p-0 border-0 h-auto space-x-1 flex items-center">
                <TabsTrigger 
                  value="estudio" 
                  className="rounded-xl text-xs font-black px-3.5 py-1.5 h-8 flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <Music className="w-3.5 h-3.5 text-primary" />
                  Mesa de Composición
                </TabsTrigger>
                <TabsTrigger 
                  value="biblioteca" 
                  className="rounded-xl text-xs font-black px-3.5 py-1.5 h-8 flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-primary" />
                  Biblioteca ({savedSongs.length})
                </TabsTrigger>
              </TabsList>

              {/* Vertical DAW Separator */}
              <div className="h-5 w-[1px] bg-border/60 mx-1 flex-shrink-0" />

              {/* Action Buttons Group */}
              <div className="flex items-center gap-1.5">
                {/* Primary IA Composer Button */}
                <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-xl h-8 px-3.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.01]">
                      <Sparkles className="w-3.5 h-3.5 text-primary-foreground animate-pulse" />
                      Componer con IA
                    </Button>
                  </DialogTrigger>
                  
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
                              Por favor no cierres este diálogo. La orquestación IA tarda entre 15 y 30 segundos.
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

                {/* Operations Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-xl h-8 px-2.5 text-xs font-bold border-border bg-background hover:bg-muted/50 flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-primary" />
                      Proyecto
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl border-border bg-card/95 backdrop-blur-md shadow-lg w-52 p-1.5 space-y-0.5">
                    <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2.5 py-1.5">
                      Operaciones
                    </DropdownMenuLabel>
                    
                    <DropdownMenuItem 
                      disabled={!activeSong || isSaving}
                      onClick={handleSaveSong}
                      className="rounded-lg text-xs font-medium px-2.5 py-2 flex items-center gap-2 hover:bg-muted cursor-pointer transition-colors duration-150"
                    >
                      <Save className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isSaving ? "Guardando..." : "Guardar en DB"}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      disabled={!activeSong}
                      onClick={handleExportJson}
                      className="rounded-lg text-xs font-medium px-2.5 py-2 flex items-center gap-2 hover:bg-muted cursor-pointer transition-colors duration-150"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-500" />
                      <span>Exportar como JSON</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-border/40" />

                    <DropdownMenuItem 
                      onClick={() => {
                        document.getElementById("dropdown-import-song-file")?.click();
                      }}
                      className="rounded-lg text-xs font-medium px-2.5 py-2 flex items-center gap-2 hover:bg-muted cursor-pointer transition-colors duration-150"
                    >
                      <Upload className="w-3.5 h-3.5 text-purple-500" />
                      <span>Importar Proyecto JSON</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Hidden file input for dropdown import */}
            <input 
              type="file" 
              id="dropdown-import-song-file" 
              accept=".json" 
              className="hidden" 
              onChange={(e) => {
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
              }} 
            />
          </div>
        </div>

        {/* Tab 1: Studio Composer Workbench */}
        <TabsContent value="estudio" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
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

                  {/* Studio DAW MIDI Playback Control Panel */}
                  <PlaybackControls
                    isPlaying={isPlaying}
                    playbackSectionId={playbackSectionId}
                    playbackChordIndex={playbackChordIndex}
                    activePlaybackNotes={activePlaybackNotes}
                    togglePlayback={togglePlayback}
                    stopPlayback={stopPlayback}
                    playbackMode={playbackMode}
                    setPlaybackMode={setPlaybackMode}
                    selectedRhythmPattern={selectedRhythmPattern}
                    setSelectedRhythmPattern={setSelectedRhythmPattern}
                    selectedArpeggioPattern={selectedArpeggioPattern}
                    setSelectedArpeggioPattern={setSelectedArpeggioPattern}
                    savedRhythms={savedRhythms}
                    isMidiSupported={isMidiSupported}
                    midiOutputs={midiOutputs}
                    selectedOutputId={selectedOutputId}
                    setSelectedOutputId={setSelectedOutputId}
                    midiChannel={midiChannel}
                    setMidiChannel={setMidiChannel}
                    midiActivity={midiActivity}
                    playbackVolume={playbackVolume}
                    setPlaybackVolume={setPlaybackVolume}
                    playbackBpm={playbackBpm}
                    setPlaybackBpm={setPlaybackBpm}
                    loopMode={loopMode}
                    setLoopMode={setLoopMode}
                    onOpenTrackComposer={() => {
                      if (activeSectionId) {
                        setComposerSectionId(activeSectionId);
                      }
                      setIsTrackComposerOpen(true);
                    }}
                  />

                  {/* Mezclador Multicanal de Pistas Globales de la Canción (Sinfonía AI) */}
                  {activeSong.tracks && activeSong.tracks.length > 0 && (
                    <div className="w-full bg-card/40 border border-border/40 rounded-3xl p-5 space-y-4 shadow-xl backdrop-blur-md">
                      <div className="flex items-center justify-between pb-3 border-b border-border/30">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                            Mezclador de Pistas Sinfonía AI
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-[9px] font-bold text-purple-400">
                            {activeSong.tracks.length} {activeSong.tracks.length === 1 ? 'Pista' : 'Pistas'} Activas
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Las pistas suenan en paralelo sincronizadas por sección sobre sus canales MIDI
                        </div>
                      </div>

                      <div className="space-y-3">
                        {activeSong.tracks.map((track) => {
                          if (track.isGenerating) {
                            return (
                              <div
                                key={track.id}
                                className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 transition-all duration-300 relative overflow-hidden"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-purple-500/5 pointer-events-none" />
                                
                                <div className="flex items-center gap-2.5 min-w-[200px]">
                                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                                    <span className="w-4 h-4 block border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-foreground flex items-center gap-2">
                                      {track.name}
                                    </h4>
                                    <div className="text-[9px] text-purple-400 font-bold mt-0.5 animate-pulse">
                                      Componiendo pista con IA...
                                    </div>
                                  </div>
                                </div>

                                <div className="flex-grow flex flex-col justify-center gap-1.5 min-w-[200px]">
                                  <div className="flex items-center justify-between text-[9px] font-black text-purple-400 uppercase tracking-wider">
                                    <span>Progreso de Composición AI</span>
                                    <span className="font-mono">{track.progress || 0}%</span>
                                  </div>
                                  <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden border border-border/30">
                                    <div 
                                      className="bg-gradient-to-r from-purple-600 to-indigo-500 h-full transition-all duration-300 rounded-full"
                                      style={{ width: `${track.progress || 0}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="text-[10px] text-muted-foreground/80 lg:text-right font-medium italic min-w-[150px]">
                                  Sincronizando secciones...
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
                              className={`flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-2xl border transition-all duration-300 relative group overflow-hidden ${
                                isSilent
                                  ? "bg-muted/10 border-border/20 opacity-55 hover:opacity-75"
                                  : "bg-muted/30 border-border/30 hover:border-purple-500/20"
                              }`}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                              {/* Track Name & Identification */}
                              <div className="flex items-center justify-between lg:justify-start gap-3 min-w-[200px]">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                    <Music className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-foreground">
                                      {track.name}
                                    </h4>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[9px] text-muted-foreground font-semibold">
                                        Completado:
                                      </span>
                                      <span className="text-[9px] text-purple-400 font-bold">
                                        {sectionsCount}/{totalSections} secciones
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  onClick={() => handleDeleteTrack(null, track.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>

                              {/* Mixer Controls (MIDI Channel & Volume Slider) */}
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-grow">
                                {/* MIDI Channel Selector */}
                                <div className="space-y-1 min-w-[120px]">
                                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">
                                    Canal MIDI
                                  </label>
                                  <select
                                    value={track.midiChannel}
                                    onChange={(e) => handleUpdateTrackChannel(null, track.id, Number(e.target.value))}
                                    className="w-full rounded-xl border border-border/50 bg-card hover:bg-muted text-foreground h-9 px-3 text-[11px] font-bold focus:outline-none transition-colors cursor-pointer"
                                  >
                                    {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                                      <option key={ch} value={ch}>
                                        Canal {ch}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Mute & Solo Buttons */}
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">
                                    Mezcla
                                  </label>
                                  <div className="flex items-center gap-1.5 h-9">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTrackMute(null, track.id)}
                                      className={`w-9 h-9 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center border select-none ${
                                        track.muted
                                          ? "bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30 hover:text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                                          : "bg-background/50 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                      }`}
                                      title="Silenciar Pista (Mute)"
                                    >
                                      M
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTrackSolo(null, track.id)}
                                      className={`w-9 h-9 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center border select-none ${
                                        track.soloed
                                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30 hover:text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                                          : "bg-background/50 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                      }`}
                                      title="Solo Pista (Solo)"
                                    >
                                      S
                                    </button>
                                  </div>
                                </div>

                                {/* Volume Slider */}
                                <div className="space-y-1 flex-grow">
                                  <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                                    <span>Volumen de Salida</span>
                                    <span className="text-purple-400 font-bold">
                                      {Math.round((track.volume !== undefined ? track.volume : 0.7) * 100)}%
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 h-9">
                                    <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                                    <input
                                      type="range"
                                      min="0.0"
                                      max="1.0"
                                      step="0.05"
                                      value={track.volume !== undefined ? track.volume : 0.7}
                                      onChange={(e) => handleUpdateTrackVolume(null, track.id, Number(e.target.value))}
                                      className="w-full accent-purple-500 h-1 bg-muted rounded-lg cursor-pointer transition-all focus:outline-none"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Sections Orchestrator (Modular IA Generation pills) */}
                              <div className="flex flex-col gap-1 min-w-[280px]">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">
                                  Componer / Regenerar Secciones
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5 py-1">
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
                                          setRegenUserPrompt(track.prompts?.[sect.id] || "");
                                          setIsSectionRegenOpen(true);
                                        }}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border duration-200 cursor-pointer ${
                                          hasNotes
                                            ? "bg-purple-500/10 border-purple-500/40 text-purple-400 shadow-sm hover:bg-purple-500/20 hover:border-purple-400"
                                            : "bg-muted/35 border-dashed border-border/80 text-muted-foreground hover:bg-muted/70 hover:border-muted-foreground/30"
                                        } disabled:opacity-50`}
                                      >
                                        {isGenerating ? (
                                          <span className="w-2.5 h-2.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-1" />
                                        ) : hasNotes ? (
                                          <Check className="w-3 h-3 text-purple-400" />
                                        ) : (
                                          <Sparkles className="w-2.5 h-2.5 text-muted-foreground/70" />
                                        )}
                                        {sect.type}
                                        {hasNotes && (
                                          <span className="text-[8px] opacity-75 font-semibold">
                                            ({notesList.length})
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Creador de Ritmos Personalizados (Sequenciador de 16 Pasos) */}
                  <RhythmSequencer
                    playbackMode={playbackMode}
                    selectedRhythmPattern={selectedRhythmPattern}
                    customRhythmSteps={customRhythmSteps}
                    toggleStepNote={toggleStepNote}
                    loadPopGrooveTemplate={loadPopGrooveTemplate}
                    fillFourOnFloorChords={fillFourOnFloorChords}
                    clearCustomSteps={clearCustomSteps}
                    newRhythmName={newRhythmName}
                    setNewRhythmName={setNewRhythmName}
                    saveCustomRhythm={saveCustomRhythm}
                    savedRhythms={savedRhythms}
                    setCustomRhythmSteps={setCustomRhythmSteps}
                    setSelectedRhythmPattern={setSelectedRhythmPattern}
                    deleteCustomRhythm={deleteCustomRhythm}
                  />

                  <ArrangementTimeline
                    activeSong={activeSong}
                    activeSectionId={activeSectionId}
                    setActiveSectionId={setActiveSectionId}
                    generatingSectionIds={generatingSectionIds}
                    handleRegenerateSection={handleRegenerateSection}
                    loading={loading}
                  />

                  {selectedSection && (
                    <SectionChordEditor
                      selectedSection={selectedSection}
                      generatingSectionIds={generatingSectionIds}
                      getRoleColor={getRoleColor}
                    />
                  )}
                </div>
              )}
          </div>
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
      </Tabs>

      {/* AI Track Composer Modal Dialog */}
      <Dialog open={isTrackComposerOpen} onOpenChange={setIsTrackComposerOpen}>
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
              onClick={() => setIsTrackComposerOpen(false)}
              className="rounded-xl h-10 text-xs font-bold text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGenerateTrack}
              disabled={!composerUserPrompt.trim()}
              className="rounded-xl h-10 px-5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-950/20 flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              Generar Pista Completa con IA
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Section Melody Regeneration Modal Dialog */}
      <Dialog open={isSectionRegenOpen} onOpenChange={setIsSectionRegenOpen}>
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

          {activeSong && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/40 border border-border/30 rounded-2xl space-y-1">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Pista Activa</div>
                <div className="text-xs font-black text-foreground">
                  {activeSong.tracks?.find(t => t.id === regenTrackId)?.name} (Canal MIDI {activeSong.tracks?.find(t => t.id === regenTrackId)?.midiChannel})
                </div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground mt-2">Sección a Componer</div>
                <div className="text-xs font-black text-purple-400 flex items-center gap-1.5">
                  <span>{activeSong.sections.find(s => s.id === regenSectionId)?.type}</span>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    ({activeSong.sections.find(s => s.id === regenSectionId)?.key} {activeSong.sections.find(s => s.id === regenSectionId)?.scale})
                  </span>
                </div>
              </div>

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
                  onClick={() => setIsSectionRegenOpen(false)}
                  className="rounded-xl text-xs font-semibold px-4 cursor-pointer hover:bg-muted"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    setIsSectionRegenOpen(false);
                    await handleRegenerateTrackSection(regenTrackId, regenSectionId, regenUserPrompt);
                  }}
                  className="rounded-xl text-xs font-black px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white cursor-pointer shadow-lg hover:shadow-purple-500/20"
                >
                  Generar con AI
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
