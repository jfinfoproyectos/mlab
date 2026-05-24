"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Music, Edit2, MousePointer2, ZoomIn, ZoomOut, Grid, MoveHorizontal, MoveVertical, Sliders } from "lucide-react";
import { SongStructure } from '@/features/song-composer/schemas/song-generator.schema';
import { noteToMidi } from '@/features/playback/hooks/use-song-playback';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PianoRollProps {
  activeSong: SongStructure;
  isPlaying: boolean;
  playbackSectionId: string | null;
  playbackChordIndex: number;
  playbackBpm: number;
  playbackVolume: number;
  togglePlayback: (targetSectionId: string | null) => void;
  startPlayback?: (targetSectionId: string | null) => void;
  stopPlayback: () => void;
  setPlaybackSectionId?: (id: string) => void;
  setPlaybackChordIndex?: (index: number) => void;
  visibleTrackIds?: Set<string>;
  onUpdateNote?: (trackId: string, sectionId: string, noteIndex: number, updatedNote: { pitch: string; durationBeats: number; startBeat: number; velocity?: number }) => void;
}

// Convert MIDI pitch number to Pitch Name (e.g. 60 -> C4)
const midiToNoteName = (midi: number): string => {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${noteNames[noteIndex]}${octave}`;
};

// Check if a MIDI pitch represents a black key
const isBlackKey = (midi: number): boolean => {
  const noteIndex = midi % 12;
  return [1, 3, 6, 8, 10].includes(noteIndex);
};

// Componente memoizado para renderizar las notas pesadas sin bloquear el hilo cuando cambian estados de reproducción
const MemoizedTrackNotes = React.memo(({
  trackNotes,
  midiRange,
  keyHeight,
  pxPerBeat,
  headerHeight,
  currentBeat,
  dragState,
  selectedNoteRef,
  isEditMode,
  setDragState,
  setSelectedNoteRef
}: any) => {
  return (
    <TooltipProvider>
      {trackNotes.map((note: any) => {
        const noteTop = (midiRange.maxMidi - note.midiNum) * keyHeight;
        const noteWidth = note.durationBeats * pxPerBeat;
        const noteLeft = note.startBeat * pxPerBeat;
        const isActive = currentBeat >= note.startBeat && currentBeat < (note.startBeat + note.durationBeats);

        const isDraggingThis = dragState?.noteId === note.id;
        const renderTop = isDraggingThis ? (midiRange.maxMidi - dragState.currentMidiNum) * keyHeight : noteTop;
        const renderLeft = isDraggingThis ? dragState.currentStartBeat * pxPerBeat : noteLeft;
        const renderWidth = isDraggingThis ? dragState.currentDurationBeats * pxPerBeat : noteWidth;
        const isSelected = selectedNoteRef?.trackId === note.trackId && 
                           selectedNoteRef?.sectionId === note.sectionId && 
                           selectedNoteRef?.noteIndex === note.noteIndex;

        return (
          <Tooltip key={note.id} delayDuration={150}>
            <TooltipTrigger asChild>
              <div
                data-note-id={note.id}
                data-note-color={note.color}
                onPointerDown={(e) => {
                  if (!isEditMode) return;
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const rect = e.currentTarget.getBoundingClientRect();
                  const isRightEdge = (e.clientX - rect.left) > (rect.width - 15);
                  
                  setSelectedNoteRef({
                    trackId: note.trackId,
                    sectionId: note.sectionId,
                    noteIndex: note.noteIndex
                  });

                  setDragState({
                    noteId: note.id,
                    trackId: note.trackId,
                    sectionId: note.sectionId,
                    noteIndex: note.noteIndex,
                    sectionStartBeat: note.sectionStartBeat,
                    type: isRightEdge ? "resize" : "move",
                    initialX: e.clientX,
                    initialY: e.clientY,
                    initialStartBeat: note.startBeat,
                    initialDurationBeats: note.durationBeats,
                    initialMidiNum: note.midiNum,
                    currentStartBeat: note.startBeat,
                    currentDurationBeats: note.durationBeats,
                    currentMidiNum: note.midiNum
                  });
                }}
                style={{
                  position: "absolute",
                  top: `${renderTop + 1 + headerHeight}px`,
                  left: `${renderLeft}px`,
                  width: `${renderWidth - 2}px`,
                  height: `${keyHeight - 2}px`,
                  cursor: isEditMode ? (isDraggingThis && dragState.type === "resize" ? "ew-resize" : "move") : (isActive ? "pointer" : "default"),
                  opacity: isDraggingThis ? 1.0 : (0.35 + (note.velocity ?? 0.7) * 0.65)
                }}
                className={`rounded-md border text-[8px] font-black px-1.5 flex items-center justify-center select-none overflow-hidden transition-all bg-gradient-to-r ${
                  isActive || isDraggingThis
                    ? "z-[25] scale-y-[1.15] scale-x-[1.02] brightness-150 ring-2 ring-white/80 shadow-[0_0_25px_rgba(255,255,255,0.6)] border-white" 
                    : isSelected
                      ? "z-[20] scale-y-[1.05] scale-x-[1.01] brightness-125 ring-2 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] border-purple-400"
                      : "z-[15] hover:opacity-100 hover:scale-y-[1.02]"
                } ${isEditMode ? "hover:ring-2 hover:ring-purple-400/50" : ""} ${note.color}`}
              >
                <span className="font-mono flex-shrink-0 text-[8px] drop-shadow-md truncate opacity-90 pointer-events-none">
                  {note.pitch} <span className="opacity-60 text-[7px] font-sans">({Math.round((note.velocity ?? 0.7) * 100)})</span>
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" className="text-xs z-[100] shadow-xl pointer-events-none p-2.5 flex flex-col gap-1">
              <div className="font-black text-sm">{note.trackName}</div>
              <div className="opacity-80">Nota: <span className="font-mono font-bold opacity-100">{note.pitch}</span> <span className="text-[10px] opacity-60">(MIDI: {note.midiNum})</span></div>
              <div className="opacity-80">Beat: <span className="font-bold opacity-100">{note.startBeat}</span> | Duración: <span className="font-bold opacity-100">{note.durationBeats}</span></div>
              <div className="opacity-80">Dinámica: <span className="font-bold opacity-100">{Math.round((note.velocity ?? 0.7) * 127)} ({Math.round((note.velocity ?? 0.7) * 100)}%)</span></div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </TooltipProvider>
  );
});

function PianoRollComponent({
  activeSong,
  isPlaying,
  playbackSectionId,
  playbackChordIndex,
  playbackBpm,
  playbackVolume,
  togglePlayback,
  startPlayback,
  stopPlayback,
  visibleTrackIds,
  setPlaybackSectionId,
  setPlaybackChordIndex,
  onUpdateNote,
}: PianoRollProps) {
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedNoteRef, setSelectedNoteRef] = useState<{
    trackId: string;
    sectionId: string;
    noteIndex: number;
  } | null>(null);

  useEffect(() => {
    if (!isEditMode) {
      setSelectedNoteRef(null);
    }
  }, [isEditMode]);

  const [dragState, setDragState] = useState<{
    noteId: string;
    trackId: string;
    sectionId: string;
    noteIndex: number;
    sectionStartBeat: number;
    type: "move" | "resize";
    initialX: number;
    initialY: number;
    initialStartBeat: number;
    initialDurationBeats: number;
    initialMidiNum: number;
    currentStartBeat: number;
    currentDurationBeats: number;
    currentMidiNum: number;
  } | null>(null);

  // Responsive Zoom & Quantization States
  const [zoomX, setZoomX] = useState(48); // Width of one beat tick in pixels
  const [zoomY, setZoomY] = useState(24); // Height of one row/piano key in pixels
  const [snapResolution, setSnapResolution] = useState(0.25); // 1 = Quarter, 0.5 = 8th, 0.25 = 16th, 0 = Free

  // Alias aliases to keep backward compatibility with old code chunks safely
  const pxPerBeat = zoomX;
  const keyHeight = zoomY;

  const gridScrollContainerRef = useRef<HTMLDivElement>(null);
  const lastBeatRef = useRef<number>(-1);
  const playbackStartRef = useRef<{ time: number, beat: number } | null>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const lastRenderTimeRef = useRef<number>(0);
  const lastActiveNoteIdsRef = useRef<Set<string>>(new Set());
  const lastActiveMidiNumbersRef = useRef<Set<number>>(new Set());
  const scrollLeftRef = useRef<number>(0);
  const noteElementsMapRef = useRef<Record<string, HTMLElement>>({});
  const keyElementsMapRef = useRef<Record<number, HTMLElement>>({});

  // Layout constants — must be declared before any useMemo that references them
  const headerHeight = 24;

  // 1. Calculate cumulative beat ranges for all sections in the song
  const sectionRanges = useMemo(() => {
    let currentAccumulatedBeat = 0;
    return activeSong.sections.map((sec) => {
      let durationBeats = 0;
      if (sec.chords?.chords?.length) {
        durationBeats = sec.chords.chords.reduce((acc, c) => acc + (c.duration || 4), 0);
      } else {
        durationBeats = (sec.chordCount || 4) * 4;
      }
      const range = {
        sectionId: sec.id,
        type: sec.type,
        startBeat: currentAccumulatedBeat,
        endBeat: currentAccumulatedBeat + durationBeats,
        durationBeats
      };
      currentAccumulatedBeat += durationBeats;
      return range;
    });
  }, [activeSong.sections]);

  const totalBeats = useMemo(() => {
    if (sectionRanges.length === 0) return 16;
    return sectionRanges[sectionRanges.length - 1].endBeat;
  }, [sectionRanges]);

  // Helper to assign a premium gradient and border color to tracks
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

  // 2. Fetch reference chord notes for the background
  const referenceChords = useMemo(() => {
    const formatted: Array<{
      id: string;
      pitch: string;
      midiNum: number;
      startBeat: number;
      durationBeats: number;
      trackName: string;
      color: string;
    }> = [];

    activeSong.sections.forEach((sec) => {
      const range = sectionRanges.find((r) => r.sectionId === sec.id);
      if (!range) return;
      const secChords = sec.chords?.chords || [];
      let currentChordStart = range.startBeat;
      secChords.forEach((ch, chIdx) => {
        const chordStartBeat = currentChordStart;
        const chordDuration = ch.duration || 4;
        currentChordStart += chordDuration;
        const pianoNotes = ch.pianoNotes || [];
        pianoNotes.forEach((pitch, pitchIdx) => {
          formatted.push({
            id: `ref-chord-${sec.id}-${chIdx}-${pitch}-${pitchIdx}`,
            pitch,
            midiNum: noteToMidi(pitch),
            startBeat: chordStartBeat,
            durationBeats: chordDuration,
            trackName: ch.chord,
            color: "from-emerald-600/20 to-teal-700/20 dark:from-emerald-500/15 dark:to-teal-600/15 border-emerald-500/30 text-emerald-900/50 dark:text-emerald-50/30"
          });
        });
      });
    });

    return formatted;
  }, [activeSong.sections, sectionRanges]);

  // 3. Fetch active track notes depending on solo/mute state
  const trackNotes = useMemo(() => {
    const formatted: Array<{
      id: string;
      pitch: string;
      midiNum: number;
      startBeat: number;
      durationBeats: number;
      trackName: string;
      color: string;
      trackId: string;
      sectionId: string;
      noteIndex: number;
      sectionStartBeat: number;
      velocity: number;
    }> = [];

    const anySoloed = activeSong.tracks?.some(t => t.soloed) || false;

    (activeSong.tracks || []).forEach((track) => {
      // Si el usuario ha seleccionado explícitamente pistas para visualizar, respetamos esa selección.
      // Si no ha seleccionado ninguna (size === 0), caemos en el comportamiento por defecto (escuchar lo que suena).
      if (visibleTrackIds && visibleTrackIds.size > 0) {
        if (!visibleTrackIds.has(track.id)) return;
      } else {
        if (track.muted) return;
        if (anySoloed && !track.soloed) return;
      }

      const colorClasses = getTrackColorClasses(track.name, track.midiChannel);
      Object.entries(track.sectionNotes || {}).forEach(([secId, secNotes]) => {
        const range = sectionRanges.find((r) => r.sectionId === secId);
        if (!range) return;
        (secNotes || []).forEach((n, nIdx) => {
          formatted.push({
            id: `track-${track.id}-${secId}-${n.note}-${n.startBeat}-${nIdx}`,
            pitch: n.note,
            midiNum: noteToMidi(n.note),
            startBeat: range.startBeat + n.startBeat,
            durationBeats: n.durationBeats,
            trackName: track.name,
            color: colorClasses,
            trackId: track.id,
            sectionId: secId,
            noteIndex: nIdx,
            sectionStartBeat: range.startBeat,
            velocity: n.velocity !== undefined ? n.velocity : 0.7
          });
        });
      });
    });

    return formatted;
  }, [activeSong.tracks, sectionRanges, visibleTrackIds]);

  const selectedNote = useMemo(() => {
    if (!selectedNoteRef) return null;
    return trackNotes.find(n => 
      n.trackId === selectedNoteRef.trackId && 
      n.sectionId === selectedNoteRef.sectionId && 
      n.noteIndex === selectedNoteRef.noteIndex
    ) || null;
  }, [selectedNoteRef, trackNotes]);

  const chordLabels = useMemo(() => {
    const labels: Array<{ startBeat: number, durationBeats: number, name: string }> = [];
    activeSong.sections.forEach(sec => {
      const range = sectionRanges.find(r => r.sectionId === sec.id);
      if (!range) return;
      
      let currentBeat = range.startBeat;
      if (sec.chords?.chords) {
        sec.chords.chords.forEach(ch => {
          const duration = ch.duration || 4;
          labels.push({ startBeat: currentBeat, durationBeats: duration, name: ch.chord });
          currentBeat += duration;
        });
      } else {
        const count = sec.chordCount || 4;
        for (let i = 0; i < count; i++) {
          labels.push({ startBeat: currentBeat, durationBeats: 4, name: "?" });
          currentBeat += 4;
        }
      }
    });
    return labels;
  }, [activeSong.sections, sectionRanges]);

  // 4. Scan note ranges to determine the optimal MIDI range to display
  const midiRange = useMemo(() => {
    let minMidi = 36; // C2 (Default bottom)
    let maxMidi = 84; // C6 (Default top)

    const allMidis = [...referenceChords, ...trackNotes].map((n) => n.midiNum);

    if (allMidis.length > 0) {
      const minNoteMidi = Math.min(...allMidis);
      const maxNoteMidi = Math.max(...allMidis);
      
      // Pad by 3 semitones top and bottom
      minMidi = Math.max(12, Math.min(minMidi, minNoteMidi - 3));
      maxMidi = Math.min(120, Math.max(maxMidi, maxNoteMidi + 3));
    }

    const keys: number[] = [];
    for (let m = maxMidi; m >= minMidi; m--) {
      keys.push(m);
    }

    return {
      keys,
      minMidi,
      maxMidi
    };
  }, [referenceChords, trackNotes]);

  // Memoized Heavy Background Grids (Prevents audio stuttering during state updates)
  const horizontalGridRows = useMemo(() => {
    return midiRange.keys.map((midiNum, idx) => {
      const isBlack = isBlackKey(midiNum);
      return (
        <div
          key={`row-${midiNum}`}
          style={{ 
            position: "absolute",
            top: `${idx * keyHeight + headerHeight}px`,
            left: 0,
            width: "100%",
            height: `${keyHeight}px`
          }}
          className={`border-b border-zinc-200/50 dark:border-zinc-900/30 ${
            isBlack ? "bg-zinc-100/40 dark:bg-zinc-950/40" : "bg-transparent"
          }`}
        />
      );
    });
  }, [midiRange.keys, keyHeight]);

  const verticalGridLines = useMemo(() => {
    const resolution = snapResolution > 0 ? snapResolution : 1;
    const totalDivisions = Math.ceil(totalBeats / resolution);
    return Array.from({ length: totalDivisions }).map((_, idx) => {
      const beatPos = idx * resolution;
      const isMeasureStart = beatPos % 4 === 0;
      const isBeatStart = beatPos % 1 === 0 && !isMeasureStart;

      return (
        <div
          key={`grid-line-${idx}`}
          style={{
            position: "absolute",
            top: `${headerHeight}px`,
            bottom: 0,
            left: `${beatPos * pxPerBeat}px`,
            width: "1px"
          }}
          className={
            isMeasureStart 
              ? "bg-zinc-400 dark:bg-zinc-600 border-l border-zinc-400 dark:border-zinc-600 z-10 opacity-70" 
              : isBeatStart
                ? "border-l border-zinc-300 dark:border-zinc-700/60 border-dashed opacity-50 z-0"
                : "border-l border-zinc-200 dark:border-zinc-800 border-dotted opacity-50 z-0"
          }
        />
      );
    });
  }, [totalBeats, snapResolution, pxPerBeat]);

  // Handle Drag & Drop globally
  useEffect(() => {
    if (!isEditMode || !dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragState) return;
      const dx = e.clientX - dragState.initialX;
      const dy = e.clientY - dragState.initialY;

      if (dragState.type === "move") {
        const rawStartBeat = dragState.initialStartBeat + (dx / pxPerBeat);
        let snappedStartBeat = rawStartBeat;
        
        if (snapResolution > 0) {
          snappedStartBeat = Math.round(rawStartBeat / snapResolution) * snapResolution;
        }
        
        const midiDelta = Math.round(dy / keyHeight);
        
        setDragState(prev => {
          if (!prev) return null;
          return {
            ...prev,
            currentStartBeat: Math.max(0, snappedStartBeat),
            currentMidiNum: Math.max(12, Math.min(120, prev.initialMidiNum - midiDelta))
          };
        });
      } else if (dragState.type === "resize") {
        const rawDuration = dragState.initialDurationBeats + (dx / pxPerBeat);
        let snappedDuration = rawDuration;
        
        if (snapResolution > 0) {
          snappedDuration = Math.round(rawDuration / snapResolution) * snapResolution;
        }
        
        setDragState(prev => {
          if (!prev) return null;
          // Don't allow duration less than the snap resolution (or 0.125 if free)
          const minDuration = snapResolution > 0 ? snapResolution : 0.125;
          return {
            ...prev,
            currentDurationBeats: Math.max(minDuration, snappedDuration)
          };
        });
      }
    };

    const handlePointerUp = () => {
      if (!dragState || !onUpdateNote) {
        setDragState(null);
        return;
      }
      
      const newPitch = midiToNoteName(dragState.currentMidiNum);
      const relativeStartBeat = dragState.currentStartBeat - dragState.sectionStartBeat;

      onUpdateNote(
        dragState.trackId,
        dragState.sectionId,
        dragState.noteIndex,
        {
          pitch: newPitch,
          startBeat: relativeStartBeat,
          durationBeats: dragState.currentDurationBeats
        }
      );
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isEditMode, dragState, onUpdateNote, pxPerBeat, keyHeight]);

  // Keep refs of trackNotes and isEditMode to avoid recreating useEffect
  const trackNotesRef = useRef(trackNotes);
  useEffect(() => {
    trackNotesRef.current = trackNotes;
  }, [trackNotes]);

  const isEditModeRef = useRef(isEditMode);
  useEffect(() => {
    isEditModeRef.current = isEditMode;
  }, [isEditMode]);

  // Populate the note element DOM mapping for fast access
  useEffect(() => {
    noteElementsMapRef.current = {};
    if (gridScrollContainerRef.current) {
      const els = gridScrollContainerRef.current.querySelectorAll("[data-note-id]");
      els.forEach((el) => {
        const id = el.getAttribute("data-note-id");
        if (id) {
          noteElementsMapRef.current[id] = el as HTMLElement;
        }
      });
    }
    lastActiveNoteIdsRef.current = new Set();
  }, [trackNotes]);

  // Populate the keyboard keys DOM mapping for fast access
  useEffect(() => {
    keyElementsMapRef.current = {};
    if (gridScrollContainerRef.current) {
      const els = gridScrollContainerRef.current.querySelectorAll("[data-midi-num]");
      els.forEach((el) => {
        const midi = parseInt(el.getAttribute("data-midi-num") || "", 10);
        if (!isNaN(midi)) {
          keyElementsMapRef.current[midi] = el as HTMLElement;
        }
      });
    }
    lastActiveMidiNumbersRef.current = new Set();
  }, [midiRange.keys]);

  useEffect(() => {
    lastActiveNoteIdsRef.current = new Set();
    lastActiveMidiNumbersRef.current = new Set();
  }, [isPlaying]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    scrollLeftRef.current = e.currentTarget.scrollLeft;
  };

  // 5. Smooth Playhead Interpolator using requestAnimationFrame (60 FPS)
  useEffect(() => {
    if (!isPlaying) {
      playbackStartRef.current = null;
      // Sync static cursor position
      if (playbackSectionId !== null && playbackChordIndex >= 0) {
        const activeSecIndex = activeSong.sections.findIndex((s) => s.id === playbackSectionId);
        let accumulatedStartBeat = 0;
        for (let i = 0; i < activeSecIndex; i++) {
          const sec = activeSong.sections[i];
          if (sec.chords?.chords?.length) {
            accumulatedStartBeat += sec.chords.chords.reduce((acc, c) => acc + (c.duration || 4), 0);
          } else {
            accumulatedStartBeat += (sec.chordCount || 4) * 4;
          }
        }
        
        // Calculate target beat based on chord durations up to playbackChordIndex
        let targetBeat = accumulatedStartBeat;
        const activeSec = activeSong.sections[activeSecIndex];
        if (activeSec?.chords?.chords?.length) {
          for (let c = 0; c < Math.min(playbackChordIndex, activeSec.chords.chords.length); c++) {
            targetBeat += (activeSec.chords.chords[c].duration || 4);
          }
        } else {
          targetBeat += Math.max(0, playbackChordIndex) * 4;
        }
        setCurrentBeat(targetBeat);
        if (playheadRef.current) {
          playheadRef.current.style.left = `${targetBeat * pxPerBeat}px`;
        }

        // Si hacen seek estando pausados, centramos el scroll visualmente
        if (gridScrollContainerRef.current) {
          const container = gridScrollContainerRef.current;
          const playheadPx = 64 + targetBeat * pxPerBeat;
          const width = container.clientWidth - 64;
          if (lastBeatRef.current !== -1 && Math.abs(targetBeat - lastBeatRef.current) > 1.5) {
            const targetScroll = Math.max(0, playheadPx - 64 - width * 0.2);
            container.scrollLeft = targetScroll;
            scrollLeftRef.current = targetScroll;
          }
          lastBeatRef.current = targetBeat;
        }
      } else {
        setCurrentBeat(0);
        if (playheadRef.current) {
          playheadRef.current.style.left = "0px";
        }
      }
      return;
    }

    const activeSecIndex = activeSong.sections.findIndex((s) => s.id === playbackSectionId);
    let sectionStartBeat = 0;
    if (activeSecIndex !== -1) {
      for (let i = 0; i < activeSecIndex; i++) {
        const sec = activeSong.sections[i];
        if (sec.chords?.chords?.length) {
          sectionStartBeat += sec.chords.chords.reduce((acc, c) => acc + (c.duration || 4), 0);
        } else {
          sectionStartBeat += (sec.chordCount || 4) * 4;
        }
      }
    }
    
    let stateBeat = sectionStartBeat;
    const activeSec = activeSong.sections[activeSecIndex];
    if (activeSec?.chords?.chords?.length) {
      for (let c = 0; c < Math.min(Math.max(0, playbackChordIndex), activeSec.chords.chords.length); c++) {
        stateBeat += (activeSec.chords.chords[c].duration || 4);
      }
    } else {
      stateBeat += Math.max(0, playbackChordIndex) * 4;
    }
    const beatDurationSec = 60 / playbackBpm;

    if (!playbackStartRef.current) {
      playbackStartRef.current = { time: performance.now(), beat: stateBeat };
    } else {
      const expectedBeat = playbackStartRef.current.beat + ((performance.now() - playbackStartRef.current.time) / 1000) / beatDurationSec;
      if (Math.abs(expectedBeat - stateBeat) > 2.5) {
        // Only reset the continuous timer if there's a huge jump (e.g. user seeked)
        playbackStartRef.current = { time: performance.now(), beat: stateBeat };
      }
    }

    let animationFrameId: number;

    const animatePlayhead = () => {
      if (!playbackStartRef.current) return;
      
      const now = performance.now();
      const elapsedSec = (now - playbackStartRef.current.time) / 1000;
      const elapsedBeats = elapsedSec / beatDurationSec;
      
      const nextBeat = playbackStartRef.current.beat + elapsedBeats;
      
      // Update DOM directly for smooth 60fps playhead movement without React overhead
      if (playheadRef.current) {
        playheadRef.current.style.left = `${nextBeat * pxPerBeat}px`;
      }

      // Throttle visual highlights update (e.g. 15fps / 66ms) to prevent React diffing overhead and audio stutter
      if (now - lastRenderTimeRef.current > 66) {
        lastRenderTimeRef.current = now;

        // 1. Calculate active midi numbers and note IDs
        const activeMidis = new Set<number>();
        const activeNoteIds = new Set<string>();
        trackNotesRef.current.forEach((n) => {
          if (n.startBeat <= nextBeat && nextBeat < (n.startBeat + n.durationBeats)) {
            activeMidis.add(n.midiNum);
            activeNoteIds.add(n.id);
          }
        });

        // 2. Direct DOM update for keyboard keys that changed state (O(1) lookup)
        const keyMap = keyElementsMapRef.current;
        
        // Keys to turn ON (became active)
        activeMidis.forEach((midiNum) => {
          if (!lastActiveMidiNumbersRef.current.has(midiNum)) {
            const el = keyMap[midiNum];
            if (el) {
              const isBlack = isBlackKey(midiNum);
              const label = el.querySelector(".key-label");
              const ping = el.querySelector(".key-ping-dot");

              if (isBlack) {
                el.className = "w-full flex items-center justify-between px-2 text-[8px] font-bold border-b border-zinc-100 dark:border-zinc-900/60 transition-all bg-purple-500 text-purple-50 shadow-[inset_0_0_12px_rgba(168,85,247,0.8)] border-purple-400 piano-key-active";
              } else {
                el.className = "w-full flex items-center justify-between px-2 text-[8px] font-bold border-b border-zinc-100 dark:border-zinc-900/60 transition-all bg-emerald-500 text-emerald-50 shadow-[inset_0_0_12px_rgba(16,185,129,0.8)] border-emerald-400 piano-key-active";
              }
              if (ping) (ping as HTMLElement).style.display = "block";
              if (label) label.className = "key-label opacity-100 font-black";
            }
          }
        });

        // Keys to turn OFF (became inactive)
        lastActiveMidiNumbersRef.current.forEach((midiNum) => {
          if (!activeMidis.has(midiNum)) {
            const el = keyMap[midiNum];
            if (el) {
              const isBlack = isBlackKey(midiNum);
              const label = el.querySelector(".key-label");
              const ping = el.querySelector(".key-ping-dot");

              if (isBlack) {
                el.className = "w-full flex items-center justify-between px-2 text-[8px] font-bold border-b border-zinc-100 dark:border-zinc-900/60 transition-all bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-900";
              } else {
                el.className = "w-full flex items-center justify-between px-2 text-[8px] font-bold border-b border-zinc-100 dark:border-zinc-900/60 transition-all bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850";
              }
              if (ping) (ping as HTMLElement).style.display = "none";
              if (label) {
                const noteName = el.getAttribute("data-note-name") || "";
                const isC = noteName.startsWith("C");
                label.className = `key-label ${isC ? "opacity-100 font-black" : "opacity-45 font-medium"}`;
              }
            }
          }
        });

        lastActiveMidiNumbersRef.current = activeMidis;

        // 3. Direct DOM update for note blocks that changed state (O(1) lookup)
        const noteMap = noteElementsMapRef.current;

        // Notes to turn ON (became active)
        activeNoteIds.forEach((id) => {
          if (!lastActiveNoteIdsRef.current.has(id)) {
            const el = noteMap[id];
            if (el) {
              const originalColorClasses = el.getAttribute("data-note-color") || "";
              el.className = `rounded-md border text-[8px] font-black px-1.5 flex items-center justify-center select-none overflow-hidden transition-all bg-gradient-to-r z-[25] scale-y-[1.15] scale-x-[1.02] brightness-150 ring-2 ring-white/80 shadow-[0_0_25px_rgba(255,255,255,0.6)] border-white ${originalColorClasses}`;
              el.style.cursor = "pointer";
            }
          }
        });

        // Notes to turn OFF (became inactive)
        lastActiveNoteIdsRef.current.forEach((id) => {
          if (!activeNoteIds.has(id)) {
            const el = noteMap[id];
            if (el) {
              const originalColorClasses = el.getAttribute("data-note-color") || "";
              el.className = `rounded-md border text-[8px] font-black px-1.5 flex items-center justify-center select-none overflow-hidden transition-all bg-gradient-to-r z-[15] opacity-85 hover:opacity-100 hover:scale-y-[1.02] ${isEditModeRef.current ? "hover:ring-2 hover:ring-purple-400/50" : ""} ${originalColorClasses}`;
              el.style.cursor = isEditModeRef.current ? "move" : "default";
            }
          }
        });

        lastActiveNoteIdsRef.current = activeNoteIds;
      }

      if (gridScrollContainerRef.current) {
        const container = gridScrollContainerRef.current;
        const playheadPx = 64 + nextBeat * pxPerBeat;
        const width = container.clientWidth - 64;
        const visibleLeft = scrollLeftRef.current + 64; // Caching scrollLeft to avoid style layout recalculation thrashing
        
        const isSeek = lastBeatRef.current !== -1 && Math.abs(nextBeat - lastBeatRef.current) > 1.5;
        lastBeatRef.current = nextBeat;

        if (isSeek) {
          const targetScroll = Math.max(0, playheadPx - 64 - width * 0.2);
          container.scrollLeft = targetScroll;
          scrollLeftRef.current = targetScroll;
        } else if (playheadPx > visibleLeft + width * 0.85) {
          const targetScroll = playheadPx - 64 - width * 0.15;
          container.scrollLeft = targetScroll;
          scrollLeftRef.current = targetScroll;
        }
      }

      animationFrameId = requestAnimationFrame(animatePlayhead);
    };

    animationFrameId = requestAnimationFrame(animatePlayhead);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, playbackSectionId, playbackChordIndex, playbackBpm, activeSong.sections, pxPerBeat, keyHeight]);

  // 6. Center vertical scroll viewport on the active notes on mount or filter change
  useEffect(() => {
    if (trackNotes.length > 0 && gridScrollContainerRef.current) {
      const container = gridScrollContainerRef.current;
      const noteMidis = trackNotes.map((n) => n.midiNum);
      const avgMidi = Math.round(noteMidis.reduce((a, b) => a + b, 0) / noteMidis.length);
      
      const keyIndex = midiRange.keys.indexOf(avgMidi);
      if (keyIndex !== -1) {
        const topPos = keyIndex * keyHeight - container.clientHeight / 2;
        container.scrollTo({
          top: Math.max(0, topPos),
          behavior: "smooth"
        });
      }
    }
  }, [midiRange.keys, trackNotes]);

  // 8. Calculate which keys are active (played) at the current playhead position
  const activeMidiNumbers = useMemo(() => {
    const active = new Set<number>();
    trackNotes.forEach((n) => {
      if (n.startBeat <= currentBeat && currentBeat < (n.startBeat + n.durationBeats)) {
        active.add(n.midiNum);
      }
    });
    return active;
  }, [trackNotes, currentBeat]);

  const totalHeight = midiRange.keys.length * keyHeight;


  return (
    <div className="w-full h-full flex flex-col">
      {/* Main Piano Roll Container */}
      <div 
        ref={gridScrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto relative bg-zinc-50 dark:bg-[#09090b] select-none scrollbar-thin scrollbar-thumb-zinc-400 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent rounded-xl border border-border/40 shadow-sm"
      >
        {/* Continuous Grid canvas wrapper */}
        <div 
          className="flex relative" 
          style={{ 
            width: `${160 + totalBeats * pxPerBeat}px`, 
            height: `${totalHeight + headerHeight}px` 
          }}
        >
          {/* A. STICKY VERTICAL PIANO KEYBOARD */}
          <div 
            className="w-16 flex-shrink-0 sticky left-0 z-40 border-r border-zinc-200 dark:border-zinc-800 shadow-[4px_0_15px_rgba(0,0,0,0.04)] dark:shadow-[4px_0_15px_rgba(0,0,0,0.4)] bg-zinc-50 dark:bg-[#09090b]"
            style={{ height: `${totalHeight + headerHeight}px` }}
          >
            {/* Top Left Corner intersecting Ruler and Keyboard */}
            <div 
              className="w-full sticky top-0 z-50 bg-zinc-100 dark:bg-zinc-900 border-b border-border/60 flex items-center justify-center shadow-sm"
              style={{ height: `${headerHeight}px` }}
            >
              <span className="text-[8px] font-black text-muted-foreground tracking-widest">PITCH</span>
            </div>

            {midiRange.keys.map((midiNum) => {
              const isBlack = isBlackKey(midiNum);
              const noteName = midiToNoteName(midiNum);
              const isC = noteName.startsWith("C");
              const isActive = activeMidiNumbers.has(midiNum);

              return (
                <div
                  key={midiNum}
                  data-midi-num={midiNum}
                  data-note-name={noteName}
                  style={{ height: `${keyHeight}px` }}
                  className={`w-full flex items-center justify-between px-2 text-[8px] font-bold border-b border-zinc-100 dark:border-zinc-900/60 transition-all ${
                    isBlack
                      ? isActive
                        ? "bg-purple-500 text-purple-50 shadow-[inset_0_0_12px_rgba(168,85,247,0.8)] border-purple-400 piano-key-active"
                        : "bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-900"
                      : isActive
                        ? "bg-emerald-500 text-emerald-50 shadow-[inset_0_0_12px_rgba(16,185,129,0.8)] border-emerald-400 piano-key-active"
                        : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850"
                  }`}
                >
                  <span className={`key-label ${isC || isActive ? "opacity-100 font-black" : "opacity-45 font-medium"}`}>
                    {noteName}
                  </span>
                  <span 
                    className="key-ping-dot w-1.5 h-1.5 rounded-full bg-foreground animate-ping" 
                    style={{ display: isActive ? "block" : "none" }}
                  />
                </div>
              );
            })}
          </div>

          {/* B. SCROLLABLE GRID & NOTE GRAPHICS */}
          <div 
            className="flex-1 relative" 
            style={{ 
              width: `${totalBeats * pxPerBeat}px`, 
              height: `${totalHeight + headerHeight}px` 
            }}
            onPointerDown={() => {
              if (isEditMode) {
                setSelectedNoteRef(null);
              }
            }}
          >
            {/* STICKY MEASURE RULER (Row 1) */}
            <div 
              className="w-full sticky top-0 z-30 bg-zinc-100 dark:bg-zinc-900 backdrop-blur-md border-b border-border/60 shadow-sm flex items-center relative overflow-hidden cursor-pointer"
              style={{ height: `${headerHeight}px` }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const targetBeat = Math.floor(clickX / pxPerBeat);
                
                let accumulatedBeats = 0;
                for (const sec of activeSong.sections) {
                  const chordCount = sec.chords?.chords?.length || sec.chordCount || 4;
                  const secBeats = chordCount * 4;
                  if (targetBeat >= accumulatedBeats && targetBeat < accumulatedBeats + secBeats) {
                    const beatWithinSec = targetBeat - accumulatedBeats;
                    const chordIndex = Math.floor(beatWithinSec / 4);
                    
                    if (setPlaybackSectionId && setPlaybackChordIndex) {
                      const wasPlaying = isPlaying;
                      if (wasPlaying) stopPlayback();
                      
                      setPlaybackSectionId(sec.id);
                      setPlaybackChordIndex(chordIndex);
                      
                      if (wasPlaying && startPlayback) {
                        setTimeout(() => startPlayback(sec.id), 50);
                      }
                    }
                    break;
                  }
                  accumulatedBeats += secBeats;
                }
              }}
            >
              {Array.from({ length: Math.ceil(totalBeats / 4) }).map((_, mIdx) => (
                <div
                  key={`measure-label-${mIdx}`}
                  style={{
                    position: "absolute",
                    left: `${mIdx * 4 * pxPerBeat}px`,
                    width: `${4 * pxPerBeat}px`,
                  }}
                  className="h-full border-l border-border/40 pl-1 flex items-start pt-0.5"
                >
                  <span className="text-[7px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    M{mIdx + 1}
                  </span>
                </div>
              ))}
              
              {/* Chord Labels overlay */}
              {chordLabels.map((chord, idx) => (
                <div
                  key={`chord-label-${idx}`}
                  style={{
                    position: "absolute",
                    left: `${chord.startBeat * pxPerBeat}px`,
                    width: `${chord.durationBeats * pxPerBeat}px`,
                  }}
                  className="h-full flex items-center justify-center pointer-events-none"
                >
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40 px-2 py-[2px] rounded-sm border border-emerald-200 dark:border-emerald-800/60 shadow-sm backdrop-blur-sm truncate max-w-[90%]">
                    {chord.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid horizontal key backgrounds (highlight black key rows) */}
            {horizontalGridRows}

            {/* Grid vertical beat divisions (measures and subdivisions) */}
            {verticalGridLines}

            {/* C. RENDER BACKGROUND CHORD REFERENCE BLOCKS */}
            {referenceChords.map((note) => {
              const noteTop = (midiRange.maxMidi - note.midiNum) * keyHeight;
              const noteWidth = note.durationBeats * pxPerBeat;
              const noteLeft = note.startBeat * pxPerBeat;

              return (
                <div
                  key={note.id}
                  style={{
                    position: "absolute",
                    top: `${noteTop + 1 + headerHeight}px`,
                    left: `${noteLeft}px`,
                    width: `${noteWidth - 2}px`,
                    height: `${keyHeight - 2}px`
                  }}
                  className={`rounded-md border text-[8px] font-black px-1.5 flex items-center justify-between select-none overflow-hidden transition-all bg-gradient-to-r z-[5] pointer-events-none ${note.color}`}
                >
                  <span className="truncate pr-1 uppercase tracking-wide opacity-50">
                    Acorde {note.trackName}
                  </span>
                </div>
              );
            })}

            {/* D. RENDER FOREGROUND ACTIVE TRACK NOTES */}
            <MemoizedTrackNotes 
              trackNotes={trackNotes}
              midiRange={midiRange}
              keyHeight={keyHeight}
              pxPerBeat={pxPerBeat}
              headerHeight={headerHeight}
              currentBeat={currentBeat}
              dragState={dragState}
              selectedNoteRef={selectedNoteRef}
              isEditMode={isEditMode}
              setDragState={setDragState}
              setSelectedNoteRef={setSelectedNoteRef}
            />

            {/* E. GLOWING PLAYHEAD CURSOR */}
            <div
              ref={playheadRef}
              style={{
                position: "absolute",
                top: `${headerHeight}px`,
                bottom: 0,
                width: "2px"
              }}
              className="bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8),0_0_20px_rgba(239,68,68,0.4)] z-20 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Interactive Bottom Toolbar */}
      <div className="p-2 border-t border-border/60 bg-zinc-100 dark:bg-zinc-950 flex flex-wrap gap-4 items-center justify-between shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-30">
        <div className="flex flex-wrap items-center gap-4">
          {/* Edit Toggle */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              isEditMode 
                ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] border-purple-500" 
                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-border"
            } border`}
          >
            {isEditMode ? <Edit2 className="w-3.5 h-3.5" /> : <MousePointer2 className="w-3.5 h-3.5" />}
            {isEditMode ? "EDITANDO" : "VISTA"}
          </button>
          
          <div className="h-5 w-[1px] bg-border/80 mx-1" />
          
          {/* Snap Resolution */}
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-border rounded-md px-2 py-1 shadow-sm">
            <Grid className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[9px] font-black tracking-widest text-muted-foreground uppercase mr-1">Snap</span>
            <select
              value={snapResolution}
              onChange={(e) => setSnapResolution(parseFloat(e.target.value))}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer border-none"
            >
              <option value={1}>1 Beat (Negras)</option>
              <option value={0.5}>1/2 Beat (Corcheas)</option>
              <option value={0.25}>1/4 Beat (Semicorcheas)</option>
              <option value={0.125}>1/8 Beat (Fusas / 1/32)</option>
              <option value={0}>Libre (Sin ajuste)</option>
            </select>
          </div>

          {/* Velocity Control */}
          {selectedNote && (
            <>
              <div className="h-5 w-[1px] bg-border/80 mx-1" />
              <div className="flex items-center gap-3 bg-purple-500/10 dark:bg-purple-500/5 border border-purple-500/30 rounded-lg px-3 py-1 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                <Sliders className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black tracking-wider text-purple-600 dark:text-purple-400 uppercase">Dinámica ({selectedNote.pitch})</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.01"
                      value={selectedNote.velocity}
                      onChange={(e) => {
                        const vel = parseFloat(e.target.value);
                        onUpdateNote?.(
                          selectedNote.trackId,
                          selectedNote.sectionId,
                          selectedNote.noteIndex,
                          {
                            pitch: selectedNote.pitch,
                            startBeat: selectedNote.startBeat - selectedNote.sectionStartBeat,
                            durationBeats: selectedNote.durationBeats,
                            velocity: vel
                          }
                        );
                      }}
                      className="w-24 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600 dark:accent-purple-500"
                    />
                    <span className="text-[10px] font-mono font-bold text-foreground w-16">
                      MIDI: {Math.round(selectedNote.velocity * 127)}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground italic w-24">
                      {(() => {
                        const v = selectedNote.velocity;
                        if (v <= 0.15) return "pp (pianissimo)";
                        if (v <= 0.35) return "p (piano)";
                        if (v <= 0.5) return "mp (mezzo-piano)";
                        if (v <= 0.7) return "mf (mezzo-forte)";
                        if (v <= 0.85) return "f (forte)";
                        return "ff (fortissimo)";
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 rounded-md border border-border p-0.5 shadow-sm">
            <span className="text-[9px] font-black text-muted-foreground px-2 flex items-center gap-1 tracking-widest"><MoveHorizontal className="w-3 h-3 text-sky-500" /> ZOOM X</span>
            <button onClick={() => setZoomX(z => Math.max(12, z - 8))} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm text-zinc-600 dark:text-zinc-300">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setZoomX(z => Math.min(120, z + 8))} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm text-zinc-600 dark:text-zinc-300">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 rounded-md border border-border p-0.5 shadow-sm">
            <span className="text-[9px] font-black text-muted-foreground px-2 flex items-center gap-1 tracking-widest"><MoveVertical className="w-3 h-3 text-sky-500" /> ZOOM Y</span>
            <button onClick={() => setZoomY(z => Math.max(8, z - 4))} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm text-zinc-600 dark:text-zinc-300">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setZoomY(z => Math.min(60, z + 4))} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm text-zinc-600 dark:text-zinc-300">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PianoRollMemoized = React.memo(
  PianoRollComponent,
  (prevProps, nextProps) => {
    // If playing state is changing, we must re-render
    if (prevProps.isPlaying !== nextProps.isPlaying) return false;

    // Check if other props changed (e.g. activeSong, volume, bpm, visible tracks)
    if (
      prevProps.activeSong !== nextProps.activeSong ||
      prevProps.playbackVolume !== nextProps.playbackVolume ||
      prevProps.playbackBpm !== nextProps.playbackBpm ||
      prevProps.visibleTrackIds !== nextProps.visibleTrackIds
    ) {
      return false;
    }

    if (nextProps.isPlaying) {
      // If it is a normal forward step, do NOT re-render (handled by requestAnimationFrame loop directly)
      const isNormalForwardStep =
        prevProps.playbackSectionId === nextProps.playbackSectionId &&
        nextProps.playbackChordIndex - prevProps.playbackChordIndex === 1;

      if (isNormalForwardStep) {
        return true;
      }
    }

    // In all other cases (seeks, pauses, loops), let React re-render normally
    return (
      prevProps.playbackChordIndex === nextProps.playbackChordIndex &&
      prevProps.playbackSectionId === nextProps.playbackSectionId
    );
  }
);

export function PianoRoll(props: PianoRollProps) {
  return <PianoRollMemoized {...props} />;
}
