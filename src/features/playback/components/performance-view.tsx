"use client";

import React, { useMemo, useEffect, useRef } from "react";
import { Play, Pause, Square, Music, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PianoKeyboard } from '@/features/piano-roll/components/piano-keyboard';
import { SongStructure } from '@/features/song-composer/schemas/song-generator.schema';

interface PerformanceViewProps {
  activeSong: SongStructure | null;
  isPlaying: boolean;
  playbackSectionId: string | null;
  playbackChordIndex: number;
  activePlaybackNotes: string[];
  activeNoteIds: string[];
  playbackBpm: number;
  togglePlayback: () => void;
  stopPlayback: () => void;
  setPlaybackSectionId: (id: string | null) => void;
  setPlaybackChordIndex: (index: number) => void;
}

export function PerformanceView({
  activeSong,
  isPlaying,
  playbackSectionId,
  playbackChordIndex,
  activePlaybackNotes,
  activeNoteIds,
  playbackBpm,
  togglePlayback,
  stopPlayback,
  setPlaybackSectionId,
  setPlaybackChordIndex,
}: PerformanceViewProps) {
  // Flatten song structure into an array of sections with chords
  const timeline = useMemo(() => {
    if (!activeSong || !activeSong.sections) return [];
    return activeSong.sections.map((section) => ({
      id: section.id,
      type: section.type,
      chords: section.chords?.chords || [],
      lyrics: section.lyrics,
    }));
  }, [activeSong]);

  const vocalTrack = useMemo(() => {
    if (!activeSong || !activeSong.tracks) return null;
    return activeSong.tracks.find(t => t.name === "Voz Principal");
  }, [activeSong]);

  const activeVocalNotes = useMemo(() => {
    if (!vocalTrack || !playbackSectionId) return [];
    return vocalTrack.sectionNotes[playbackSectionId] || [];
  }, [vocalTrack, playbackSectionId]);
  
  const hasSyllables = activeVocalNotes.some(n => n.syllable);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeChordRef = useRef<HTMLDivElement>(null);

  // Track history of played notes for Karaoke style highlighting
  const [playedNoteIds, setPlayedNoteIds] = React.useState<Set<string>>(new Set());

  useEffect(() => {
    setPlayedNoteIds(prev => {
      if (activeNoteIds.length === 0) return prev;
      const next = new Set(prev);
      activeNoteIds.forEach(id => next.add(id));
      return next;
    });
  }, [activeNoteIds]);

  // Clear karaoke history when playback stops or section changes
  useEffect(() => {
    setPlayedNoteIds(new Set());
  }, [isPlaying, playbackSectionId]);

  // Flatten chords and calculate absolute timing
  const flatChords = useMemo(() => {
    const chords: Array<{
      chord: string;
      duration: number;
      sIdx: number;
      sectionId: string;
      cIdx: number;
      startBeat: number;
      pianoNotes: string[];
    }> = [];
    
    let currentBeat = 0;
    timeline.forEach((section, sIdx) => {
      section.chords.forEach((chordObj, cIdx) => {
        const duration = chordObj.duration || 4;
        chords.push({
          chord: chordObj.chord,
          duration,
          sIdx,
          sectionId: section.id,
          cIdx,
          startBeat: currentBeat,
          pianoNotes: chordObj.pianoNotes || [],
        });
        currentBeat += duration;
      });
    });
    return chords;
  }, [timeline]);

  // Group into measures (assuming 4/4 time)
  const totalBeats = flatChords.length > 0 
    ? flatChords[flatChords.length - 1].startBeat + flatChords[flatChords.length - 1].duration 
    : 0;
  const totalMeasures = Math.ceil(totalBeats / 4);
  const measures = Array.from({ length: totalMeasures }).map((_, mIdx) => {
    const measureStartBeat = mIdx * 4;
    const measureEndBeat = measureStartBeat + 4;
    
    // Find chords that overlap this measure
    const overlappingChords = flatChords.filter(c => 
      c.startBeat < measureEndBeat && (c.startBeat + c.duration) > measureStartBeat
    ).map(c => {
      // Calculate intersection with this measure
      const startInMeasure = Math.max(0, c.startBeat - measureStartBeat);
      const endInMeasure = Math.min(4, c.startBeat + c.duration - measureStartBeat);
      const durationInMeasure = endInMeasure - startInMeasure;
      
      return {
        ...c,
        startInMeasure,
        durationInMeasure
      };
    });
    
    return { mIdx, overlappingChords };
  });

  // Track active measure to scroll to it
  const activeMeasureIndex = Math.floor((flatChords.find(c => c.sectionId === playbackSectionId && c.cIdx === playbackChordIndex)?.startBeat || 0) / 4);

  useEffect(() => {
    if (isPlaying && activeChordRef.current && containerRef.current) {
      activeChordRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
  }, [playbackSectionId, playbackChordIndex, isPlaying]);

  const activeSection = timeline.find(s => s.id === playbackSectionId);
  const currentChordNotes = useMemo(() => {
    if (!activeSection || playbackChordIndex < 0 || playbackChordIndex >= activeSection.chords.length) return [];
    return activeSection.chords[playbackChordIndex].pianoNotes || [];
  }, [activeSection, playbackChordIndex]);

  const combinedNotes = useMemo(() => {
    return Array.from(new Set([...activePlaybackNotes, ...currentChordNotes]));
  }, [activePlaybackNotes, currentChordNotes]);

  const handleChordClick = (sectionId: string, chordIndex: number) => {
    setPlaybackSectionId(sectionId);
    setPlaybackChordIndex(chordIndex);
    if (isPlaying) {
      togglePlayback();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 text-white rounded-none md:rounded-3xl overflow-hidden relative shadow-2xl border-0 md:border md:border-zinc-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 p-2 rounded-xl">
              <Music className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black uppercase tracking-wider">
                Modo Interpretación
              </h2>
              <p className="text-[10px] md:text-xs text-zinc-400 font-medium">
                {activeSong?.title || "Sin título"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-zinc-800/50 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-zinc-700/50">
              <Activity className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
              <span className="font-mono text-xs md:text-sm font-bold text-emerald-400">
                {playbackBpm} BPM
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={togglePlayback}
                size="icon"
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg ${
                  isPlaying 
                    ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20" 
                    : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                }`}
              >
                {isPlaying ? <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" /> : <Play className="w-5 h-5 md:w-6 md:h-6 fill-current ml-1" />}
              </Button>
              <Button
                type="button"
                onClick={stopPlayback}
                size="icon"
                variant="outline"
                className="w-10 h-10 md:w-12 md:h-12 rounded-full border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:text-white hover:bg-zinc-700"
              >
                <Square className="w-4 h-4 md:w-5 md:h-5 fill-current" />
              </Button>
            </div>
          </div>
        </div>

        {/* Karaoke Panel */}
        {activeSong?.sections.some(s => s.lyrics) && (
          <div className="w-full bg-black/80 border-b border-emerald-900/30 p-6 md:p-8 flex flex-col items-center justify-center min-h-[140px] z-10 shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),transparent_70%)]"></div>
            
            <p className="text-[10px] md:text-xs text-emerald-500/60 font-bold tracking-widest uppercase mb-2 z-10">
              {activeSection?.type || "Letra"}
            </p>
            <h3 className={`text-xl md:text-3xl font-black text-center max-w-4xl leading-relaxed z-10 transition-all duration-300 ${isPlaying ? "scale-105" : "text-zinc-500"}`}>
              {hasSyllables ? (
                activeVocalNotes.map((note, idx) => {
                  if (!note.syllable) return null;
                  const isActive = note.id && activeNoteIds.includes(note.id);
                  // Ensure spaces are rendered if the syllable ends or starts with a space
                  // Or just assume syllables are chunks. Usually AI might include spaces or dashes.
                  const isLastInWord = !note.syllable.endsWith("-");
                  const displayText = note.syllable.replace(/-$/, ""); // Remove hyphen for display if you want, or keep it. Let's keep it for visual clarity but add space after if it doesn't have it.
                  
                  return (
                    <span key={note.id || idx}>
                      <span 
                        className={`inline-block transition-all duration-150 ${
                          isActive 
                            ? "text-emerald-300 drop-shadow-[0_0_15px_rgba(16,185,129,0.9)] scale-110 -translate-y-1" 
                            : playedNoteIds.has(note.id!) 
                              ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                              : "text-zinc-600"
                        }`}
                      >
                        {displayText}
                      </span>
                      {isLastInWord && <span className="inline-block w-2 md:w-3"></span>}
                    </span>
                  );
                })
              ) : (
                <span className={isPlaying ? "text-emerald-50 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" : ""}>
                  {activeSection?.lyrics || (isPlaying ? "..." : "Selecciona una sección para cantar")}
                </span>
              )}
            </h3>
          </div>
        )}

        {/* Timeline Area (Measures Grid) */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 relative z-10"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="flex flex-wrap gap-3 md:gap-4">
            {measures.map((measure) => {
              const isActiveMeasure = measure.mIdx === activeMeasureIndex;
              
              return (
                <div 
                  key={measure.mIdx}
                  ref={isActiveMeasure ? activeChordRef as React.RefObject<HTMLDivElement> : null}
                  className={`relative h-20 md:h-24 rounded-lg border flex flex-col transition-colors flex-auto min-w-[140px] max-w-full ${
                    isActiveMeasure ? "border-emerald-500/50 bg-emerald-950/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "border-zinc-800/80 bg-zinc-900/30"
                  }`}
                >
                  {/* Measure Header */}
                  <div className={`text-[10px] md:text-xs font-mono font-bold px-2 py-0.5 border-b z-10 shrink-0 ${
                    isActiveMeasure ? "bg-emerald-900/40 text-emerald-400 border-emerald-500/30" : "bg-zinc-800/50 text-zinc-500 border-zinc-800/80"
                  }`}>
                    Compás {measure.mIdx + 1}
                  </div>
                  
                  {/* Measure Grid Lines (4 beats) */}
                  <div className="absolute inset-0 top-5 flex z-0 opacity-20 pointer-events-none">
                    {[0, 1, 2, 3].map(beat => (
                      <div key={beat} className="flex-1 border-r border-zinc-700/50 last:border-r-0 h-full min-w-[30px]" />
                    ))}
                  </div>

                  {/* Chords */}
                  <div className="relative flex-1 w-full z-10 p-1 flex gap-1">
                    {measure.overlappingChords.map((chord, idx) => {
                      const isActiveChord = playbackSectionId === chord.sectionId && playbackChordIndex === chord.cIdx;
                      
                      const widthPercent = (chord.durationInMeasure / 4) * 100;
                      
                      // Calculate gap from previous chord if any
                      const prevEnd = idx === 0 ? 0 : measure.overlappingChords[idx-1].startInMeasure + measure.overlappingChords[idx-1].durationInMeasure;
                      const gapPercent = ((chord.startInMeasure - prevEnd) / 4) * 100;
                      
                      return (
                        <div
                          key={`${chord.sectionId}-${chord.cIdx}-${idx}`}
                          onClick={() => handleChordClick(chord.sectionId, chord.cIdx)}
                          className={`rounded-md flex items-center justify-center transition-all duration-200 border border-transparent cursor-pointer flex-shrink-0
                            ${isActiveChord 
                              ? "bg-emerald-500 text-zinc-950 font-black shadow-[0_0_12px_rgba(52,211,153,0.6)] scale-[1.02] z-30" 
                              : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 hover:border-zinc-500 z-10 hover:z-20"
                            }
                          `}
                          style={{
                            marginLeft: gapPercent > 0 ? `${gapPercent}%` : '0px',
                            width: `calc(${widthPercent}% - 4px)`,
                            minWidth: 'max-content',
                            padding: '0 8px'
                          }}
                        >
                          <span className={`whitespace-nowrap ${widthPercent < 25 ? 'text-xs' : 'text-sm md:text-base'} font-bold text-center leading-none`}>
                            {chord.chord}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Piano */}
        <div className="shrink-0 bg-zinc-900 border-t border-zinc-800 p-2 md:p-4 flex justify-center shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-20">
          <div className="w-full max-w-5xl rounded-lg overflow-hidden border border-zinc-700/50 shadow-2xl">
            {/* The activePlaybackNotes will illuminate the exact keys being played, combined with the chord inversion notes */}
            <PianoKeyboard activeNotes={combinedNotes} />
          </div>
        </div>
    </div>
  );
}
