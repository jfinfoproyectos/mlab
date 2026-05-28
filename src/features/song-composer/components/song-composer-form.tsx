"use client";

import React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Upload, Wand2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { songInputSchema, SongInput, SongStructure } from '@/features/song-composer/schemas/song-generator.schema';
import { enhanceTextAction } from '@/features/song-composer/actions/song-generator.actions';

interface SongComposerFormProps {
  loading: boolean;
  onGenerateSong: (data: SongInput) => void;
  onImportSong: (song: SongStructure) => void;
  onCreateEmptySong: () => void;
}

const PRESETS = [
  { label: "Balada Pop Romántica", prompt: "Balada pop romántica emotiva, tempo moderado, final esperanzador" },
  { label: "Jazz Neo-Soul Sofisticado", prompt: "Neo-soul ultra relajado con armonías de novena, tempo lento y nocturno" },
  { label: "Pop Enérgico Brillante", prompt: "Pop de sintetizador brillante y enérgico, tempos rápidos y acordes mayores" },
  { label: "Lo-Fi Melancólico Nocturno", prompt: "Lo-fi nostálgico con acordes menores, vibración nocturna y otoñal" }
];

export function SongComposerForm({
  loading,
  onGenerateSong,
  onImportSong,
  onCreateEmptySong
}: SongComposerFormProps) {
  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<SongInput>({
    resolver: zodResolver(songInputSchema) as any,
    defaultValues: {
      generationMode: "idea",
      lyrics: "",
      prompt: "",
      key: "Automático",
      scale: "Automático",
      tempo: "",
      targetDurationMinutes: 3.0,
      musicStyle: "Automático",
      autoGenerateRhythm: false,
      rhythmPolyphonic: false,
      rhythmDensity: "medium",
      polyphonicVoices: ["bass", "melody"]
    }
  });

  const generationMode = useWatch({ control, name: "generationMode" });
  const targetDurationMinutes = useWatch({ control, name: "targetDurationMinutes" }) || 3.0;
  const autoGenerateRhythm = useWatch({ control, name: "autoGenerateRhythm" });
  const rhythmPolyphonic = useWatch({ control, name: "rhythmPolyphonic" });
  const polyphonicVoices = useWatch({ control, name: "polyphonicVoices" }) || [];

  const [isEnhancingPrompt, setIsEnhancingPrompt] = React.useState(false);
  const [isEnhancingLyrics, setIsEnhancingLyrics] = React.useState(false);

  const handleEnhance = async (type: 'prompt' | 'lyrics') => {
    // We can use getValues() if we imported it from useForm, or just use control._formValues
    const text = control._formValues[type];
    if (!text || text.trim() === "") {
      toast.error("Escribe algo primero para poder mejorarlo.");
      return;
    }
    
    if (type === 'prompt') setIsEnhancingPrompt(true);
    else setIsEnhancingLyrics(true);

    try {
      const res = await enhanceTextAction(text, type);
      if (res.success && res.data) {
        setValue(type, res.data, { shouldValidate: true, shouldDirty: true });
        toast.success(type === 'prompt' ? "¡Prompt mejorado!" : "¡Letra mejorada y estructurada!");
      } else {
        toast.error(res.error || "Error al mejorar el texto");
      }
    } catch (e) {
      toast.error("Error al conectar con la IA");
    } finally {
      if (type === 'prompt') setIsEnhancingPrompt(false);
      else setIsEnhancingLyrics(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.title && parsed.sections) {
          onImportSong(parsed);
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

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onGenerateSong)} className="space-y-6">
        {/* Generation Mode Toggle - Moved to top for better UX */}
        <div className="flex bg-muted/40 p-1 rounded-xl border border-border/50 max-w-md mx-auto mb-2">
          <button
            type="button"
            onClick={() => setValue("generationMode", "idea")}
            className={`flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${
              generationMode === "idea" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            💡 Desde Idea Musical
          </button>
          <button
            type="button"
            onClick={() => setValue("generationMode", "lyrics")}
            className={`flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${
              generationMode === "lyrics" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            🎤 Desde Letra
          </button>
          
          <button
            type="button"
            onClick={() => setValue("generationMode", "piano")}
            className={`flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${
              generationMode === "piano" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20"
            }`}
            title="Generar solo de piano realista"
          >
            🎹 Pianista IA
          </button>
        </div>

        <div className={`grid grid-cols-1 ${generationMode === "lyrics" ? "" : "md:grid-cols-2"} gap-6`}>
          {/* Left Column: Prompt, Lyrics & Inspiration presets */}
          <div className="space-y-4">

            {generationMode === "lyrics" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lyrics" className="text-sm font-bold text-foreground">Letra de la Canción</Label>
                  <button type="button" onClick={() => handleEnhance('lyrics')} disabled={isEnhancingLyrics} className="text-xs flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md">
                    {isEnhancingLyrics ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />} Mejora IA
                  </button>
                </div>
                <textarea 
                  id="lyrics"
                  rows={6}
                  placeholder="Pega la letra completa aquí. Asegúrate de separar las secciones por líneas en blanco o con etiquetas como [Verso], [Coro]..."
                  {...register("lyrics")}
                  className="w-full rounded-2xl border border-border bg-background/50 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none h-[180px]"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="prompt" className="text-sm font-bold text-foreground">
                  {generationMode === "lyrics" ? "Estilo / Vibra (Opcional)" : "Concepto / Vibra Musical"}
                </Label>
                <button type="button" onClick={() => handleEnhance('prompt')} disabled={isEnhancingPrompt} className="text-xs flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md">
                  {isEnhancingPrompt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />} Mejora IA
                </button>
              </div>
              <textarea 
                id="prompt"
                rows={generationMode === "lyrics" ? 2 : 4}
                placeholder={generationMode === "lyrics" 
                  ? "Ej. Pop rock alegre, tempo medio..." 
                  : "Ej. Balada Neo-Soul melancólica y nocturna con acordes de novena y vibraciones de lluvia..."}
                {...register("prompt")}
                className={`w-full rounded-2xl border border-border bg-background/50 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none ${generationMode === "lyrics" ? "h-[70px]" : "h-[115px]"}`}
              />
              {errors.prompt && (
                <p className="text-xs text-destructive mt-1">{errors.prompt.message}</p>
              )}
            </div>

            {/* Presets List (Only for idea mode) */}
            {generationMode === "idea" && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Ideas de Inspiración
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setValue("prompt", preset.prompt);
                        toast.info(`Preset: "${preset.label}"`);
                      }}
                      className="text-left text-[11px] p-2.5 rounded-xl bg-muted/40 border border-border/40 hover:bg-muted/70 hover:border-primary/20 transition-all duration-200 line-clamp-2 h-12"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Manual JSON Import Button & Empty Project Button */}
            <div className="pt-2 border-t border-border/30 grid grid-cols-2 gap-2">
              <input 
                type="file" 
                id="import-song-project-file" 
                accept=".json" 
                className="hidden" 
                onChange={handleFileChange} 
              />
              <Button 
                type="button"
                onClick={() => document.getElementById("import-song-project-file")?.click()}
                variant="outline" 
                className="w-full h-10 rounded-xl text-[11px] flex items-center justify-center gap-1.5 border-border shadow-sm hover:bg-muted/60"
              >
                <Upload className="w-3.5 h-3.5 text-primary" />
                Importar JSON
              </Button>
              <Button 
                type="button"
                onClick={onCreateEmptySong}
                variant="outline" 
                className="w-full h-10 rounded-xl text-[11px] flex items-center justify-center gap-1.5 border-primary/30 shadow-sm text-primary hover:bg-primary/5 hover:text-primary"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Proyecto Vacío
              </Button>
            </div>
          </div>

          {/* Right Column: Harmonic & Structure Parameters */}
          {generationMode !== "lyrics" && (
            <div className="space-y-4 bg-muted/20 p-4 rounded-2xl border border-border/30">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/20 pb-2 flex items-center gap-1.5">
              Configuración del Arreglo
            </h4>

            <div className="space-y-2">
              <Label htmlFor="musicStyle" className="text-xs font-bold">Estilo Musical (Complejidad)</Label>
              <select
                id="musicStyle"
                {...register("musicStyle")}
                className="w-full rounded-xl border border-border bg-background/50 h-10 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="Automático">🔮 Automático (Según prompt)</option>
                <option value="Pop/Comercial">Pop / Comercial (Tríadas y 7mas simples)</option>
                <option value="Jazz/Neo-Soul">Jazz / Neo-Soul (Extensiones 9, 11, 13)</option>
                <option value="Salsa/Latina">Salsa / Latina (Síncopas y tensiones)</option>
                <option value="Rock/Indie">Rock / Indie (Power chords, acordes abiertos)</option>
                <option value="Clásica/Orquestal">Clásica / Orquestal (Contrapunto, inversiones)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="key" className="text-xs font-bold">Tonalidad</Label>
                <select
                  id="key"
                  {...register("key")}
                  className="w-full rounded-xl border border-border bg-background/50 h-10 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  <option value="Automático">🔮 Automático</option>
                  <option value="C">C (Do)</option>
                  <option value="C#">C# (Do#)</option>
                  <option value="Db">Db (Reb)</option>
                  <option value="D">D (Re)</option>
                  <option value="Eb">Eb (Mib)</option>
                  <option value="E">E (Mi)</option>
                  <option value="F">F (Fa)</option>
                  <option value="F#">F# (Fa#)</option>
                  <option value="G">G (Sol)</option>
                  <option value="Ab">Ab (Lab)</option>
                  <option value="A">A (La)</option>
                  <option value="Bb">Bb (Sib)</option>
                  <option value="B">B (Si)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scale" className="text-xs font-bold">Escala</Label>
                <select
                  id="scale"
                  {...register("scale")}
                  className="w-full rounded-xl border border-border bg-background/50 h-10 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  <option value="Automático">🔮 Automático</option>
                  <option value="Mayor / Jónico">Mayor</option>
                  <option value="Menor Natural / Eólico">Menor</option>
                  <option value="Menor Armónica">Menor Armónica</option>
                  <option value="Menor Melódica">Menor Melódica</option>
                  <option value="Dórico">Dórico</option>
                  <option value="Frigio">Frigio</option>
                  <option value="Lidio">Lidio</option>
                  <option value="Mixolidio">Mixolidio</option>
                  <option value="Locrio">Locrio</option>
                </select>
              </div>
            </div>

            {/* PIANO SPECIFIC SETTINGS */}
            {generationMode === "piano" && (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="pianoMode" className="text-xs font-bold">Modo Pianístico</Label>
                  <select
                    id="pianoMode"
                    {...register("pianoMode")}
                    className="w-full rounded-xl border border-border bg-background/50 h-10 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="accompaniment">Solo Acompañamiento</option>
                    <option value="melody">Acompañamiento + Melodía</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pianoComplexity" className="text-xs font-bold">Virtuosismo</Label>
                  <select
                    id="pianoComplexity"
                    {...register("pianoComplexity")}
                    className="w-full rounded-xl border border-border bg-background/50 h-10 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="simple">Básico (Texturas simples)</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado (Complejo)</option>
                    <option value="virtuoso">Virtuoso (Rápido, Denso)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tempo" className="text-xs font-bold">Tempo (BPM)</Label>
              <Input
                id="tempo"
                type="text"
                placeholder="🔮 Automático (ej: 75)"
                {...register("tempo")}
                className="rounded-xl border-border bg-background/50 h-10 text-xs"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="targetDurationMinutes" className="text-xs font-bold">
                  Duración Objetivo
                </Label>
                <span className="text-xs text-muted-foreground font-mono font-bold">
                  ~{targetDurationMinutes.toFixed(1)} min
                </span>
              </div>
              <div className="pt-2 pb-1 px-1">
                <Slider
                  id="targetDurationMinutes"
                  min={1.0}
                  max={6.0}
                  step={0.5}
                  value={[targetDurationMinutes]}
                  onValueChange={(vals) => setValue("targetDurationMinutes", vals[0])}
                  className="w-full"
                />
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight pt-1">
                La IA estructurará la canción para acercarse a esta duración.
              </p>
            </div>


          </div>
          )}
          
          {/* ─── AUTO-GENERATION PANEL ─── */}
          {generationMode !== "piano" && (
          <div className="col-span-1 md:col-span-2 space-y-4 bg-primary/5 p-4 rounded-2xl border border-primary/20">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                {...register("autoGenerateRhythm")}
                className="w-5 h-5 rounded-md border-primary/50 text-primary focus:ring-primary/50 accent-primary"
              />
              <div>
                <div className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Auto-Generar Acompañamiento
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Crea automáticamente una base rítmica o polifónica al terminar de componer la estructura y los acordes.
                </div>
              </div>
            </label>

            {autoGenerateRhythm && (
              <div className="pl-8 pt-2 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input 
                      type="radio" 
                      value="false"
                      {...register("rhythmPolyphonic")}
                      checked={String(rhythmPolyphonic) === "false"}
                      onChange={() => setValue("rhythmPolyphonic", false)}
                      className="accent-primary"
                    />
                    Base Simple (Monofónica)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input 
                      type="radio" 
                      value="true"
                      {...register("rhythmPolyphonic")}
                      checked={String(rhythmPolyphonic) === "true"}
                      onChange={() => setValue("rhythmPolyphonic", true)}
                      className="accent-primary"
                    />
                    Polifonía Completa (Múltiples Voces)
                  </label>
                </div>

                {String(rhythmPolyphonic) === "true" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-background/50 p-3 rounded-xl border border-border/50">
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                        Voces a Generar
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { role: "bass", label: "🎸 Bajo" },
                          { role: "melody", label: "🎹 Melodía" },
                          { role: "countermelody", label: "🎵 Contrapunto" },
                          { role: "pad", label: "🎼 Pad" }
                        ]).map(v => (
                          <label key={v.role} className="flex items-center gap-1.5 text-[11px] cursor-pointer bg-muted/30 px-2 py-1 rounded border border-border/30">
                            <input 
                              type="checkbox" 
                              value={v.role}
                              checked={polyphonicVoices.includes(v.role)}
                              onChange={(e) => {
                                const current = [...polyphonicVoices];
                                if (e.target.checked) {
                                  setValue("polyphonicVoices", [...current, v.role]);
                                } else {
                                  setValue("polyphonicVoices", current.filter(x => x !== v.role));
                                }
                              }}
                              className="accent-primary"
                            />
                            {v.label}
                          </label>
                        ))}
                      </div>
                      {polyphonicVoices.length === 0 && (
                        <p className="text-[9px] text-rose-400 mt-1">Selecciona al menos una voz.</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="rhythmDensity" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                        Densidad Rítmica
                      </Label>
                      <select
                        id="rhythmDensity"
                        {...register("rhythmDensity")}
                        className="w-full rounded-md border border-border bg-background h-8 px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                      >
                        <option value="sparse">☁️ Suave (Pocas notas)</option>
                        <option value="medium">⚖️ Media (Equilibrada)</option>
                        <option value="dense">🔥 Densa (Muchas notas)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )}

        </div>

        <Button 
          type="submit" 
          disabled={loading} 
          className="w-full h-12 rounded-2xl font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.01] mt-6 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              Componiendo Blueprint y Secciones...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Componer Canción Completa
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
