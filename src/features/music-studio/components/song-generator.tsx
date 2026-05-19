"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  songInputSchema, 
  SongInput, 
  SongBlueprint, 
  SongStructure,
  SongSection
} from "../schemas/song-generator.schema";
import { 
  generateSongBlueprintAction, 
  saveSongAction, 
  loadUserSongsAction, 
  deleteSongAction 
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
  Music, 
  Sparkles, 
  Copy, 
  Check, 
  AlertCircle, 
  Compass, 
  Activity, 
  BookOpen, 
  ChevronRight, 
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

export function SongGenerator() {
  const [loading, setLoading] = useState(false);
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

  // Set default BPM when a song is loaded
  useEffect(() => {
    if (activeSong?.tempo) {
      setPlaybackBpm(activeSong.tempo);
    }
  }, [activeSong]);

  // Clean up playback on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
      }
      subTimeoutsRef.current.forEach(clearTimeout);
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

  const playSingleNote = (noteName: string, durationMs: number, velocity: number = 1.0) => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const durationSec = durationMs / 1000;

      // Note Gain for Velocity Scaling
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(velocity, now);

      // Initialize or get the global master gain node for real-time volume adjustment
      if (!globalGainNodeRef.current) {
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(playbackVolumeRef.current, now);
        gain.connect(ctx.destination);
        globalGainNodeRef.current = gain;
      }
      masterGain.connect(globalGainNodeRef.current);

      const currentPreset = playbackPresetRef.current;
      const freq = noteToFreq(noteName);
      if (!freq || isNaN(freq)) return;

      // Send to external MIDI if configured
      if (activeOutputPortRef.current) {
        try {
          const out = activeOutputPortRef.current;
          triggerMidiActivity();
          const midiNum = noteToMidi(noteName);
          const channelIdx = midiChannelRef.current - 1; // 0 to 15
          
          // Scale Note On velocity by both note velocity and master volume (standard 0-127)
          const scaledVelocity = Math.round(velocity * playbackVolumeRef.current * 127);
          const finalVelocity = Math.min(127, Math.max(0, scaledVelocity));
          
          out.send([0x90 | channelIdx, midiNum, finalVelocity]); // Note On
          
          if (!activeMidiNotesRef.current.includes(midiNum)) {
            activeMidiNotesRef.current.push(midiNum);
          }

          // Schedule Note Off
          const offTimeout = setTimeout(() => {
            try {
              out.send([0x80 | channelIdx, midiNum, 0x00]); // Note Off
              activeMidiNotesRef.current = activeMidiNotesRef.current.filter(n => n !== midiNum);
            } catch (e) {
              console.warn("MIDI Note Off send error:", e);
            }
          }, durationMs);
          subTimeoutsRef.current.push(offTimeout);
        } catch (midiErr) {
          console.warn("MIDI Output send error:", midiErr);
        }
        
        // CRITICAL: When MIDI output is selected, mute the internal web synthesizer
        return;
      }

      if (currentPreset === "grand-piano") {
        // Acoustic Grand Piano preset
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(freq, now);

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(freq, now);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2200, now);
        filter.frequency.exponentialRampToValueAtTime(350, now + durationSec);

        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.35, now + 0.008);
        noteGain.gain.exponentialRampToValueAtTime(0.08, now + 0.5);
        noteGain.gain.setValueAtTime(0.08, now + durationSec - 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

        osc1.connect(noteGain);
        osc2.connect(noteGain);
        noteGain.connect(filter);
        filter.connect(masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + durationSec);
        osc2.stop(now + durationSec);

      } else if (currentPreset === "vintage-rhodes") {
        // Vintage Electric Rhodes Preset
        const oscCore = ctx.createOscillator();
        const oscTine = ctx.createOscillator();
        const gainCore = ctx.createGain();
        const gainTine = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        oscCore.type = "sine";
        oscCore.frequency.setValueAtTime(freq, now);

        oscTine.type = "triangle";
        oscTine.frequency.setValueAtTime(freq * 2, now); // Octave up

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1400, now);

        gainCore.gain.setValueAtTime(0, now);
        gainCore.gain.linearRampToValueAtTime(0.3, now + 0.006);
        gainCore.gain.exponentialRampToValueAtTime(0.06, now + 0.6);
        gainCore.gain.setValueAtTime(0.06, now + durationSec - 0.05);
        gainCore.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

        gainTine.gain.setValueAtTime(0, now);
        gainTine.gain.linearRampToValueAtTime(0.12, now + 0.002);
        gainTine.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

        oscCore.connect(gainCore);
        oscTine.connect(gainTine);
        gainCore.connect(filter);
        gainTine.connect(filter);
        filter.connect(masterGain);

        oscCore.start(now);
        oscTine.start(now);
        oscCore.stop(now + durationSec);
        oscTine.stop(now + durationSec);

      } else if (currentPreset === "dream-pads") {
        // Ambient Dream Pad preset
        const oscA = ctx.createOscillator();
        const oscB = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        oscA.type = "sawtooth";
        oscA.frequency.setValueAtTime(freq - 1.5, now);

        oscB.type = "sawtooth";
        oscB.frequency.setValueAtTime(freq + 1.5, now);

        filter.type = "lowpass";
        filter.Q.setValueAtTime(3, now);
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + durationSec * 0.4);

        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.15, now + 0.8); // 800ms attack
        noteGain.gain.setValueAtTime(0.15, now + durationSec - 0.6);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

        oscA.connect(noteGain);
        oscB.connect(noteGain);
        noteGain.connect(filter);
        filter.connect(masterGain);

        oscA.start(now);
        oscB.start(now);
        oscA.stop(now + durationSec);
        oscB.stop(now + durationSec);

      } else if (currentPreset === "8bit-synth") {
        // Retro Square Synth
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(freq, now);

        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.15, now + 0.002);
        noteGain.gain.exponentialRampToValueAtTime(0.04, now + 0.15);
        noteGain.gain.setValueAtTime(0.04, now + durationSec - 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + durationSec);
      }
    } catch (e) {
      console.error("Synth note playback error:", e);
    }
  };

  const playChordNotes = (notes: string[], durationMs: number, chordIndex: number = 0) => {
    if (!notes || notes.length === 0) return;
    
    // Clear any previous sub-timeouts to avoid overlapping
    subTimeoutsRef.current.forEach(clearTimeout);
    subTimeoutsRef.current = [];

    const mode = playbackModeRef.current;
    
    const playSingleNoteWithVisuals = (noteName: string, noteDurationMs: number, velocity: number) => {
      playSingleNote(noteName, noteDurationMs, velocity);
      
      setActivePlaybackNotes(prev => {
        if (prev.includes(noteName)) return prev;
        return [...prev, noteName];
      });

      const clearId = setTimeout(() => {
        setActivePlaybackNotes(prev => prev.filter(n => n !== noteName));
      }, noteDurationMs);
      subTimeoutsRef.current.push(clearId);
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
    
    // Clear all scheduled rhythmic and arpeggio sub-timeouts
    subTimeoutsRef.current.forEach(clearTimeout);
    subTimeoutsRef.current = [];

    setPlaybackChordIndex(-1);
    setPlaybackSectionId(null);
    setActivePlaybackNotes([]);
    activePlaybackNotesRef.current = [];

    // Send MIDI Note Off for all active output notes (send to all channels for robust cleanup)
    if (activeOutputPortRef.current && activeMidiNotesRef.current.length > 0) {
      try {
        const out = activeOutputPortRef.current;
        triggerMidiActivity();
        activeMidiNotesRef.current.forEach((midiNum) => {
          for (let ch = 0; ch < 16; ch++) {
            out.send([0x80 | ch, midiNum, 0x00]); // Note Off on all channels
          }
        });
      } catch (e) {
        console.warn("Error sending final MIDI note off:", e);
      }
      activeMidiNotesRef.current = [];
    }

    // Secondary cleanup of previous legacy notes just in case (all channels)
    if (activeOutputPortRef.current && previouslyPlayedMidiNotesRef.current.length > 0) {
      try {
        const out = activeOutputPortRef.current;
        previouslyPlayedMidiNotesRef.current.forEach((midiNum) => {
          for (let ch = 0; ch < 16; ch++) {
            out.send([0x80 | ch, midiNum, 0x00]);
          }
        });
      } catch (e) {}
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
      
      playChordNotes(chord.notes, chordDurationMs, chord.globalIndex);

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

      playbackTimerRef.current = setTimeout(() => {
        runPlaybackStep(targetNextIdx);
      }, chordDurationMs);
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
        tempo: String(tempoVal)
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
      } else {
        toast.error(`Error en sección ${section.type}: ${result.error}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Fallo en sección ${section.type}`);
    } finally {
      setGeneratingSectionIds(prev => ({ ...prev, [section.id]: false }));
    }
  };

  // Submit form: Generate Song Blueprint and compile sections
  const onSubmit = async (data: SongInput) => {
    setLoading(true);
    setActiveSong(null);
    setActiveSectionId(null);
    setActiveTab("estudio");
    try {
      const res = await generateSongBlueprintAction(data);
      if (res.success && res.data) {
        const blueprint: SongBlueprint = res.data;
        
        // Structure the active song
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
            chords: null
          }))
        };

        setActiveSong(newSong);
        setActiveSectionId(newSong.sections[0].id);
        toast.success("¡Estructura de canción creada! Generando progresiones...");

        // Sequentially generate chords for each section to provide premium loader UX
        for (const sect of newSong.sections) {
          await generateSectionChords(sect, newSong.tempo, newSong.title);
        }

        toast.success("¡Canción completa generada!");
      } else {
        toast.error(res.error || "Fallo al crear estructura de canción.");
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Ocurrió un error inesperado al componer.");
    } finally {
      setLoading(false);
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
          setActiveSong(parsed);
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

          <div className="flex flex-wrap items-center gap-4">
            {/* Mode Selector Stepper Tabs */}
            <TabsList className="bg-muted/60 p-1 rounded-xl border border-border/50">
              <TabsTrigger value="estudio" className="rounded-lg text-xs font-bold px-4 py-2 flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-primary" />
                Mesa de Composición
              </TabsTrigger>
              <TabsTrigger value="biblioteca" className="rounded-lg text-xs font-bold px-4 py-2 flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 text-primary" />
                Biblioteca de Proyectos ({savedSongs.length})
              </TabsTrigger>
            </TabsList>

            {/* Global Actions (Visible inside Studio view) */}
            {activeSong && activeTab === "estudio" && (
              <div className="flex flex-wrap gap-2.5">
                <Button
                  onClick={handleSaveSong}
                  disabled={isSaving}
                  variant="default"
                  className="rounded-xl h-10 shadow-md font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Guardando..." : "Guardar en Base de Datos"}
                </Button>

                <Button
                  onClick={handleExportJson}
                  variant="outline"
                  className="rounded-xl h-10 border-border hover:bg-muted/50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-primary" />
                  Exportar JSON
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tab 1: Studio Composer Workbench */}
        <TabsContent value="estudio" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Left Column: Form & Saved Songs Quick View */}
            <div className="lg:col-span-1 space-y-6">
              <SongComposerForm
                loading={loading}
                onGenerateSong={onSubmit}
                onImportSong={(song) => {
                  setActiveSong(song);
                  setActiveSectionId(song.sections[0]?.id || null);
                  setActiveTab("estudio");
                }}
              />

              <SidebarSongLibrary
                savedSongs={savedSongs}
                isLoadingSongs={isLoadingSongs}
                activeSong={activeSong}
                onSelectSong={(song) => {
                  setActiveSong(song);
                  setActiveSectionId(song.sections[0]?.id || null);
                  setActiveTab("estudio");
                  toast.success(`Abierta: "${song.title}"`);
                }}
                onDeleteSong={handleDeleteSong}
              />
            </div>

            {/* Right Column: Song Arrange Studio Workspace */}
            <div className="lg:col-span-3 space-y-6">
              {!activeSong ? (
                <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-dashed border-border/70 bg-card/25 backdrop-blur-sm p-8 space-y-4">
                  <div className="p-4 bg-primary/10 rounded-full text-primary">
                    <ListMusic className="w-10 h-10 animate-bounce" />
                  </div>
                  <div className="max-w-md space-y-2">
                    <h3 className="text-xl font-bold">Estudio Musical Vacío</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Utiliza el formulario de la izquierda para componer una canción inteligente, o abre una de tus canciones guardadas en tu biblioteca personal de la base de datos.
                    </p>
                    <Button onClick={() => setActiveTab("biblioteca")} variant="outline" className="rounded-xl mt-2 flex items-center gap-2 mx-auto border-border">
                      <FolderOpen className="w-4 h-4 text-primary" />
                      Explorar Biblioteca de Proyectos
                    </Button>
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
                    playbackPreset={playbackPreset}
                    setPlaybackPreset={setPlaybackPreset}
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
                  />

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
              setActiveSong(song);
              setActiveSectionId(song.sections[0]?.id || null);
              setActiveTab("estudio");
              toast.success(`Abierta: "${song.title}"`);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
