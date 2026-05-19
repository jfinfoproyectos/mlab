"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { songInputSchema, SongInput, SongStructure } from "../schemas/song-generator.schema";

interface SongComposerFormProps {
  loading: boolean;
  onGenerateSong: (data: SongInput) => void;
  onImportSong: (song: SongStructure) => void;
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
  onImportSong
}: SongComposerFormProps) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SongInput>({
    resolver: zodResolver(songInputSchema),
    defaultValues: {
      prompt: "",
      key: "Automático",
      scale: "Automático",
      tempo: "",
      structureMode: "Automático",
      chordsMode: "Automático",
      repetitionMode: "Automático"
    }
  });

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Prompt & Inspiration presets */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-sm font-bold text-foreground">Concepto / Vibe</Label>
              <textarea 
                id="prompt"
                rows={4}
                placeholder="Ej. Balada Neo-Soul melancólica y nocturna con acordes de novena y vibraciones de lluvia..."
                {...register("prompt")}
                className="w-full rounded-2xl border border-border bg-background/50 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none h-[115px]"
              />
              {errors.prompt && (
                <p className="text-xs text-destructive mt-1">{errors.prompt.message}</p>
              )}
            </div>

            {/* Presets List */}
            <div className="space-y-2">
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

            {/* Manual JSON Import Button */}
            <div className="pt-2 border-t border-border/30">
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
                className="w-full h-10 rounded-2xl text-xs flex items-center gap-2 border-border"
              >
                <Upload className="w-4 h-4 text-primary" />
                Importar Proyecto JSON
              </Button>
            </div>
          </div>

          {/* Right Column: Harmonic & Structure Parameters */}
          <div className="space-y-4 bg-muted/20 p-4 rounded-2xl border border-border/30">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/20 pb-2 flex items-center gap-1.5">
              Configuración del Arreglo
            </h4>

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
              <Label htmlFor="structureMode" className="text-xs font-bold">Estructura / Secciones</Label>
              <select
                id="structureMode"
                {...register("structureMode")}
                className="w-full rounded-xl border border-border bg-background/50 h-10 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="Automático">🔮 Automático (Decide IA)</option>
                <option value="3-sections">3 secciones (Intro, Coro, Outro)</option>
                <option value="4-sections">4 secciones (Intro, Verso, Coro, Outro)</option>
                <option value="6-sections">6 secciones (Pop Corto / Repeticiones)</option>
                <option value="8-sections">8 secciones (Pop Completo con Puente)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chordsMode" className="text-xs font-bold">Acordes por Sec.</Label>
                <select
                  id="chordsMode"
                  {...register("chordsMode")}
                  className="w-full rounded-xl border border-border bg-background/50 h-10 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  <option value="Automático">🔮 Automático</option>
                  <option value="2">2 acordes</option>
                  <option value="4">4 acordes</option>
                  <option value="6">6 acordes</option>
                  <option value="8">8 acordes</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="repetitionMode" className="text-xs font-bold">Repeticiones</Label>
                <select
                  id="repetitionMode"
                  {...register("repetitionMode")}
                  className="w-full rounded-xl border border-border bg-background/50 h-10 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  <option value="Automático">🔮 Automático</option>
                  <option value="none">Sin repeticiones</option>
                  <option value="force-exact">🔗 Clones</option>
                </select>
              </div>
            </div>
          </div>
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
