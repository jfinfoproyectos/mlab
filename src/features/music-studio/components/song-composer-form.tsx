"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      tempo: ""
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
    <Card className="border-border shadow-sm rounded-2xl bg-card/45 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Componer Canción
        </CardTitle>
        <CardDescription>
          Genera la estructura de una canción y sus progresiones armónicas de forma secuencial.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onGenerateSong)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-sm font-medium">Concepto / Vibe</Label>
            <Input 
              id="prompt"
              placeholder="Ej. Balada Neo-Soul melancólica y nocturna..."
              {...register("prompt")}
              className="rounded-xl border-border bg-background/50 h-11 text-sm"
            />
            {errors.prompt && (
              <p className="text-xs text-destructive mt-1">{errors.prompt.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="key" className="text-xs font-semibold">Tonalidad General</Label>
            <select
              id="key"
              {...register("key")}
              className="w-full rounded-xl border border-border bg-background/50 h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
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
            <Label htmlFor="scale" className="text-xs font-semibold">Escala General</Label>
            <select
              id="scale"
              {...register("scale")}
              className="w-full rounded-xl border border-border bg-background/50 h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="Automático">🔮 Automático</option>
              <option value="Mayor / Jónico">Mayor / Jónico</option>
              <option value="Menor Natural / Eólico">Menor Natural / Eólico</option>
              <option value="Menor Armónica">Menor Armónica</option>
              <option value="Menor Melódica">Menor Melódica</option>
              <option value="Dórico">Dórico</option>
              <option value="Frigio">Frigio</option>
              <option value="Lidio">Lidio</option>
              <option value="Mixolidio">Mixolidio</option>
              <option value="Locrio">Locrio</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tempo" className="text-xs font-semibold">Tempo (BPM)</Label>
            <Input
              id="tempo"
              type="text"
              placeholder="🔮 Automático (ej: 75)"
              {...register("tempo")}
              className="rounded-xl border-border bg-background/50 h-10 text-sm"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/20 transition-all hover:scale-[1.01]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                Componiendo Blueprint...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Generar Canción
              </span>
            )}
          </Button>
        </form>

        {/* Presets List */}
        <div className="space-y-2 pt-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ideas de Inspiración
          </Label>
          <div className="flex flex-col gap-1.5">
            {PRESETS.map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setValue("prompt", preset.prompt);
                  toast.info(`Preset seleccionado: "${preset.label}"`);
                }}
                className="text-left text-[11px] px-3 py-2 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/70 hover:border-primary/20 transition-all duration-200"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Manual JSON Import Button */}
        <div className="pt-2 border-t border-border/40">
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
            className="w-full h-10 rounded-xl text-xs flex items-center gap-2 border-border"
          >
            <Upload className="w-4 h-4 text-primary" />
            Importar Proyecto JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
