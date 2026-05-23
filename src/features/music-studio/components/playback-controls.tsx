"use client";

import React from "react";
import { 
  Play, 
  Pause, 
  Square, 
  Repeat, 
  Activity, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Music 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PianoKeyboard } from "./piano-keyboard";
import { SongStructure } from "../schemas/song-generator.schema";

interface RhythmPattern {
  id: string;
  name: string;
  steps: boolean[][];
}

interface PlaybackControlsProps {
  isPlaying: boolean;
  playbackSectionId: string | null;
  playbackChordIndex: number;
  activePlaybackNotes: string[];
  togglePlayback: () => void;
  stopPlayback: () => void;
  playbackMode: "basic" | "rhythm" | "arpeggio";
  setPlaybackMode: (mode: "basic" | "rhythm" | "arpeggio") => void;
  selectedRhythmPattern: string;
  setSelectedRhythmPattern: (pattern: string) => void;
  selectedArpeggioPattern: string;
  setSelectedArpeggioPattern: (pattern: string) => void;
  savedRhythms: RhythmPattern[];
  
  // MIDI
  isMidiSupported: boolean;
  midiOutputs: any[];
  selectedOutputId: string;
  setSelectedOutputId: (id: string) => void;
  midiChannel: number;
  setMidiChannel: (channel: number) => void;
  midiActivity: boolean;

  // Sliders
  playbackVolume: number;
  setPlaybackVolume: (vol: number) => void;
  playbackBpm: number;
  setPlaybackBpm: (bpm: number) => void;

  // Loop mode
  loopMode: "song" | "section" | "off";
  setLoopMode: (mode: "song" | "section" | "off") => void;

  // Humanization
  humanizeAmount: number;
  setHumanizeAmount: (amount: number) => void;

  // Sinfonía AI Modal Trigger
  onOpenTrackComposer: () => void;
}

export function PlaybackControls({
  isPlaying,
  playbackSectionId,
  playbackChordIndex,
  activePlaybackNotes,
  togglePlayback,
  stopPlayback,
  playbackMode,
  setPlaybackMode,
  selectedRhythmPattern,
  setSelectedRhythmPattern,
  selectedArpeggioPattern,
  setSelectedArpeggioPattern,
  savedRhythms,
  isMidiSupported,
  midiOutputs,
  selectedOutputId,
  setSelectedOutputId,
  midiChannel,
  setMidiChannel,
  midiActivity,
  playbackVolume,
  setPlaybackVolume,
  playbackBpm,
  setPlaybackBpm,
  loopMode,
  setLoopMode,
  humanizeAmount,
  setHumanizeAmount,
  onOpenTrackComposer
}: PlaybackControlsProps) {
  return (
    <Card className="border-border/40 shadow-2xl rounded-3xl bg-card/50 dark:bg-zinc-950/40 text-foreground p-6 space-y-6 backdrop-blur-xl relative overflow-hidden border">
      <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      
      {/* Header line */}
      <div className="flex justify-between items-center border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            MIDI SYNTHESIZER / REPRODUCTOR DEL DAW
          </span>
        </div>
        
        {/* Active playing chord display */}
        {isPlaying && playbackSectionId ? (
          <div className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.15)] animate-pulse">
            <Music className="w-3.5 h-3.5" />
            REPRODUCCIÓN ACTIVA
          </div>
        ) : (
          <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Square className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 fill-zinc-350 dark:fill-zinc-650" />
            DETENIDO
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Controls Area: 7 cols */}
        <div className="lg:col-span-7 space-y-5">
          {/* Row 1: Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Play / Pause Toggle Button */}
            <Button
              type="button"
              onClick={togglePlayback}
              className={`rounded-2xl h-12 px-6 font-black shadow-lg flex items-center gap-2 transition-all duration-200 active:scale-[0.97] border-0 text-zinc-950 ${
                isPlaying 
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/20" 
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/20"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-zinc-950 text-zinc-950" />
                  PAUSAR
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-zinc-950 text-zinc-950" />
                  REPRODUCIR
                </>
              )}
            </Button>

            {/* Stop Button */}
            <Button
              type="button"
              onClick={() => stopPlayback()}
              disabled={!isPlaying && playbackChordIndex === -1}
              className="rounded-2xl h-12 px-5 bg-zinc-155 hover:bg-zinc-200 dark:bg-zinc-900/60 border border-zinc-250 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white font-bold flex items-center gap-2 transition-all duration-200 active:scale-[0.97] disabled:opacity-40"
            >
              <Square className="w-4 h-4 fill-zinc-500 dark:fill-zinc-400 text-zinc-500 dark:text-zinc-400" />
              DETENER
            </Button>

            {/* Sinfonía AI / Arreglista Multitrack Button */}
            <Button
              type="button"
              onClick={onOpenTrackComposer}
              className="rounded-2xl h-12 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold shadow-lg shadow-purple-500/20 border border-purple-500/30 flex items-center gap-2 transition-all duration-200 active:scale-[0.97]"
            >
              <Music className="w-4 h-4 fill-white animate-pulse" />
              SINFONÍA AI (PISTAS)
            </Button>
          </div>

          {/* Row 2: Selectors & Loops */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Playback Mode Selector */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
              <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                MODO DE REPRODUCCIÓN
              </label>
              <select
                value={playbackMode}
                onChange={(e) => setPlaybackMode(e.target.value as "basic" | "rhythm" | "arpeggio")}
                className="rounded-2xl border border-border dark:border-zinc-800 bg-background dark:bg-zinc-900/50 text-foreground dark:text-zinc-200 h-12 px-4 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-muted dark:hover:bg-zinc-900 transition-colors cursor-pointer select-none"
              >
                <option value="basic">🎵 Modo Básico</option>
                <option value="rhythm">🥁 Modo Ritmos Presets</option>
                <option value="arpeggio">✨ Modo Arpegios</option>
              </select>
            </div>

            {/* Popular Rhythm Pattern Selector */}
            {playbackMode === "rhythm" && (
              <div className="flex flex-col gap-1.5 flex-1 min-w-[180px] animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                  PATRÓN DE RITMO
                </label>
                <select
                  value={selectedRhythmPattern}
                  onChange={(e) => setSelectedRhythmPattern(e.target.value)}
                  className="rounded-2xl border border-border dark:border-zinc-800 bg-background dark:bg-zinc-900/50 text-emerald-650 dark:text-emerald-400 h-12 px-4 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-muted dark:hover:bg-zinc-900 transition-colors cursor-pointer select-none"
                  title="Elige un patrón rítmico que combina acordes y arpegios"
                >
                  <option value="pop-ballad">🎹 Balada Pop (Dinámico)</option>
                  <option value="classical-alberti">🎼 Alberti Clásico (Varios)</option>
                  <option value="neo-soul-arpeggio">🌌 Neo-Soul / Mixto (Grace)</option>
                  <option value="bossa-nova">🥁 Bossa Nova (Swingoff)</option>
                  <option value="lofi-chill">☕ Lo-Fi Chill (Reversed)</option>
                  <option value="salsa-tumbao">💃 Salsa Tumbao (Blazing)</option>
                  <option value="bachata-bolero">🌴 Bachata Majao (Offbeat)</option>
                  <option value="reggaeton-dembow">🔥 Reggaeton Dembow (Fills)</option>
                  <option value="bolero-romantico">🌹 Bolero Romántico (Rubato)</option>
                  <option value="jazz-swing">🕶️ Jazz Swing (Charleston)</option>
                  <option value="boogie-woogie">⚡ Boogie-Woogie Rock</option>
                  <option value="funk-clav">🎸 Funk Clav Comping</option>
                  <option value="ambient-drone">🌌 Swell Drone Cinematográfico</option>
                  <option value="cumbia-colombiana">🌴 Cumbia Colombiana (Contratiempo)</option>
                  <option value="edm-house">🔥 House / EDM (4-on-the-Floor)</option>
                  <option value="rb-trap-soul">🎧 Smooth R&B / Trap Soul</option>
                  <option value="flamenco-rumba">💃 Rumba Flamenca (Ventilador)</option>
                </select>
              </div>
            )}

            {/* Premium Arpeggio Pattern Selector */}
            {playbackMode === "arpeggio" && (
              <div className="flex flex-col gap-1.5 flex-1 min-w-[180px] animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                  PATRÓN DE ARPEGIO
                </label>
                <select
                  value={selectedArpeggioPattern}
                  onChange={(e) => setSelectedArpeggioPattern(e.target.value)}
                  className="rounded-2xl border border-border dark:border-zinc-800 bg-background dark:bg-zinc-900/50 text-emerald-655 dark:text-emerald-400 h-12 px-4 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-muted dark:hover:bg-zinc-900 transition-colors cursor-pointer select-none"
                  title="Elige un patrón de arpegio premium"
                >
                  <option value="up-down">🏔️ Triángulo (Up-Down)</option>
                  <option value="up">📈 Ascendente (Up)</option>
                  <option value="down">📉 Descendente (Down)</option>
                  <option value="down-up">🏜️ Valle (Down-Up)</option>
                  <option value="cross">🌀 Espiral Cruzado</option>
                  <option value="double-strike">⚡ Doble Nota (Legato)</option>
                  <option value="random">🎲 Aleatorio (Random)</option>
                  <option value="cascade">💎 Cascada Brillante (16th)</option>
                </select>
              </div>
            )}

            {/* Loop Switch Toggle */}
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                MODO DE BUCLE
              </label>
              <div className="flex items-center gap-1 bg-muted/40 dark:bg-zinc-900/40 p-1 rounded-2xl border border-border/50 dark:border-zinc-800/80 h-12">
                <button
                  type="button"
                  onClick={() => setLoopMode(loopMode === "song" ? "off" : "song")}
                  className={`flex-1 h-full rounded-xl text-[10px] font-black px-2 transition-all duration-150 ${
                    loopMode === "song"
                      ? "bg-emerald-500/15 text-emerald-650 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"
                      : "text-muted-foreground hover:bg-muted/80 dark:hover:bg-zinc-800/40 hover:text-foreground dark:hover:text-zinc-200"
                  }`}
                  title="Buclear toda la canción"
                >
                  <Repeat className="w-3.5 h-3.5 inline mr-1" />
                  CANCIÓN
                </button>
                <button
                  type="button"
                  onClick={() => setLoopMode(loopMode === "section" ? "off" : "section")}
                  className={`flex-1 h-full rounded-xl text-[10px] font-black px-2 transition-all duration-150 ${
                    loopMode === "section"
                      ? "bg-emerald-500/15 text-emerald-650 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"
                      : "text-muted-foreground hover:bg-muted/80 dark:hover:bg-zinc-800/40 hover:text-foreground dark:hover:text-zinc-200"
                  }`}
                  title="Buclear sólo la sección activa"
                >
                  <Repeat className="w-3.5 h-3.5 inline mr-1" />
                  SECCIÓN
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Sliders Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Real-time BPM Slider */}
            <div className="space-y-2 bg-muted/20 dark:bg-zinc-900/20 p-4 rounded-2xl border border-border/40 dark:border-zinc-850/40">
              <div className="flex justify-between text-xs font-bold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Tempo (BPM)
                </span>
                <span className="font-mono font-black text-emerald-650 dark:text-emerald-400">{playbackBpm} BPM</span>
              </div>
              <input
                type="range"
                min={40}
                max={220}
                value={playbackBpm}
                onChange={(e) => setPlaybackBpm(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
              />
            </div>

            {/* Real-time Volume Slider */}
            <div className="space-y-2 bg-muted/20 dark:bg-zinc-900/20 p-4 rounded-2xl border border-border/40 dark:border-zinc-850/40">
              <div className="flex justify-between text-xs font-bold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  {playbackVolume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  Volumen Progresiones
                </span>
                <span className="font-mono font-black text-emerald-655 dark:text-emerald-400">{Math.round(playbackVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={playbackVolume}
                onChange={(e) => setPlaybackVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
              />
            </div>
            
            {/* Real-time Humanization Slider */}
            <div className="space-y-2 bg-muted/20 dark:bg-zinc-900/20 p-4 rounded-2xl border border-border/40 dark:border-zinc-850/40 sm:col-span-2">
              <div className="flex justify-between text-xs font-bold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Groove / Humanización (Swing & Strum)
                </span>
                <span className="font-mono font-black text-purple-650 dark:text-purple-400">{Math.round(humanizeAmount * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={humanizeAmount}
                onChange={(e) => setHumanizeAmount(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: MIDI Devices Configuration Bar (MIDI Output Only) */}
          <div className="bg-muted/20 dark:bg-zinc-900/20 border border-border/40 dark:border-zinc-850/40 p-4 rounded-2xl space-y-3.5">
            <div className="flex items-center gap-2 border-b border-border/30 dark:border-zinc-900/40 pb-2">
              <span className={`w-2 h-2 rounded-full transition-all duration-100 ${midiActivity ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] scale-[1.2]' : 'bg-zinc-350 dark:bg-zinc-800'}`} />
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                RUTEO MIDI DE SALIDA (SINTETIZADORES EXTERNOS / DAW)
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              {/* MIDI Output Select */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                  DISPOSITIVO MIDI
                </label>
                {isMidiSupported ? (
                  <select
                    value={selectedOutputId}
                    onChange={(e) => setSelectedOutputId(e.target.value)}
                    className="w-full rounded-xl border border-border dark:border-zinc-800 bg-background dark:bg-zinc-900/50 text-foreground dark:text-zinc-300 h-10 px-3 text-[11px] font-bold focus:outline-none hover:bg-muted dark:hover:bg-zinc-900 transition-colors cursor-pointer select-none"
                  >
                    <option value="">🚫 Ninguno (Solo instrumentos web)</option>
                    {midiOutputs.map((output) => (
                      <option key={output.id} value={output.id}>
                        🎛️ {output.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[10px] text-amber-600 dark:text-amber-500/80 bg-amber-500/5 p-2 rounded-xl border border-amber-500/10 italic">
                    Web MIDI no soportado en este navegador (se recomienda Chrome/Edge)
                  </div>
                )}
              </div>

              {/* MIDI Channel Select */}
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                  CANAL MIDI
                </label>
                <select
                  value={midiChannel}
                  onChange={(e) => setMidiChannel(parseInt(e.target.value, 10))}
                  disabled={!selectedOutputId}
                  className="w-full rounded-xl border border-border dark:border-zinc-800 bg-background dark:bg-zinc-900/50 text-foreground dark:text-zinc-300 h-10 px-3 text-[11px] font-bold focus:outline-none hover:bg-muted dark:hover:bg-zinc-900 transition-colors disabled:opacity-45 disabled:hover:bg-background cursor-pointer disabled:cursor-not-allowed select-none"
                >
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                    <option key={ch} value={ch}>
                      Canal {ch}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Master Synthesizer Piano Keyboard Output visualizer: 5 cols */}
        <div className="lg:col-span-5 bg-muted/10 dark:bg-zinc-950/50 border border-border/40 dark:border-zinc-850 p-5 rounded-2xl space-y-4 h-full flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground border-b border-border/30 dark:border-zinc-900 pb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-widest text-muted-foreground">
                <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                MONITOR DE NOTAS (LIVE)
              </span>
            </div>
            
            <div className="min-h-[48px] flex items-center justify-start">
              {isPlaying && activePlaybackNotes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {activePlaybackNotes.map(note => (
                    <span key={note} className="font-mono font-black text-emerald-650 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30 text-[10px] shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                      {note}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-650 uppercase tracking-wide">
                  SILENCIO / SIN EVENTOS MIDI
                </span>
              )}
            </div>
          </div>
          
          <div className="pt-2">
            <PianoKeyboard activeNotes={activePlaybackNotes} />
          </div>
        </div>
      </div>
    </Card>
  );
}
