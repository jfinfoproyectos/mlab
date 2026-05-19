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
  playbackPreset: string;
  setPlaybackPreset: (preset: string) => void;
  playbackMode: "basic" | "rhythm" | "arpeggio" | "custom-rhythm";
  setPlaybackMode: (mode: "basic" | "rhythm" | "arpeggio" | "custom-rhythm") => void;
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
}

export function PlaybackControls({
  isPlaying,
  playbackSectionId,
  playbackChordIndex,
  activePlaybackNotes,
  togglePlayback,
  stopPlayback,
  playbackPreset,
  setPlaybackPreset,
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
  setLoopMode
}: PlaybackControlsProps) {
  return (
    <Card className="border-primary/20 shadow-lg rounded-3xl bg-zinc-950/85 dark:bg-zinc-950/90 text-zinc-100 p-5 space-y-4 backdrop-blur-md relative overflow-hidden">
      <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      
      {/* Header line */}
      <div className="flex justify-between items-center border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
            MIDI SYNTHESIZER / REPRODUCTOR DEL DAW
          </span>
        </div>
        
        {/* Active playing chord display */}
        {isPlaying && playbackSectionId ? (
          <div className="text-xs font-black bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
            <Music className="w-3.5 h-3.5" />
            Reproduciendo: {activePlaybackNotes.length > 0 ? "Acorde Activo" : "Silencio"}
          </div>
        ) : (
          <div className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5">
            <Square className="w-3.5 h-3.5" />
            Detenido
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Controls Area: 7 cols */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Play / Pause Toggle Button */}
            <Button
              type="button"
              onClick={togglePlayback}
              className={`rounded-xl h-11 px-5 font-bold shadow-md flex items-center gap-2 transition-all active:scale-[0.98] ${
                isPlaying 
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/20" 
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/20"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 text-white fill-white" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-white fill-white" />
                  Reproducir Canción
                </>
              )}
            </Button>

            {/* Stop Button */}
            <Button
              type="button"
              onClick={stopPlayback}
              disabled={!isPlaying && playbackChordIndex === -1}
              variant="outline"
              className="rounded-xl h-11 px-4 border-zinc-800 hover:bg-zinc-900 hover:text-white text-zinc-300 flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-zinc-400 text-zinc-400" />
              Detener
            </Button>

            {/* Sound Preset Selector */}
            <div className="flex flex-col gap-1 min-w-[130px]">
              <select
                value={playbackPreset}
                onChange={(e) => setPlaybackPreset(e.target.value)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-200 h-11 px-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-zinc-800 transition-colors"
              >
                <option value="grand-piano">🎹 Piano de Cola</option>
                <option value="vintage-rhodes">🎼 Vintage Rhodes</option>
                <option value="dream-pads">🌌 Pads de Ensueño</option>
                <option value="8bit-synth">👾 Retro 8-Bit</option>
              </select>
            </div>

            {/* Playback Mode Selector */}
            <div className="flex flex-col gap-1 min-w-[130px]">
              <select
                value={playbackMode}
                onChange={(e) => setPlaybackMode(e.target.value as "basic" | "rhythm" | "arpeggio" | "custom-rhythm")}
                className="rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200 h-11 px-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <option value="basic">🎵 Modo Básico</option>
                <option value="rhythm">🥁 Modo Ritmos Presets</option>
                <option value="arpeggio">✨ Modo Arpegios</option>
                <option value="custom-rhythm">🛠️ Ritmos Personalizados</option>
              </select>
            </div>

            {/* Popular Rhythm Pattern Selector */}
            {playbackMode === "rhythm" && (
              <div className="flex flex-col gap-1 min-w-[170px] animate-in slide-in-from-left-2 duration-300">
                <select
                  value={selectedRhythmPattern}
                  onChange={(e) => setSelectedRhythmPattern(e.target.value)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 text-emerald-400 h-11 px-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-zinc-900 transition-colors cursor-pointer"
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
              <div className="flex flex-col gap-1 min-w-[170px] animate-in slide-in-from-left-2 duration-300">
                <select
                  value={selectedArpeggioPattern}
                  onChange={(e) => setSelectedArpeggioPattern(e.target.value)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 text-emerald-400 h-11 px-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-zinc-900 transition-colors cursor-pointer"
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
            <div className="flex items-center gap-1 bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800/80">
              <button
                type="button"
                onClick={() => setLoopMode(loopMode === "song" ? "off" : "song")}
                className={`p-1.5 rounded-lg text-[10px] font-extrabold px-2.5 transition-all ${
                  loopMode === "song"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
                title="Buclear toda la canción"
              >
                <Repeat className="w-3.5 h-3.5 inline mr-1" />
                BUCLE CANCIÓN
              </button>
              <button
                type="button"
                onClick={() => setLoopMode(loopMode === "section" ? "off" : "section")}
                className={`p-1.5 rounded-lg text-[10px] font-extrabold px-2.5 transition-all ${
                  loopMode === "section"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
                title="Buclear sólo la sección activa"
              >
                <Repeat className="w-3.5 h-3.5 inline mr-1" />
                BUCLE SECCIÓN
              </button>
            </div>
          </div>

          {/* Sliders Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Real-time BPM Slider */}
            <div className="space-y-1.5 bg-zinc-900/30 p-3 rounded-2xl border border-zinc-900/60">
              <div className="flex justify-between text-xs font-bold text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  Tempo (BPM)
                </span>
                <span className="font-mono text-emerald-400">{playbackBpm} BPM</span>
              </div>
              <input
                type="range"
                min={40}
                max={220}
                value={playbackBpm}
                onChange={(e) => setPlaybackBpm(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Real-time Volume Slider */}
            <div className="space-y-1.5 bg-zinc-900/30 p-3 rounded-2xl border border-zinc-900/60">
              <div className="flex justify-between text-xs font-bold text-zinc-400">
                <span className="flex items-center gap-1.5">
                  {playbackVolume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  Volumen Master
                </span>
                <span className="font-mono text-emerald-400">{Math.round(playbackVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={playbackVolume}
                onChange={(e) => setPlaybackVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {/* MIDI Devices Configuration Bar (MIDI Output Only) */}
          <div className="pt-3.5 border-t border-zinc-900 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            {/* MIDI Output Select */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                Sincronización MIDI (Salida a Sintetizador / DAW)
                <span className={`w-1.5 h-1.5 rounded-full transition-all duration-100 ${midiActivity ? 'bg-emerald-400 shadow-md shadow-emerald-500/50 scale-[1.3]' : 'bg-zinc-800'}`} />
              </label>
              {isMidiSupported ? (
                <select
                  value={selectedOutputId}
                  onChange={(e) => setSelectedOutputId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 h-9 px-3 text-[11px] font-semibold focus:outline-none hover:bg-zinc-800 transition-colors"
                >
                  <option value="">🚫 Ninguno (Solo instrumentos web)</option>
                  {midiOutputs.map((output) => (
                    <option key={output.id} value={output.id}>
                      🎛️ {output.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-[10px] text-amber-500/80 bg-amber-500/5 p-2 rounded-xl border border-amber-500/10 italic">
                  Web MIDI no soportado en este navegador (se recomienda Chrome/Edge)
                </div>
              )}
            </div>

            {/* MIDI Channel Select */}
            <div className="space-y-1 sm:col-span-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                Canal MIDI
              </label>
              <select
                value={midiChannel}
                onChange={(e) => setMidiChannel(parseInt(e.target.value, 10))}
                disabled={!selectedOutputId}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 h-9 px-3 text-[11px] font-semibold focus:outline-none hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:hover:bg-zinc-900 cursor-pointer disabled:cursor-not-allowed"
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

        {/* Master Synthesizer Piano Keyboard Output visualizer: 5 cols */}
        <div className="lg:col-span-5 border-l border-zinc-900 pl-0 lg:pl-5 space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 px-0.5">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-500" />
              MONITOR DE SALIDA DE AUDIO (LIVE)
            </span>
            {isPlaying && activePlaybackNotes.length > 0 && (
              <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {activePlaybackNotes.join(' ')}
              </span>
            )}
          </div>
          <PianoKeyboard activeNotes={activePlaybackNotes} />
        </div>
      </div>
    </Card>
  );
}
