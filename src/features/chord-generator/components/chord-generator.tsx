"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { chordInputSchema, ChordInput, ChordProgression } from '@/features/chord-generator/schemas/chord-generator.schema';
import { generateChordProgressionAction, GenerateChordProgressionResult } from '@/features/chord-generator/actions/chord-generator.actions';
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
  Code,
  Settings,
  ChevronRight,
  Upload,
  Download
} from "lucide-react";
import Link from "next/link";

const PRESETS = [
  {
    label: "🎷 Jazz Melancólico",
    prompt: "Jazz melancólico y sofisticado en Do menor (Cm) con acordes de séptima y tensiones como novenas."
  },
  {
    label: "☕ Neo-Soul Relajante",
    prompt: "Neo-soul ultra relajado con acordes extendidos y acordes de paso cromáticos, tempo lento de 75 BPM."
  },
  {
    label: "✨ Pop Enérgico",
    prompt: "Pop brillante y enérgico en Sol mayor (G), progresión pegadiza de 4 compases para un coro triunfante."
  },
  {
    label: "🌙 Lo-Fi Nocturno",
    prompt: "Lo-fi nostálgico e hipnótico, tonalidad de La bemol (Ab), con una atmósfera de medianoche."
  }
];

// Componente interactivo y de estética premium para dibujar acordes en un teclado de piano de 2 octavas (C3 a B4)
function PianoKeyboard({ activeNotes }: { activeNotes: string[] }) {
  // Algoritmo matemático para ordenar las notas de forma ascendente por su altura física (pitch)
  const sortedNotes = [...activeNotes].sort((a, b) => {
    const semitones: Record<string, number> = {
      'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 'E': 4,
      'F': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8, 'A': 9,
      'A#': 10, 'BB': 10, 'B': 11
    };

    const getPitchValue = (noteStr: string): number => {
      const match = noteStr.toUpperCase().trim().match(/^([A-G][#B]?)([0-9])$/);
      if (!match) return 0;
      const name = match[1];
      const octave = parseInt(match[2], 10);
      const semitone = semitones[name] ?? 0;
      return octave * 12 + semitone;
    };

    return getPitchValue(a) - getPitchValue(b);
  });

  // Teclas blancas en orden desde C3 hasta B4 (14 teclas, 2 octavas)
  const whiteKeys = [
    { note: 'C3', label: 'C' }, { note: 'D3', label: 'D' }, { note: 'E3', label: 'E' },
    { note: 'F3', label: 'F' }, { note: 'G3', label: 'G' }, { note: 'A3', label: 'A' }, { note: 'B3', label: 'B' },
    { note: 'C4', label: 'C' }, { note: 'D4', label: 'D' }, { note: 'E4', label: 'E' },
    { note: 'F4', label: 'F' }, { note: 'G4', label: 'G' }, { note: 'A4', label: 'A' }, { note: 'B4', label: 'B' }
  ];

  // Teclas negras con posición porcentual precisa para encajar de manera responsiva entre las blancas
  const blackKeys = [
    { note: 'C#3', left: '5%' },
    { note: 'D#3', left: '12.2%' },
    { note: 'F#3', left: '26.4%' },
    { note: 'G#3', left: '33.6%' },
    { note: 'A#3', left: '40.8%' },
    { note: 'C#4', left: '55%' },
    { note: 'D#4', left: '62.2%' },
    { note: 'F#4', left: '76.4%' },
    { note: 'G#4', left: '83.6%' },
    { note: 'A#4', left: '90.8%' }
  ];

  // Helper de enarmonía para mapear sostenidos y bemoles de forma transparente
  const isNoteActive = (noteName: string) => {
    const norm = (n: string) => n.toUpperCase()
      .trim()
      .replace('DB', 'C#')
      .replace('EB', 'D#')
      .replace('GB', 'F#')
      .replace('AB', 'G#')
      .replace('BB', 'A#')
      .replace('C♭', 'B')
      .replace('E♯', 'F')
      .replace('B♯', 'C');

    const normalizedTarget = norm(noteName);
    return sortedNotes.some(active => norm(active) === normalizedTarget);
  };

  return (
    <div className="w-full space-y-1.5 pt-3 border-t border-border/50">
      <div className="flex justify-between items-center text-[9px] text-muted-foreground font-semibold px-0.5">
        <span>Disposición en Piano</span>
        <span className="font-mono text-[8px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 select-all" title={sortedNotes.join(', ')}>
          {sortedNotes.join(' ')}
        </span>
      </div>
      
      <div className="relative w-full h-11 bg-background border border-border rounded-lg overflow-hidden shadow-inner flex">
        {/* Renderizado de teclas blancas */}
        {whiteKeys.map((key) => {
          const active = isNoteActive(key.note);
          return (
            <div
              key={key.note}
              className={`flex-1 border-r border-muted-foreground/15 last:border-r-0 h-full rounded-b transition-all duration-300 relative ${
                active 
                  ? 'bg-gradient-to-b from-primary/80 to-primary text-primary-foreground shadow-sm' 
                  : 'bg-background hover:bg-muted/50'
              }`}
            >
              {key.label === 'C' && (
                <span className={`absolute bottom-0.5 left-0.5 text-[7px] font-black tracking-tighter ${
                  active ? 'text-primary-foreground/75' : 'text-muted-foreground/30'
                }`}>
                  {key.note}
                </span>
              )}
            </div>
          );
        })}

        {/* Renderizado de teclas negras */}
        {blackKeys.map((key) => {
          const active = isNoteActive(key.note);
          return (
            <div
              key={key.note}
              style={{ left: key.left }}
              className={`absolute top-0 w-[4.8%] h-[58%] border border-black/35 rounded-b transition-all duration-300 z-10 ${
                active 
                  ? 'bg-gradient-to-b from-primary/80 to-primary shadow-sm' 
                  : 'bg-zinc-950 dark:bg-zinc-900 border-zinc-900'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ChordGenerator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateChordProgressionResult | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ChordInput>({
    resolver: zodResolver(chordInputSchema),
    defaultValues: {
      prompt: ""
    }
  });

  const onSubmit = async (data: ChordInput) => {
    setLoading(true);
    setResult(null);
    try {
      const response = await generateChordProgressionAction(data);
      setResult(response);
      if (response.success) {
        toast.success("¡Progresión de acordes generada con éxito!");
      } else {
        toast.error("Error en la generación. Consulta los detalles abajo.");
      }
    } catch (error) {
      toast.error("Ocurrió un error al conectar con la acción de servidor.");
      setResult({
        success: false,
        error: "Error de red o de ejecución en la acción de servidor."
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("JSON copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const exportProject = () => {
    if (!progression) {
      toast.error("No hay ningún proyecto generado para exportar.");
      return;
    }
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(progression, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const fileName = `${(progression.name || "proyecto").toLowerCase().trim().replace(/\s+/g, '_')}_musiclab.json`;
      downloadAnchor.setAttribute("download", fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("¡Proyecto exportado con éxito!");
    } catch (err) {
      toast.error("Error al exportar el proyecto.");
    }
  };

  const importProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        if (!json || typeof json !== "object" || !json.name || !Array.isArray(json.chords)) {
          toast.error("El archivo JSON no tiene un formato de proyecto de MusicLab válido.");
          return;
        }

        setResult({
          success: true,
          data: json,
        });
        toast.success("¡Proyecto importado con éxito!");
      } catch (err) {
        toast.error("Error al leer o parsear el archivo JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Helper to color harmonic roles beautifully
  const getRoleColor = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes("tonic")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (r.includes("subdom")) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    if (r.includes("dom")) return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    if (r.includes("modul")) return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  };

  const progression = result?.data;

  return (
    <div className="space-y-8 w-full max-w-[1400px]">
      {/* Introduction Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 md:p-8 shadow-sm">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Verificación Vercel AI SDK
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Generador Armónico Estructurado
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              Prueba la generación de salida estructurada de Vercel AI SDK (`Output.object`). El modelo generará un objeto JSON estricto con una progresión musical coherente.
            </p>
          </div>
          <div className="flex shrink-0 gap-3 flex-wrap">
            {/* Import Button */}
            <div className="relative">
              <input 
                type="file" 
                id="import-project-file-intro" 
                accept=".json" 
                onChange={importProject} 
                className="hidden" 
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => document.getElementById("import-project-file-intro")?.click()}
                className="gap-2 rounded-xl border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 hover:text-primary transition-all duration-200"
              >
                <Upload className="w-4 h-4" />
                Importar Proyecto
              </Button>
            </div>

            <Link href="/dashboard/settings" passHref>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                <Settings className="w-4 h-4" />
                Configurar Proveedor Activo
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left column: Input Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border shadow-sm rounded-2xl bg-card/45 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                Componer Progresión
              </CardTitle>
              <CardDescription>
                Describe las emociones, velocidad y tonalidad deseada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt" className="text-sm font-medium">Instrucción Armónica</Label>
                  <Input 
                    id="prompt"
                    placeholder="Ej. Balada melancólica de piano, jazz lento..."
                    {...register("prompt")}
                    className="rounded-xl border-border bg-background/50 h-11"
                  />
                  {errors.prompt && (
                    <p className="text-xs text-destructive mt-1">{errors.prompt.message}</p>
                  )}
                </div>

                {/* Key / Armadura selection */}
                <div className="space-y-2">
                  <Label htmlFor="key" className="text-xs font-semibold">Tonalidad / Armadura</Label>
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

                {/* Scale / Modo selection */}
                <div className="space-y-2">
                  <Label htmlFor="scale" className="text-xs font-semibold">Escala / Modo</Label>
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

                {/* Tempo (BPM) */}
                <div className="space-y-2">
                  <Label htmlFor="tempo" className="text-xs font-semibold">Tempo (BPM)</Label>
                  <Input
                    id="tempo"
                    type="text"
                    placeholder="🔮 Automático (ej: 80)"
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
                      Componiendo...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Generar Progresión
                    </span>
                  )}
                </Button>
              </form>

              {/* Presets List */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Sugerencias Rápidas
                </Label>
                <div className="flex flex-col gap-1.5">
                  {PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => setValue("prompt", preset.prompt)}
                      className="text-left text-xs px-3 py-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-all hover:border-primary/20 flex items-center justify-between group"
                    >
                      <span className="font-medium truncate mr-2">{preset.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Results/Outputs */}
        <div className="lg:col-span-3 space-y-6">
          {/* Initial State (No Generation yet) */}
          {!loading && !result && (
            <Card className="border-dashed border-border shadow-none rounded-2xl h-full flex flex-col items-center justify-center p-8 text-center min-h-[350px]">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Compass className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold">Esperando Generación</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Escribe un prompt a la izquierda o selecciona uno de los presets predefinidos para iniciar la generación estructurada JSON.
              </p>
            </Card>
          )}

          {/* Loading Vibe skeleton */}
          {loading && (
            <Card className="border-border shadow-sm rounded-2xl p-6 min-h-[350px] flex flex-col justify-between animate-pulse">
              <div className="space-y-4">
                <div className="h-6 w-1/3 bg-muted rounded-md" />
                <div className="h-4 w-2/3 bg-muted rounded-md" />
                <div className="h-4 w-1/2 bg-muted rounded-md" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 rounded-xl bg-muted" />
                ))}
              </div>
              <div className="h-8 w-1/4 bg-muted rounded-md self-end" />
            </Card>
          )}

          {/* Success / Error States */}
          {result && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Error Alert */}
              {!result.success && (
                <Alert variant="destructive" className="rounded-2xl border-destructive/20 bg-destructive/5 p-5">
                  <AlertCircle className="h-5 h-5 mt-0.5" />
                  <AlertTitle className="text-base font-bold">Error en la ejecución</AlertTitle>
                  <AlertDescription className="space-y-4 mt-2">
                    <p className="text-sm">{result.error}</p>
                    {result.debugInfo && (
                      <div className="rounded-xl bg-destructive/10 p-4 border border-destructive/15">
                        <p className="text-[11px] font-mono whitespace-pre-wrap break-all select-all">
                          {result.debugInfo}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-3 pt-1">
                      <Link href="/dashboard/settings" passHref>
                        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 border-destructive/20 hover:bg-destructive/10 text-destructive dark:text-red-400">
                          <Settings className="w-4 h-4" />
                          Configurar API Keys
                        </Button>
                      </Link>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Successful Structured Result */}
              {result.success && progression && (
                <Tabs defaultValue="visual" className="w-full">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <TabsList className="bg-muted/40 p-1 rounded-xl">
                      <TabsTrigger value="visual" className="rounded-lg gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        Armonía Visual
                      </TabsTrigger>
                      <TabsTrigger value="json" className="rounded-lg gap-1.5">
                        <Code className="w-3.5 h-3.5" />
                        Código JSON
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex gap-2 shrink-0">
                      {/* Export Button */}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={exportProject}
                        className="gap-1.5 rounded-xl text-xs hover:bg-primary/5 hover:text-primary transition-all duration-200"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Exportar Proyecto
                      </Button>

                      {/* Copy JSON Button */}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => copyToClipboard(JSON.stringify(progression, null, 2))}
                        className="gap-1.5 rounded-xl text-xs"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copiar JSON
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* TAB 1: VISUAL CHORDS LAYOUT */}
                  <TabsContent value="visual" className="mt-4 space-y-6">
                    {/* Header Info */}
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black tracking-tight text-foreground">
                        {progression.name}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {progression.description}
                      </p>

                      {/* Badges bar */}
                      <div className="flex flex-wrap gap-3 pt-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/60 border border-border text-xs font-semibold text-muted-foreground">
                          <Compass className="w-3.5 h-3.5 text-primary" />
                          Tonalidad: <span className="text-foreground">{progression.key}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/60 border border-border text-xs font-semibold text-muted-foreground">
                          <Activity className="w-3.5 h-3.5 text-primary" />
                          Tempo sugerido: <span className="text-foreground">{progression.tempo} BPM</span>
                        </div>
                      </div>

                      {/* Theory Explanation Box */}
                      {progression.theoryExplanation && (
                        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5 mt-4 space-y-2 relative overflow-hidden">
                          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-20 h-20 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-primary" />
                            Análisis Armónico y Conducción de Voces
                          </h4>
                          <p className="text-sm text-foreground/80 leading-relaxed italic">
                            "{progression.theoryExplanation}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Chords timeline */}
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Secuencia Armónica
                      </Label>
                      
                      <TooltipProvider>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                          {progression.chords.map((chordObj: any, idx) => {
                            const chordLength = chordObj.chord?.length || 0;
                            const dynamicTextClass = 
                              chordLength > 8 
                                ? "text-lg md:text-xl font-black tracking-tight text-primary font-mono break-all" 
                                : chordLength > 5 
                                  ? "text-xl md:text-2xl font-black tracking-tight text-primary font-mono break-all" 
                                  : "text-3xl font-black tracking-tight text-primary font-mono";

                            return (
                              <div 
                                key={idx}
                                className="group relative rounded-2xl border border-border bg-card/30 p-4 transition-all duration-300 hover:scale-[1.02] hover:border-primary/20 hover:bg-card/50 flex flex-col justify-between shadow-md min-h-[310px] overflow-hidden"
                              >
                                {/* Header Layout: Symbol + Index */}
                                <div className="flex justify-between items-start gap-2">
                                  <div className="space-y-1.5 min-w-0 flex-1">
                                    {/* Symbol */}
                                    <div className={dynamicTextClass} title={chordObj.chord}>
                                      {chordObj.chord}
                                    </div>
                                    
                                    {/* Voicing & Inversion */}
                                    <div className="space-y-1">
                                      {chordObj.inversion && (
                                        <div className="text-[10px] text-muted-foreground leading-snug">
                                          Inversión: <span className="text-foreground font-semibold">{chordObj.inversion}</span>
                                        </div>
                                      )}
                                      {chordObj.voicing && (
                                        <div className="text-[10px] text-muted-foreground/80 leading-snug italic" title={chordObj.voicing}>
                                          Voicing: {chordObj.voicing}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <span className="text-[10px] font-bold text-muted-foreground/40 bg-muted/40 px-2 py-0.5 rounded-md shrink-0 self-start">
                                    #{idx + 1}
                                  </span>
                                </div>

                                {/* Badges and details */}
                                <div className="mt-3.5 space-y-2">
                                  {/* Harmonic role & Roman Numeral */}
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRoleColor(chordObj.role)}`}>
                                      {chordObj.role}
                                    </span>
                                    {chordObj.romanNumeral && (
                                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary">
                                        {chordObj.romanNumeral}
                                      </span>
                                    )}
                                  </div>

                                  {/* Suggested scale */}
                                  {chordObj.suggestedScale && (
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                      <span className="font-bold text-foreground/75 shrink-0">Escala:</span>
                                      <span className="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-medium truncate" title={chordObj.suggestedScale}>
                                        {chordObj.suggestedScale}
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                    {/* Duration */}
                                    <div className="text-[10px] font-bold text-primary/80 flex items-center gap-1">
                                      <span>Duración:</span>
                                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                                        {chordObj.duration}t
                                      </span>
                                    </div>

                                    {/* Tooltip for Description */}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="cursor-help inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50 border border-border/50 px-1.5 py-0.5 rounded transition-all duration-200 ml-auto">
                                          <AlertCircle className="w-3 h-3 text-primary/70" />
                                          <span>Detalles</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-[220px] bg-popover text-popover-foreground border border-border shadow-lg rounded-xl p-3 text-[11px] leading-relaxed z-50">
                                        {chordObj.description}
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>

                                {/* Visual Piano Keyboard */}
                                <PianoKeyboard activeNotes={chordObj.pianoNotes || []} />
                              </div>
                            );
                          })}
                        </div>
                      </TooltipProvider>
                    </div>
                  </TabsContent>

                  {/* TAB 2: RAW STRUCTURED JSON BLOCK */}
                  <TabsContent value="json" className="mt-4">
                    <div className="rounded-2xl border border-border bg-muted/40 p-5 overflow-auto max-h-[500px]">
                      <pre className="text-xs font-mono leading-relaxed text-foreground select-all whitespace-pre-wrap">
                        {JSON.stringify(progression, null, 2)}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
