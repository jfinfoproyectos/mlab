"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { SongStructure } from "../schemas/song-generator.schema";
import { syncChordRhythmTrackNotes } from "../utils/chord-rhythm";

interface PlayableChord {
  chordName: string;
  notes: string[];
  sectionId: string;
  sectionType: string;
  chordIndexInSection: number;
  globalIndex: number;
}

// Convert note name (e.g. "C3") to MIDI number
export const noteToMidi = (noteStr: string): number => {
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

// Convert note name (e.g. "C3", "Eb4") to frequency
export const noteToFreq = (noteStr: string): number => {
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

export function useSongPlayback(
  activeSong: SongStructure | null,
  setActiveSong: React.Dispatch<React.SetStateAction<SongStructure | null>>,
  saveSongBackground: (song: SongStructure) => Promise<void>
) {
  // Shadow native timers to run playback in non-throttled Web Worker thread
  const setTimeout = workerSetTimeout as any;
  const clearTimeout = workerClearTimeout as any;

  // Playback Control States
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSectionId, setPlaybackSectionId] = useState<string | null>(null);
  const [playbackChordIndex, setPlaybackChordIndex] = useState<number>(-1);
  const [playbackBpm, setPlaybackBpm] = useState<number>(80);
  const [playbackVolume, setPlaybackVolume] = useState<number>(0.7);
  const [playbackPreset, setPlaybackPreset] = useState<string>("grand-piano");
  const [playbackMode, setPlaybackMode] = useState<"basic" | "rhythm" | "arpeggio">("basic");
  const [selectedRhythmPattern, setSelectedRhythmPattern] = useState<string>("pop-ballad");
  const [selectedArpeggioPattern, setSelectedArpeggioPattern] = useState<string>("up-down");
  const [loopMode, setLoopMode] = useState<"song" | "section" | "off">("off");
  
  // Custom sequencers step rhythms matrix (5 instruments x 16 steps)
  const [customRhythmSteps, setCustomRhythmSteps] = useState<boolean[][]>(() =>
    Array(5).fill(null).map(() => Array(16).fill(false))
  );
  
  // Saved custom drum patterns list
  const [savedRhythms, setSavedRhythms] = useState<any[]>([]);
  const [newRhythmName, setNewRhythmName] = useState<string>("");

  // Virtual piano keyboard live notes visual feedback
  const [activePlaybackNotes, setActivePlaybackNotes] = useState<string[]>([]);

  // Web MIDI API connection states
  const [midiOutputs, setMidiOutputs] = useState<any[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState<string>("");
  const [midiChannel, setMidiChannel] = useState<number>(1);
  const [isMidiSupported, setIsMidiSupported] = useState<boolean>(false);
  const [midiActivity, setMidiActivity] = useState<boolean>(false);

  // Playback references
  const audioContextRef = useRef<AudioContext | null>(null);
  const globalGainNodeRef = useRef<GainNode | null>(null);
  const playbackTimerRef = useRef<any>(null);
  const isPlayingRef = useRef<boolean>(false);
  const activePlaybackNotesRef = useRef<string[]>([]);
  const activeMidiNotesRef = useRef<number[]>([]);
  const previouslyPlayedMidiNotesRef = useRef<number[]>([]);
  
  // Settings Refs (avoid stale closure overrides)
  const playbackBpmRef = useRef<number>(80);
  const playbackModeRef = useRef<"basic" | "rhythm" | "arpeggio">("basic");
  const selectedRhythmPatternRef = useRef<string>("pop-ballad");
  const selectedArpeggioPatternRef = useRef<string>("up-down");
  const playbackVolumeRef = useRef<number>(0.7);
  const customRhythmStepsRef = useRef<boolean[][]>([]);
  const savedRhythmsRef = useRef<any[]>([]);
  const loopModeRef = useRef<"song" | "section" | "off">("off");
  
  const midiAccessRef = useRef<any>(null);
  const activeOutputPortRef = useRef<any>(null);
  const midiChannelRef = useRef<number>(1);
  const activeSongRef = useRef<SongStructure | null>(null);
  
  // Refs for tracking changes in transient controls and preventing reload overwrites
  const prevModeRef = useRef<string>("");
  const prevRhythmRef = useRef<string>("");
  const prevArpeggioRef = useRef<string>("");
  const prevCustomStepsRef = useRef<string>("");
  const prevChordsSigRef = useRef<string>("");
  const justLoadedRef = useRef<boolean>(false);

  // Web worker metronome for background playback scheduling
  const playbackWorkerRef = useRef<Worker | null>(null);
  const playbackTimeQueueRef = useRef<number>(0);

  // Sub-timeouts arrays to prevent notes sticking on stop/pause
  const subTimeoutsRef = useRef<any[]>([]);
  const trackTimeoutsRef = useRef<any[]>([]);
  const gracefulTimeoutRef = useRef<any>(null);

  // Sync references with React state
  useEffect(() => { activeSongRef.current = activeSong; }, [activeSong]);
  useEffect(() => { playbackBpmRef.current = playbackBpm; }, [playbackBpm]);
  useEffect(() => { playbackModeRef.current = playbackMode; }, [playbackMode]);
  useEffect(() => { selectedRhythmPatternRef.current = selectedRhythmPattern; }, [selectedRhythmPattern]);
  useEffect(() => { selectedArpeggioPatternRef.current = selectedArpeggioPattern; }, [selectedArpeggioPattern]);
  useEffect(() => { playbackVolumeRef.current = playbackVolume; }, [playbackVolume]);
  useEffect(() => { customRhythmStepsRef.current = customRhythmSteps; }, [customRhythmSteps]);
  useEffect(() => { savedRhythmsRef.current = savedRhythms; }, [savedRhythms]);
  useEffect(() => { loopModeRef.current = loopMode; }, [loopMode]);
  useEffect(() => { midiChannelRef.current = midiChannel; }, [midiChannel]);

  // Sync activeSong states back to database when playback configurations change
  useEffect(() => {
    const prev = activeSongRef.current;
    if (!prev) return;

    const chordsSig = activeSong ? activeSong.sections.map(s => {
      return s.id + ":" + (s.chords?.chords?.map(c => c.chord + "-" + (c.pianoNotes || []).join(",")).join("|") || "");
    }).join(";") : "";

    const customStepsStr = JSON.stringify(customRhythmSteps);

    // If song was just loaded, align our control refs and bypass regeneration
    if (justLoadedRef.current) {
      prevModeRef.current = playbackMode;
      prevRhythmRef.current = selectedRhythmPattern;
      prevArpeggioRef.current = selectedArpeggioPattern;
      prevCustomStepsRef.current = customStepsStr;
      prevChordsSigRef.current = chordsSig;
      justLoadedRef.current = false;
      return;
    }

    let hasChanges = false;
    const updatedConfig: Partial<SongStructure> = {};

    if (prev.tempo !== playbackBpm) {
      updatedConfig.tempo = playbackBpm;
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

    const modeChanged = prevModeRef.current !== playbackMode;
    const rhythmChanged = prevRhythmRef.current !== selectedRhythmPattern;
    const arpeggioChanged = prevArpeggioRef.current !== selectedArpeggioPattern;
    const customStepsChanged = prevCustomStepsRef.current !== customStepsStr;
    const chordsChanged = prevChordsSigRef.current !== chordsSig;

    let hasTracksChanges = false;
    let currentBaseSong = {
      ...prev,
      ...updatedConfig
    };

    if (modeChanged || rhythmChanged || arpeggioChanged || customStepsChanged) {
      if (currentBaseSong.tracks) {
        currentBaseSong.tracks = currentBaseSong.tracks.map(t => {
          if (t.isProgressionRhythm) {
            return {
              ...t,
              aiSections: {}
            };
          }
          return t;
        });
      }
      hasTracksChanges = true;
    }

    const shouldRegenerate = hasTracksChanges || chordsChanged || !prev.tracks?.some(t => t.isProgressionRhythm);

    if (shouldRegenerate) {
      const synced = syncChordRhythmTrackNotes(
        currentBaseSong,
        selectedRhythmPattern,
        playbackMode,
        customRhythmSteps,
        selectedArpeggioPattern
      );

      updatedConfig.tracks = synced.tracks;
      hasChanges = true;

      // Update refs to match newly generated state
      prevModeRef.current = playbackMode;
      prevRhythmRef.current = selectedRhythmPattern;
      prevArpeggioRef.current = selectedArpeggioPattern;
      prevCustomStepsRef.current = customStepsStr;
      prevChordsSigRef.current = chordsSig;
    }

    if (hasChanges) {
      const updated = {
        ...prev,
        ...updatedConfig
      };
      activeSongRef.current = updated;
      setActiveSong(updated);
      saveSongBackground(updated);
    }
  }, [
    playbackBpm,
    playbackMode,
    selectedRhythmPattern,
    selectedArpeggioPattern,
    playbackVolume,
    customRhythmSteps,
    loopMode,
    setActiveSong,
    saveSongBackground,
    // Add chord progression notes signature to the dependencies to trigger sync when chords change
    activeSong ? activeSong.sections.map(s => {
      return s.id + ":" + (s.chords?.chords?.map(c => c.chord + "-" + (c.pianoNotes || []).join(",")).join("|") || "");
    }).join(";") : ""
  ]);

  // Clean up playback on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
      }
      if (gracefulTimeoutRef.current) {
        clearTimeout(gracefulTimeoutRef.current);
      }
      if (playbackWorkerRef.current) {
        playbackWorkerRef.current.postMessage({ action: "stop" });
        playbackWorkerRef.current.terminate();
        playbackWorkerRef.current = null;
      }
      subTimeoutsRef.current.forEach(clearTimeout);
      trackTimeoutsRef.current.forEach(clearTimeout);

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

          for (let ch = 0; ch < 16; ch++) {
            out.send([0xB0 | ch, 123, 0]);
            out.send([0xB0 | ch, 120, 0]);
          }
        } catch (e) {
          console.warn("Error silenciando MIDI en desmontaje:", e);
        }
      }
    };
  }, [clearTimeout]);

  // Helper to load song settings and sync React states/refs
  const applyLoadedSong = useCallback((song: SongStructure) => {
    const songWithTracks = {
      ...song,
      tracks: song.tracks || []
    };

    // Flag that we are loading a song to prevent the sync useEffect from overwriting stored notes
    justLoadedRef.current = true;

    if (song.tempo) {
      setPlaybackBpm(song.tempo);
      playbackBpmRef.current = song.tempo;
    }
    
    // Playback controls are local client tools, reset them to default values upon loading a new song
    setPlaybackMode("basic");
    playbackModeRef.current = "basic";
    setSelectedRhythmPattern("pop-ballad");
    selectedRhythmPatternRef.current = "pop-ballad";
    setSelectedArpeggioPattern("up-down");
    selectedArpeggioPatternRef.current = "up-down";

    const defaultSteps = Array(5).fill(null).map(() => Array(16).fill(false));
    setCustomRhythmSteps(defaultSteps);
    customRhythmStepsRef.current = defaultSteps;

    if (song.playbackVolume !== undefined) {
      setPlaybackVolume(song.playbackVolume);
      playbackVolumeRef.current = song.playbackVolume;
    } else {
      setPlaybackVolume(0.7);
      playbackVolumeRef.current = 0.7;
    }

    if (song.loopMode) {
      setLoopMode(song.loopMode as any);
      loopModeRef.current = song.loopMode as any;
    } else {
      setLoopMode("off");
      loopModeRef.current = "off";
    }

    setActiveSong(songWithTracks);
    activeSongRef.current = songWithTracks;
  }, [setActiveSong]);

  const midiActivityTimeoutRef = useRef<any>(null);

  // Pulse MIDI activity lamp with throttling to prevent React render thrashing
  const triggerMidiActivity = () => {
    if (!midiActivityTimeoutRef.current) {
      setMidiActivity(true);
    } else {
      clearTimeout(midiActivityTimeoutRef.current);
    }
    midiActivityTimeoutRef.current = setTimeout(() => {
      setMidiActivity(false);
      midiActivityTimeoutRef.current = null;
    }, 120);
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
            // setActivePlaybackNotes(prev => {
            //   if (prev.includes(noteName)) return prev;
            //   return [...prev, noteName];
            // });

            const offTimeout = setTimeout(() => {
              activeMidiNotesRef.current = activeMidiNotesRef.current.filter(n => n !== midiNum);
              // setActivePlaybackNotes(prev => prev.filter(n => n !== noteName));
            }, durationMs);
            subTimeoutsRef.current.push(offTimeout);
          }, Math.max(0, delay));
          subTimeoutsRef.current.push(visualTimeout);
        } catch (midiErr) {
          console.warn("MIDI Output send error:", midiErr);
        }
      }
      return;
    } catch (e) {
      console.error("Synth note playback error:", e);
    }
  };

  const playTrackSingleNote = (
    noteName: string,
    durationMs: number,
    velocity: number = 1.0,
    midiChannelNum: number = 1,
    instrumentPreset: string = "grand-piano",
    startTimeMs?: number,
    sustain: boolean = false
  ) => {
    try {
      const freq = noteToFreq(noteName);
      if (!freq || isNaN(freq)) return;

      const out = activeOutputPortRef.current || (midiOutputs && midiOutputs[0]);
      if (out) {
        try {
          triggerMidiActivity();
          const midiNum = noteToMidi(noteName);
          const channelIdx = midiChannelNum - 1; // 0 to 15

          const scaledVelocity = Math.round(velocity * 127);
          const finalVelocity = Math.min(127, Math.max(0, scaledVelocity));

          const start = startTimeMs !== undefined ? startTimeMs : performance.now();
          
          if (sustain) {
            out.send([0xB0 | channelIdx, 64, 127], start); // Sustain Pedal ON
          }
          out.send([0x90 | channelIdx, midiNum, finalVelocity], start); // Note On (Hardware Precise)
          out.send([0x80 | channelIdx, midiNum, 0x00], start + durationMs); // Note Off (Hardware Precise)
          if (sustain) {
            out.send([0xB0 | channelIdx, 64, 0], start + durationMs); // Sustain Pedal OFF
          }

          const delay = start - performance.now();
          const visualTimeout = setTimeout(() => {
            if (!activeMidiNotesRef.current.includes(midiNum)) {
              activeMidiNotesRef.current.push(midiNum);
            }
            // setActivePlaybackNotes(prev => {
            //   if (prev.includes(noteName)) return prev;
            //   return [...prev, noteName];
            // });

            const offTimeout = setTimeout(() => {
              activeMidiNotesRef.current = activeMidiNotesRef.current.filter(n => n !== midiNum);
              // setActivePlaybackNotes(prev => prev.filter(n => n !== noteName));
            }, durationMs);
            trackTimeoutsRef.current.push(offTimeout);
          }, Math.max(0, delay));
          trackTimeoutsRef.current.push(visualTimeout);
        } catch (midiErr) {
          console.warn("Track MIDI Output send error:", midiErr);
        }
      }
      return;
    } catch (e) {
      console.error("Synth track note playback error:", e);
    }
  };

  const playChordNotes = (notes: string[], durationMs: number, chordIndex: number = 0, startTimeMs?: number) => {
    if (!notes || notes.length === 0) return;
    
    subTimeoutsRef.current.forEach(clearTimeout);
    subTimeoutsRef.current = [];

    const mode = playbackModeRef.current;
    const baseStart = startTimeMs !== undefined ? startTimeMs : performance.now();
    let currentDelayMs = 0;

    const localSetTimeout = (callback: () => void, delay: number): any => {
      const prevDelay = currentDelayMs;
      currentDelayMs = prevDelay + delay;
      callback();
      currentDelayMs = prevDelay;
      return 0;
    };

    const setTimeout = localSetTimeout;
    
    const playSingleNoteWithVisuals = (noteName: string, noteDurationMs: number, velocity: number) => {
      playSingleNote(noteName, noteDurationMs, velocity, baseStart + currentDelayMs);
    };

    if (mode === "basic") {
      notes.forEach((noteName) => {
        playSingleNoteWithVisuals(noteName, durationMs, 1.0);
      });
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
      const isEvenMeasure = chordIndex % 2 === 1;

      if (pattern === "pop-ballad") {
        if (!isEvenMeasure) {
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
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 3.8, 1.0);
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.9, 0.9));
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.8, 0.75));
          }, beatMs));

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
          const sequence = [lowNote, highNote, midNote, highNote, lowNote, highNote, midNote, highNote];
          sequence.forEach((noteName, i) => {
            subTimeoutsRef.current.push(setTimeout(() => {
              playSingleNoteWithVisuals(noteName, stepMs * 0.95, 0.85);
            }, i * stepMs));
          });
        } else {
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
        const stepMs = beatMs / 2;
        if (!isEvenMeasure) {
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
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.8, 0.95);
            voicing.forEach((n, idx) => {
              setTimeout(() => playSingleNoteWithVisuals(n, beatMs * 1.4, 0.9), idx * 25);
            });
          }, 0));

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

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.8, 0.85);
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 1.4, 0.8));
          }, beatMs * 2));

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
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 3.9, 0.9);
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            const reversedVoicing = [...voicing].reverse();
            reversedVoicing.forEach((n, idx) => {
              const strumTimeout = setTimeout(() => {
                playSingleNoteWithVisuals(n, beatMs * 2.5, 0.75);
              }, idx * 60);
              subTimeoutsRef.current.push(strumTimeout);
            });
          }, beatMs * 0.25));

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
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.2, 1.0);
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(highNote, beatMs * 0.45, 1.0);
            playSingleNoteWithVisuals(voicing[0], beatMs * 0.45, 0.95);
          }, beatMs * 0.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            innerVoicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.4, 0.9));
          }, beatMs * 1.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(highNote, beatMs * 0.4, 1.0);
          }, beatMs * 1.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassAlt, beatMs * 0.6, 0.95);
            setTimeout(() => {
              playSingleNoteWithVisuals(bassLower, beatMs * 0.6, 0.9);
            }, beatMs * 0.5);
          }, beatMs * 2.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(highNote, beatMs * 0.45, 1.0);
            playSingleNoteWithVisuals(voicing[0], beatMs * 0.45, 0.95);
          }, beatMs * 2.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            const mid = voicing[Math.floor(voicing.length / 2)] || voicing[0];
            playSingleNoteWithVisuals(mid, beatMs * 0.4, 0.85);
          }, beatMs * 3.0));

          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(voicing[0], beatMs * 0.4, 0.9);
          }, beatMs * 3.5));
        }
      } else if (pattern === "bachata-bolero") {
        const stepMs = durationMs / 8;
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.max(1, octave)}`;
        }

        if (!isEvenMeasure) {
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
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, stepMs * 1.8, 1.0);
          }, 0));

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
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 1.8, 0.95);
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach((n, idx) => {
              const strumTimeout = setTimeout(() => {
                playSingleNoteWithVisuals(n, beatMs * 0.8, 0.8);
              }, idx * 30);
              subTimeoutsRef.current.push(strumTimeout);
            });
          }, beatMs * 0.5));

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
        let bassAlt = bassLower;
        let bassWalk3 = bassLower;
        let bassWalk4 = bassLower;
        
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.min(1, octave)}`;
          const nextNoteLetter = name === "G" ? "A" : String.fromCharCode(name.charCodeAt(0) + 1);
          bassWalk3 = `${nextNoteLetter}${Math.max(1, octave - 1)}`;
          bassWalk4 = `${name}#${Math.max(1, octave - 1)}`;
        }

        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassLower, beatMs * 0.9, 0.95), 0));
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassAlt, beatMs * 0.9, 0.85), beatMs));
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassWalk3, beatMs * 0.9, 0.85), beatMs * 2));
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassWalk4, beatMs * 0.9, 0.9), beatMs * 3));

        if (!isEvenMeasure) {
          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.6, 0.85));
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.5, 0.8));
          }, beatMs * 1.66));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.6, 0.85));
          }, beatMs * 3.0));
        } else {
          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.6, 0.9));
          }, 0));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.6, 0.85));
          }, beatMs * 1.5));

          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach((n, idx) => {
              setTimeout(() => playSingleNoteWithVisuals(n, beatMs * 0.35, 0.75), idx * 25);
            });
          }, beatMs * 3.66));
        }
      } else if (pattern === "boogie-woogie") {
        let bassWalk: string[] = [bassLower];
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          const root = `${name}${Math.max(1, octave - 1)}`;
          const fifth = `${name === "C" ? "G" : "D"}${Math.max(1, octave - 1)}`;
          const sixth = `${name === "C" ? "A" : "E"}${Math.max(1, octave - 1)}`;
          bassWalk = [root, root, fifth, fifth, sixth, sixth, fifth, fifth];
        }

        const stepMs = durationMs / 8;
        for (let i = 0; i < 8; i++) {
          const note = bassWalk[i % bassWalk.length] || bassLower;
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(note, stepMs * 0.8, 1.0);
          }, i * stepMs));
        }

        if (!isEvenMeasure) {
          subTimeoutsRef.current.push(setTimeout(() => voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 1.5, 0.95)), 0));
          subTimeoutsRef.current.push(setTimeout(() => voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 1.5, 0.9)), beatMs));
          subTimeoutsRef.current.push(setTimeout(() => voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 1.5, 0.9)), beatMs * 2));
          subTimeoutsRef.current.push(setTimeout(() => voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 1.5, 0.95)), beatMs * 3));
        } else {
          subTimeoutsRef.current.push(setTimeout(() => voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 1.5, 0.95)), 0));
          subTimeoutsRef.current.push(setTimeout(() => voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 1.5, 0.9)), beatMs));

          subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(voicing[0], stepMs * 0.9, 0.85), beatMs * 2.0));
          subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(voicing[1] || voicing[0], stepMs * 0.9, 0.85), beatMs * 2.5));
          subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(voicing[voicing.length - 1], stepMs * 0.9, 0.9), beatMs * 3.0));
          subTimeoutsRef.current.push(setTimeout(() => {
            const highName = voicing[voicing.length - 1];
            playSingleNoteWithVisuals(highName, stepMs * 1.6, 1.0);
          }, beatMs * 3.5));
        }
      } else if (pattern === "funk-clav") {
        const stepMs = durationMs / 16;
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.min(1, octave)}`;
        }

        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassLower, stepMs * 2.8, 1.0), 0));
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassAlt, stepMs * 2.8, 0.9), beatMs));
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassLower, stepMs * 2.8, 0.95), beatMs * 2));
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassAlt, stepMs * 2.8, 0.9), beatMs * 3));

        if (!isEvenMeasure) {
          const hits = [2, 5, 8, 11, 14];
          hits.forEach((hIndex) => {
            subTimeoutsRef.current.push(setTimeout(() => {
              voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 0.9, 0.95));
            }, hIndex * stepMs));
          });
        } else {
          const hits = [2, 4, 7, 10, 12, 14];
          hits.forEach((hIndex) => {
            subTimeoutsRef.current.push(setTimeout(() => {
              voicing.forEach(n => playSingleNoteWithVisuals(n, stepMs * 0.8, 0.9));
            }, hIndex * stepMs));
          });
        }
      } else if (pattern === "ambient-drone") {
        const slowStrum = (notesArray: string[], delay: number) => {
          notesArray.forEach((n, idx) => {
            const strumTimeout = setTimeout(() => {
              playSingleNoteWithVisuals(n, durationMs * 0.9, 0.65);
            }, idx * 60 + delay);
            subTimeoutsRef.current.push(strumTimeout);
          });
        };
        
        subTimeoutsRef.current.push(setTimeout(() => {
          playSingleNoteWithVisuals(bassLower, durationMs * 0.95, 0.7);
        }, 0));

        slowStrum(voicing, 120);

        if (isEvenMeasure) {
          subTimeoutsRef.current.push(setTimeout(() => {
            const topNote = voicing[voicing.length - 1];
            playSingleNoteWithVisuals(topNote, beatMs * 1.8, 0.45);
          }, beatMs * 2));
        }
      } else if (pattern === "cumbia-colombiana") {
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.min(1, octave)}`;
        }

        const bassCumbia = [bassLower, bassAlt, bassLower, bassAlt];
        bassCumbia.forEach((bNote, idx) => {
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bNote, beatMs * 0.7, 0.95);
          }, idx * beatMs));
        });

        const compTimes = [beatMs * 0.5, beatMs * 1.5, beatMs * 2.5, beatMs * 3.5];
        compTimes.forEach((time) => {
          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.35, 0.95));
          }, time));
        });

        if (isEvenMeasure) {
          subTimeoutsRef.current.push(setTimeout(() => {
            const highNote = voicing[voicing.length - 1];
            const lowerHighNote = voicing[0];
            playSingleNoteWithVisuals(lowerHighNote, beatMs * 0.4, 0.85);
            setTimeout(() => playSingleNoteWithVisuals(highNote, beatMs * 0.4, 0.95), 100);
          }, beatMs * 3.7));
        }
      } else if (pattern === "edm-house") {
        for (let i = 0; i < 4; i++) {
          subTimeoutsRef.current.push(setTimeout(() => {
            playSingleNoteWithVisuals(bassLower, beatMs * 0.65, 1.0);
            voicing.forEach(n => playSingleNoteWithVisuals(n, beatMs * 0.65, 0.95));
          }, i * beatMs));
        }

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
          const rollTimes = [12, 13, 14, 15];
          rollTimes.forEach((rIndex, idx) => {
            subTimeoutsRef.current.push(setTimeout(() => {
              const note = voicing[idx % voicing.length];
              playSingleNoteWithVisuals(note, stepMs * 0.9, 0.8);
            }, rIndex * stepMs));
          });
        } else {
          const rollTimes = [12, 13.5, 14, 15];
          rollTimes.forEach((rIndex, idx) => {
            subTimeoutsRef.current.push(setTimeout(() => {
              const note = voicing[(voicing.length - 1 - idx) % voicing.length];
              playSingleNoteWithVisuals(note, stepMs * 0.9, 0.85);
            }, rIndex * stepMs));
          });
        }
      } else if (pattern === "flamenco-rumba") {
        const stepMs = durationMs / 8;
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.min(1, octave)}`;
        }

        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassLower, beatMs * 0.9, 1.0), 0));
        subTimeoutsRef.current.push(setTimeout(() => playSingleNoteWithVisuals(bassAlt, beatMs * 0.9, 0.9), beatMs * 2));

        const strumBlock = (time: number, velocity: number) => {
          voicing.forEach((n, idx) => {
            setTimeout(() => playSingleNoteWithVisuals(n, stepMs * 0.8, velocity), idx * 20);
          });
        };

        subTimeoutsRef.current.push(setTimeout(() => strumBlock(beatMs * 0.5, 0.85), beatMs * 0.5));
        subTimeoutsRef.current.push(setTimeout(() => strumBlock(beatMs * 1.0, 0.95), beatMs * 1.0));
        subTimeoutsRef.current.push(setTimeout(() => strumBlock(beatMs * 2.5, 0.85), beatMs * 2.5));
        subTimeoutsRef.current.push(setTimeout(() => strumBlock(beatMs * 3.0, 1.0), beatMs * 3.0));

        if (isEvenMeasure) {
          subTimeoutsRef.current.push(setTimeout(() => {
            voicing.forEach((n, idx) => {
              setTimeout(() => playSingleNoteWithVisuals(n, stepMs * 0.5, 1.0), idx * 25);
            });
          }, beatMs * 3.5));
        }
      }
    } else if (mode === "arpeggio") {
      const beatMs = durationMs / 4;
      const stepMs = durationMs / 8;

      const bass = notes[0];
      let bassLower = bass;
      const match = bass.match(/^([A-G][#b]?)([0-9])$/i);
      if (match) {
        const noteName = match[1];
        const octave = parseInt(match[2], 10);
        bassLower = `${noteName}${Math.max(1, octave - 1)}`;
      }

      const getNoteWithOctaveShift = (noteStr: string, shift: number): string => {
        const matchNote = noteStr.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchNote) {
          const name = matchNote[1];
          const octave = parseInt(matchNote[2], 10);
          return `${name}${Math.max(1, Math.min(8, octave + shift))}`;
        }
        return noteStr;
      };

      const bassTimeout = setTimeout(() => {
        playSingleNoteWithVisuals(bassLower, beatMs * 3.8, 0.95);
      }, 0);
      subTimeoutsRef.current.push(bassTimeout);

      const pattern = selectedArpeggioPatternRef.current;
      const voicing = notes.length > 1 ? notes.slice(1) : notes;
      const len = voicing.length;

      if (pattern === "cascade") {
        const fastStepMs = durationMs / 16;
        const cascadeSequence: string[] = [];

        for (let i = 0; i < 4; i++) {
          cascadeSequence.push(voicing[i % len]);
        }
        for (let i = 0; i < 4; i++) {
          cascadeSequence.push(getNoteWithOctaveShift(voicing[i % len], 1));
        }
        for (let i = 0; i < 4; i++) {
          cascadeSequence.push(getNoteWithOctaveShift(voicing[(len - 1 - i) % len] || voicing[0], 1));
        }
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
          for (let i = 0; i < 8; i++) {
            const step = i % 4;
            if (step === 0) arpeggioSequence.push([voicing[0]]);
            else if (step === 1) arpeggioSequence.push([voicing[len - 1]]);
            else if (step === 2) arpeggioSequence.push([voicing[Math.max(0, Math.min(len - 1, 1))]]);
            else arpeggioSequence.push([voicing[Math.max(0, Math.min(len - 1, len - 2))]]);
          }
        } else if (pattern === "double-strike") {
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

  const stopPlayback = useCallback((graceful: boolean = false) => {
    if (gracefulTimeoutRef.current) {
      clearTimeout(gracefulTimeoutRef.current);
      gracefulTimeoutRef.current = null;
    }

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

    if (graceful) {
      // Graceful stop: stop sequencer timer immediately but let Note Off events decay naturally.
      // Schedule a hard silent cleanup in 2500ms.
      gracefulTimeoutRef.current = setTimeout(() => {
        setPlaybackChordIndex(-1);
        setPlaybackSectionId(null);
        setActivePlaybackNotes([]);
        activePlaybackNotesRef.current = [];

        subTimeoutsRef.current.forEach(clearTimeout);
        subTimeoutsRef.current = [];
        trackTimeoutsRef.current.forEach(clearTimeout);
        trackTimeoutsRef.current = [];

        if (activeOutputPortRef.current) {
          try {
            const out = activeOutputPortRef.current;
            for (let ch = 0; ch < 16; ch++) {
              out.send([0xB0 | ch, 123, 0]);
              out.send([0xB0 | ch, 120, 0]);
            }
          } catch (e) {
            console.warn("Error in deferred MIDI reset:", e);
          }
          activeMidiNotesRef.current = [];
          previouslyPlayedMidiNotesRef.current = [];
        }
        gracefulTimeoutRef.current = null;
      }, 2500);
      return;
    }
    
    subTimeoutsRef.current.forEach(clearTimeout);
    subTimeoutsRef.current = [];

    trackTimeoutsRef.current.forEach(clearTimeout);
    trackTimeoutsRef.current = [];

    setPlaybackChordIndex(-1);
    setPlaybackSectionId(null);
    setActivePlaybackNotes([]);
    activePlaybackNotesRef.current = [];

    if (activeOutputPortRef.current) {
      try {
        const out = activeOutputPortRef.current;
        triggerMidiActivity();

        const notesToTurnOff = Array.from(
          new Set([...activeMidiNotesRef.current, ...previouslyPlayedMidiNotesRef.current])
        );

        notesToTurnOff.forEach((midiNum) => {
          for (let ch = 0; ch < 16; ch++) {
            out.send([0x80 | ch, midiNum, 0x00]);
          }
        });

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
  }, [clearTimeout]);

  const startPlayback = useCallback((targetSectionId: string | null = null) => {
    if (!activeSongRef.current) return;

    if (gracefulTimeoutRef.current) {
      clearTimeout(gracefulTimeoutRef.current);
      gracefulTimeoutRef.current = null;
      if (activeOutputPortRef.current) {
        try {
          const out = activeOutputPortRef.current;
          for (let ch = 0; ch < 16; ch++) {
            out.send([0xB0 | ch, 123, 0]);
          }
        } catch (e) {}
      }
    }
    
    const playableChords = getPlayableChords(activeSongRef.current);
    if (playableChords.length === 0) {
      toast.error("No hay acordes generados en esta canción para reproducir.");
      return;
    }

    getAudioContext();

    setIsPlaying(true);
    isPlayingRef.current = true;

    subTimeoutsRef.current.forEach(clearTimeout);
    subTimeoutsRef.current = [];
    trackTimeoutsRef.current.forEach(clearTimeout);
    trackTimeoutsRef.current = [];

    if (!playbackWorkerRef.current) {
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
    } else {
      playbackWorkerRef.current.postMessage({ action: "stop" });
    }

    let startIdx = 0;
    const currentSectionToUse = targetSectionId || playbackSectionId;
    if (currentSectionToUse && playbackChordIndex >= 0) {
      const foundIdx = playableChords.findIndex(
        c => c.sectionId === currentSectionToUse && c.chordIndexInSection === playbackChordIndex
      );
      if (foundIdx !== -1) {
        startIdx = foundIdx;
      }
    }

    // Initialize the queue time with a 200ms buffer for precise scheduling.
    // A larger initial buffer prevents stutter caused by React state updates when hitting play.
    playbackTimeQueueRef.current = performance.now() + 200;

    const runPlaybackStep = (currentIdx: number) => {
      if (!isPlayingRef.current) return;

      const chord = playableChords[currentIdx];
      if (!chord) {
        const currentLoop = loopModeRef.current;
        if (currentLoop === "song") {
          playbackTimeQueueRef.current = performance.now() + 50;
          runPlaybackStep(0);
        } else {
          stopPlayback(true);
          toast.info("Fin de la reproducción de la canción.");
        }
        return;
      }

      const currentBpm = playbackBpmRef.current;
      const beatDurationSec = 60 / currentBpm;
      const chordDurationMs = beatDurationSec * 4 * 1000;
      const startTimeMs = playbackTimeQueueRef.current;

      // Schedule React UI state updates to align exactly with note playback time
      const uiUpdateDelay = Math.max(0, startTimeMs - performance.now());
      const uiTimeout = setTimeout(() => {
        if (!isPlayingRef.current) return;
        setPlaybackSectionId(chord.sectionId);
        setPlaybackChordIndex(chord.chordIndexInSection);
      }, uiUpdateDelay);
      subTimeoutsRef.current.push(uiTimeout);
      
      const anySoloed = activeSongRef.current?.tracks?.some(t => t.soloed === true) || false;

      if (activeSongRef.current) {
        const currentChordStart = chord.chordIndexInSection * 4;
        const currentChordEnd = currentChordStart + 4;

        if (chord.chordIndexInSection === 0 || currentIdx === startIdx) {
          trackTimeoutsRef.current.forEach(clearTimeout);
          trackTimeoutsRef.current = [];
        }

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
                    startTimeMs + startDelayMs,
                    noteObj.sustain
                  );
                }
              });
            }
          });
        }

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
                    startTimeMs + startDelayMs,
                    noteObj.sustain
                  );
                }
              });
            }
          });
        }
      }

      const nextIdx = currentIdx + 1;
      let targetNextIdx = nextIdx;

      const currentLoop = loopModeRef.current;
      if (currentLoop === "section") {
        const sectionChords = playableChords.filter(c => c.sectionId === chord.sectionId);
        const lastSectionChord = sectionChords[sectionChords.length - 1];
        if (chord.globalIndex === lastSectionChord.globalIndex) {
          const firstSectionChord = sectionChords[0];
          targetNextIdx = firstSectionChord.globalIndex;
        }
      }

      // Advance the time queue by the duration of the current chord step
      playbackTimeQueueRef.current += chordDurationMs;

      // Lookahead of 150ms ensures that even if main thread gets blocked briefly,
      // the worker wakes up early enough to queue the next notes in the Web MIDI hardware buffer.
      const lookaheadMs = 150;
      const nextWakeupTime = playbackTimeQueueRef.current - lookaheadMs;
      const delay = nextWakeupTime - performance.now();

      if (playbackWorkerRef.current) {
        playbackWorkerRef.current.onmessage = () => {
          runPlaybackStep(targetNextIdx);
        };
        playbackWorkerRef.current.postMessage({ action: "start", delay: Math.max(0, delay) });
      } else {
        playbackTimerRef.current = setTimeout(() => {
          runPlaybackStep(targetNextIdx);
        }, Math.max(0, delay));
      }
    };

    runPlaybackStep(startIdx);
  }, [getPlayableChords, stopPlayback, playbackSectionId, playbackChordIndex, clearTimeout]);

  const togglePlayback = useCallback((targetSectionId: string | null = null) => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback(targetSectionId);
    }
  }, [isPlaying, startPlayback, stopPlayback]);

  return {
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
    activePlaybackNotes,
    midiOutputs,
    selectedOutputId,
    setSelectedOutputId,
    midiChannel,
    setMidiChannel,
    isMidiSupported,
    midiActivity,
    applyLoadedSong,
    startPlayback,
    stopPlayback,
    togglePlayback,
    playSingleNote,
    playTrackSingleNote
  };
}
