"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PianoKeyboard } from '@/features/piano-roll/components/piano-keyboard';
import { parseChordToNotes } from '@/lib/music/chord-parser';
import { Music, Check, Info, Sparkles, Lightbulb, Loader2, ChevronRight } from "lucide-react";
import {
  getAiChordSuggestionsAction,
  ChordSuggestion,
} from '@/features/chord-generator/actions/chord-suggestions.actions';

// ────────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────────
export interface ChordBuilderData {
  chord: string;
  duration: number;
}

interface ManualChordBuilderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ChordBuilderData) => void;
  initialData?: ChordBuilderData;
  sectionKey?: string;
  sectionType?: string;
  previousChords?: string[]; // chords already in the section
}

// ────────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────────────────────────
const ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const QUALITIES = [
  { id: "maj", label: "Mayor", suffix: "" },
  { id: "min", label: "Menor", suffix: "m" },
  { id: "dim", label: "Disminuido", suffix: "dim" },
  { id: "aug", label: "Aumentado", suffix: "aug" },
  { id: "sus2", label: "Sus 2", suffix: "sus2" },
  { id: "sus4", label: "Sus 4", suffix: "sus4" },
];

const EXTENSIONS = [
  { id: "none", label: "Ninguna", suffix: "" },
  { id: "7", label: "7 Dom", suffix: "7" },
  { id: "maj7", label: "Maj 7", suffix: "maj7" },
  { id: "m7", label: "Min 7", suffix: "m7" },
  { id: "9", label: "9na", suffix: "9" },
  { id: "maj9", label: "Maj 9", suffix: "maj9" },
  { id: "11", label: "11na", suffix: "11" },
  { id: "13", label: "13ra", suffix: "13" },
  { id: "add9", label: "Add 9", suffix: "add9" },
  { id: "6", label: "6ta", suffix: "6" },
];

const DURATIONS = [
  { value: 1, label: "1 Tiempo" },
  { value: 2, label: "2 Tiempos" },
  { value: 4, label: "4 Tiempos (1 Compás)" },
  { value: 8, label: "8 Tiempos (2 Compases)" },
];

// ────────────────────────────────────────────────────────────────────────────────
// THEORY SUGGESTIONS ENGINE
// ────────────────────────────────────────────────────────────────────────────────
const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function semitoneUp(note: string, steps: number): string {
  const idx = CHROMATIC.indexOf(note);
  return CHROMATIC[(idx + steps + 12) % 12];
}

interface TheorySuggestion {
  chord: string;
  label: string;
  reason: string;
  romanNumeral: string;
  color: string;
  duration: number;
}

// Parse a chord string to extract its root and a simplified quality tag
function parseChordRoot(chord: string): { root: string; quality: string } | null {
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;
  const root = match[1];
  const suffix = match[2].toLowerCase();
  let quality = "maj";
  if (suffix.startsWith("m") && !suffix.startsWith("maj")) quality = "min";
  else if (suffix.startsWith("dim")) quality = "dim";
  else if (suffix.startsWith("aug")) quality = "aug";
  else if (suffix.startsWith("sus")) quality = "sus";
  return { root, quality };
}

// Returns the semitone interval from note A to note B (0-11)
function intervalBetween(from: string, to: string): number {
  const a = CHROMATIC.indexOf(from.toUpperCase().replace("BB", "A#").replace("DB", "C#").replace("EB", "D#").replace("GB", "F#").replace("AB", "G#").replace("B", "A#").replace("CB", "B"));
  const b = CHROMATIC.indexOf(to.toUpperCase().replace("BB", "A#").replace("DB", "C#").replace("EB", "D#").replace("GB", "F#").replace("AB", "G#").replace("B", "A#").replace("CB", "B"));
  if (a === -1 || b === -1) return 0;
  return (b - a + 12) % 12;
}

function buildTheorySuggestions(
  root: string,
  quality: string,
  extension: string,
  sectionKey: string,
  previousChords: string[]
): TheorySuggestion[] {
  const suggestions: TheorySuggestion[] = [];
  const usedChords = new Set(previousChords.map(c => c.toLowerCase()));

  // Determine the reference root: last previous chord if exists, else current root
  const lastParsed = previousChords.length > 0
    ? parseChordRoot(previousChords[previousChords.length - 1])
    : null;
  const lastRoot = lastParsed?.root ?? root;
  const lastQuality = lastParsed?.quality ?? quality;
  const prevCount = previousChords.length;

  // ── Helper to push a suggestion (skips if already used in progression) ──
  const push = (
    chord: string,
    label: string,
    reason: string,
    romanNumeral: string,
    color: string,
    duration: number = 4,
    priority: number = 5
  ) => {
    if (!usedChords.has(chord.toLowerCase())) {
      suggestions.push({ chord, label, reason, romanNumeral, color, duration });
    }
  };

  // ── CONTEXT-AWARE RULES based on last chord ──

  if (lastQuality === "min" || lastQuality === "dim") {
    // After a minor/dim: offer resolution UP (III maj), relative major, or IV
    const relMaj = semitoneUp(lastRoot, 3);
    push(`${relMaj}`, "Mayor Relativo", `Después de un acorde menor, el mayor relativo (↑3 semitonos) resuelve con calidez.`, "♭III", "from-emerald-500 to-teal-500");
    const iv = semitoneUp(lastRoot, 5);
    push(`${iv}`, "Hacia IV", `Movimiento plagal (IV) después de menor: expansión melódica suave y esperanzadora.`, "IV", "from-teal-500 to-cyan-500");
    const v = semitoneUp(lastRoot, 7);
    push(`${v}7`, "Dominante V7", `V7 crea la tensión más urgente y empuja hacia resolución mayor.`, "V7", "from-amber-500 to-orange-500");
  } else if (lastQuality === "maj") {
    // After major: classic moves
    const iv = semitoneUp(lastRoot, 5);
    push(`${iv}`, "Subdominante IV", `Movimiento I→IV: expansión tonal clásica usada en pop, gospel y R&B.`, "IV", "from-teal-500 to-emerald-500");
    const vi = semitoneUp(lastRoot, 9);
    push(`${vi}m`, "Relativo Menor VIm", `I→VIm: caída emocional inesperada. El contraste mayor→menor más popular en pop.`, "VIm", "from-purple-500 to-violet-500");
    const v = semitoneUp(lastRoot, 7);
    push(`${v}7`, "Dominante V7", `I→V7: crea tensión inmediata que pide resolver de vuelta al I.`, "V7", "from-amber-500 to-orange-500");
  }

  // ── PATTERN-BASED RULES (detect common progressions and complete them) ──
  if (prevCount >= 2) {
    const prev2 = parseChordRoot(previousChords[prevCount - 2]);
    const prev1 = parseChordRoot(previousChords[prevCount - 1]);
    if (prev2 && prev1) {
      const interval = intervalBetween(prev2.root, prev1.root);

      // I → V? → complete with VI (deceptive cadence)
      if (interval === 7 && prev1.quality === "maj") {
        const vi = semitoneUp(prev1.root, 2);
        push(`${vi}m`, "Cadencia Engañosa", `V→VIm: la cadencia más sorprendente del pop. Evita resolver al I y añade drama.`, "VIm", "from-fuchsia-500 to-pink-500", 4, 10);
      }

      // Detects II→V pattern → suggest I (resolution)
      if (interval === 5 && prev1.quality !== "min") {
        push(`${prev1.root}`, "Resolución I (II-V-I)", `Completa el clásico II-V-I jazzero. La resolución más satisfactoria de la armonía.`, "I", "from-yellow-500 to-amber-500", 4, 10);
      }

      // IV→V → suggest I
      if (interval === 2 && prev1.quality === "maj") {
        push(`${semitoneUp(prev1.root, 5)}`, "Resolución Final I", `IV→V→I: cierre tonal clásico. Funciona como resolución perfecta de la sección.`, "I", "from-green-500 to-emerald-500", 4, 10);
      }
    }
  }

  // ── UNIVERSAL FILLERS: fill up to 6 suggestions with quality suggestions ──
  const fillers: Array<[string, string, string, string, string]> = [
    [semitoneUp(root, 5) + "maj7", "Subdominante IV Maj7", "Expansión tonal clásica con color jazzero dulce.", "IV Maj7", "from-teal-500 to-emerald-500"],
    [semitoneUp(root, 7) + "7", "Dominante V7", "La resolución más poderosa de la armonía tonal.", "V7", "from-amber-500 to-orange-500"],
    [semitoneUp(root, 2) + "m7", "Supertónica IIm7", "Predominante suave, flujo II-V-I jazzero natural.", "IIm7", "from-indigo-500 to-blue-500"],
    [semitoneUp(root, 9) + "m", "Relativo Menor VIm", "Giro emocional oscuro. Muy efectivo tras mayor.", "VIm", "from-purple-500 to-violet-500"],
    [semitoneUp(root, 4) + "m", "Mediante IIIm", "Color modal ambiguo. Melancolía sin salir de la tonalidad.", "IIIm", "from-rose-500 to-pink-500"],
    [semitoneUp(root, 10) + "", "bVII Modal", "Préstamo Mixolidio: añade un giro rockero o épico.", "♭VII", "from-cyan-500 to-sky-500"],
  ];

  for (const [chord, label, reason, roman, color] of fillers) {
    if (suggestions.length >= 6) break;
    push(chord, label, reason, roman, color);
  }

  // Trim to max 6
  return suggestions.slice(0, 6);
}

// ────────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────────
export function ManualChordBuilderDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
  sectionKey = "C",
  sectionType = "Verso",
  previousChords = [],
}: ManualChordBuilderDialogProps) {
  const [root, setRoot] = useState("C");
  const [quality, setQuality] = useState("maj");
  const [extension, setExtension] = useState("none");
  const [duration, setDuration] = useState(4);
  const [inversion, setInversion] = useState("Root");
  const [aiSuggestions, setAiSuggestions] = useState<ChordSuggestion[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isPendingAi, startAiTransition] = useTransition();
  const [suggestionsTab, setSuggestionsTab] = useState<"theory" | "ai">("theory");

  // Parse initial data when modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      setDuration(initialData.duration || 4);
      let chordName = initialData.chord || "C";
      const match = chordName.match(/^([A-G][#b]?)(.*)$/i);
      if (match) {
        setRoot(match[1].toUpperCase());
        const suffix = match[2].toLowerCase();
        let foundExt = "none";
        for (const ext of [...EXTENSIONS].reverse()) {
          if (ext.id !== "none" && suffix.endsWith(ext.suffix)) {
            foundExt = ext.id;
            break;
          }
        }
        setExtension(foundExt);
        let foundQual = "maj";
        const qualStr =
          foundExt !== "none"
            ? suffix.slice(0, -EXTENSIONS.find((e) => e.id === foundExt)!.suffix.length)
            : suffix;
        if (qualStr === "m") foundQual = "min";
        else if (qualStr === "dim") foundQual = "dim";
        else if (qualStr === "aug") foundQual = "aug";
        else if (qualStr === "sus2") foundQual = "sus2";
        else if (qualStr === "sus4") foundQual = "sus4";
        setQuality(foundQual);
      }
    } else if (isOpen && !initialData) {
      setRoot("C");
      setQuality("maj");
      setExtension("none");
      setDuration(4);
    }
    // Reset AI suggestions on open
    setAiSuggestions([]);
    setAiError(null);
  }, [isOpen, initialData]);

  const builtChordString = useMemo(() => {
      const qSuffix = QUALITIES.find((q) => q.id === quality)?.suffix || "";
      let extSuffix = EXTENSIONS.find((e) => e.id === extension)?.suffix || "";
      // Handle inversion suffix
      let invSuffix = "";
      if (inversion === "1st") {
        const third = semitoneUp(root, quality === "min" ? 3 : 4);
        invSuffix = `/${third}`;
      } else if (inversion === "2nd") {
        const fifth = semitoneUp(root, 7);
        invSuffix = `/${fifth}`;
      }
      if (quality === "min" && extension === "m7") return `${root}m7${invSuffix}`;
      if (quality === "min" && extension === "7") return `${root}m7${invSuffix}`;
      if (quality === "min" && extension === "9") return `${root}m9${invSuffix}`;
      return `${root}${qSuffix}${extSuffix}${invSuffix}`;
    }, [root, quality, extension, inversion]);

  const currentNotes = useMemo(() => parseChordToNotes(builtChordString), [builtChordString]);

  const theoryInsight = useMemo(() => {
    let mood = "";
    if (quality === "maj") mood = "Alegre, estable, brillante.";
    if (quality === "min") mood = "Melancólico, oscuro, introspectivo.";
    if (quality === "dim") mood = "Tenso, inestable, misterioso.";
    if (quality === "aug") mood = "Flotante, disonante, sin centro.";
    if (quality === "sus2" || quality === "sus4") mood = "Abierto, ambiguo, suspendido.";
    let role = "";
    if (extension === "7") role = "Crea tensión dominante hacia resolución.";
    if (extension === "maj7") role = "Color jazzero muy dulce y nostálgico.";
    if (extension === "m7") role = "Ideal para R&B y neo-soul.";
    if (extension === "9" || extension === "maj9") role = "Riqueza armónica avanzada.";
    if (extension === "11") role = "Tensión modal suspendida y meditativa.";
    if (extension === "13") role = "Sonido jazzero complejo y sofisticado.";
    if (extension === "add9") role = "Dulzura brillante sin la 7ma.";
    if (extension === "6") role = "Calidez y suavidad sin tensión.";
    return { mood, role };
  }, [quality, extension]);

  const theorySuggestions = useMemo(
    () => buildTheorySuggestions(root, quality, extension, sectionKey, previousChords),
    [root, quality, extension, sectionKey, previousChords]
  );

  const fetchAiSuggestions = () => {
    setAiError(null);
    startAiTransition(async () => {
      const result = await getAiChordSuggestionsAction({
        previousChords,
        currentChord: builtChordString,
        sectionKey,
        sectionType,
      });
      if (result.success && result.suggestions) {
        setAiSuggestions(result.suggestions);
        setSuggestionsTab("ai");
      } else {
        setAiError(result.error || "Error desconocido.");
      }
    });
  };

  const applySuggestion = (chord: string, dur: number) => {
    const match = chord.match(/^([A-G][#b]?)(.*)$/i);
    if (match) {
      setRoot(match[1].toUpperCase());
      const suffix = match[2];
      let foundExt = "none";
      for (const ext of [...EXTENSIONS].reverse()) {
        if (ext.id !== "none" && suffix.toLowerCase().endsWith(ext.suffix.toLowerCase())) {
          foundExt = ext.id;
          break;
        }
      }
      setExtension(foundExt);
      // Determine quality
      let foundQual = "maj";
      const qualStr = foundExt !== "none"
        ? suffix.slice(0, -EXTENSIONS.find((e) => e.id === foundExt)!.suffix.length)
        : suffix;
      const ql = qualStr.toLowerCase();
      if (ql === "m") foundQual = "min";
      else if (ql === "dim") foundQual = "dim";
      else if (ql === "aug") foundQual = "aug";
      else if (ql === "sus2") foundQual = "sus2";
      else if (ql === "sus4") foundQual = "sus4";
      setQuality(foundQual);
    }
    setDuration(dur);
    setInversion("Root");
  };

  const handleSave = () => {
    onSave({ chord: builtChordString, duration });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] md:max-w-[900px] lg:max-w-[1000px] w-[95vw] bg-background border-primary/20 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <Music className="w-6 h-6 text-primary" />
            Constructor de Acordes
          </DialogTitle>
          <DialogDescription>
            Construye tu acorde y explora sugerencias de teoría musical o de la IA.
          </DialogDescription>
        </DialogHeader>

        {/* ── MAIN 3-COLUMN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 mt-2">
          {/* ── LEFT: SELECTORS ── */}
          <div className="space-y-5">
            {/* Raíz */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Nota Raíz
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {ROOTS.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant={root === r ? "default" : "outline"}
                    size="sm"
                    className={`h-9 text-sm font-semibold ${root === r ? "shadow-md shadow-primary/30 scale-105" : "hover:border-primary/50"} transition-all`}
                    onClick={() => setRoot(r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>

            {/* Calidad */}
        {/* Inversión */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Inversión
          </label>
          <div className="flex flex-wrap gap-2">
            {[{id:'Root',label:'Fundamental'},{id:'1st',label:'1ra Inversión'},{id:'2nd',label:'2da Inversión'}].map((inv) => (
              <Button
                key={inv.id}
                type="button"
                variant={inversion === inv.id ? "secondary" : "outline"}
                size="sm"
                className={`${inversion === inv.id ? "ring-2 ring-primary/40 shadow-sm" : "hover:border-primary/40"} transition-all`}
                onClick={() => setInversion(inv.id)}
              >
                {inv.label}
              </Button>
            ))}
          </div>
        </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Calidad (Tríada)
              </label>
              <div className="flex flex-wrap gap-2">
                {QUALITIES.map((q) => (
                  <Button
                    key={q.id}
                    type="button"
                    variant={quality === q.id ? "secondary" : "outline"}
                    size="sm"
                    className={`${quality === q.id ? "ring-2 ring-primary/40 shadow-sm" : "hover:border-primary/40"} transition-all`}
                    onClick={() => setQuality(q.id)}
                  >
                    {q.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Extensiones */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Extensiones y Tensiones
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EXTENSIONS.map((ext) => (
                  <Button
                    key={ext.id}
                    type="button"
                    variant={extension === ext.id ? "secondary" : "outline"}
                    size="sm"
                    className={`text-xs ${extension === ext.id ? "ring-2 ring-primary/40 shadow-sm" : "hover:border-primary/40"} transition-all`}
                    onClick={() => setExtension(ext.id)}
                  >
                    {ext.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Duración */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Duración
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <Button
                    key={d.value}
                    type="button"
                    variant={duration === d.value ? "secondary" : "outline"}
                    size="sm"
                    className={`${duration === d.value ? "ring-2 ring-primary/40 shadow-sm" : "hover:border-primary/40"} transition-all`}
                    onClick={() => setDuration(d.value)}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* ── DIVIDER ── */}
          <div className="hidden lg:flex flex-col items-center justify-stretch">
            <div className="w-px flex-1 bg-border/60" />
          </div>

          {/* ── RIGHT: PREVIEW + THEORY + PIANO ── */}
          <div className="space-y-4">
            {/* Chord Preview */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 border border-primary/15 shadow-inner flex flex-col items-center justify-center min-h-[120px]">
              <span className="text-6xl font-black bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent mb-1 leading-none">
                {builtChordString}
              </span>
              <p className="text-muted-foreground text-sm font-medium mt-2 tracking-wide">
                {currentNotes.join(" · ")}
              </p>
            </div>

            {/* Theory insight */}
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 text-sm">
              <h4 className="flex items-center gap-2 font-semibold text-primary mb-2 text-xs uppercase tracking-wider">
                <Info className="w-3.5 h-3.5" />
                Análisis Armónico
              </h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Emoción: </strong>
                  {theoryInsight.mood}
                </li>
                {theoryInsight.role && (
                  <li>
                    <strong className="text-foreground">Función: </strong>
                    {theoryInsight.role}
                  </li>
                )}
              </ul>
            </div>

            {/* Piano Keyboard */}
            <div className="rounded-xl overflow-hidden border border-border/40">
              <PianoKeyboard activeNotes={currentNotes} />
            </div>
          </div>
        </div>

        {/* ── SUGGESTIONS SECTION ── */}
        <div className="mt-6 border-t border-border/40 pt-5 space-y-4">
          {/* Tabs header */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-muted/40 rounded-xl p-1 border border-border/30">
              <button
                type="button"
                onClick={() => setSuggestionsTab("theory")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  suggestionsTab === "theory"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Teoría Musical
              </button>
              <button
                type="button"
                onClick={() => setSuggestionsTab("ai")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  suggestionsTab === "ai"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sugerencias IA
              </button>
            </div>

            {suggestionsTab === "ai" && (
              <Button
                type="button"
                size="sm"
                onClick={fetchAiSuggestions}
                disabled={isPendingAi}
                className="gap-2 text-xs"
              >
                {isPendingAi ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {isPendingAi ? "Consultando IA..." : "Generar Sugerencias"}
              </Button>
            )}
          </div>

          {/* Theory suggestions */}
          {suggestionsTab === "theory" && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {theorySuggestions.map((s, i) => (
                <button
                  key={`theory-${i}-${s.chord}`}
                  type="button"
                  onClick={() => applySuggestion(s.chord, s.duration)}
                  className="group relative text-left rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 p-3 overflow-hidden"
                >
                  <div
                    className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${s.color} rounded-l-xl opacity-80`}
                  />
                  <div className="pl-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-base font-black text-foreground">{s.chord}</span>
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded">
                        {s.romanNumeral}
                      </span>
                    </div>
                    <p className="text-[10px] font-semibold text-primary mb-1">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                      {s.reason}
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-primary/70 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-3 h-3" />
                      Aplicar
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* AI suggestions */}
          {suggestionsTab === "ai" && (
            <div className="min-h-[120px]">
              {isPendingAi && (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  <p className="text-sm font-medium">La IA está analizando la progresión...</p>
                </div>
              )}
              {!isPendingAi && aiError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  {aiError}
                </div>
              )}
              {!isPendingAi && !aiError && aiSuggestions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                  <Sparkles className="w-7 h-7 text-primary/40" />
                  <p className="text-sm font-medium text-center">
                    Haz clic en <strong className="text-primary">Generar Sugerencias</strong> para
                    que la IA analice tu progresión y proponga los mejores acordes para continuar.
                  </p>
                </div>
              )}
              {!isPendingAi && aiSuggestions.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {aiSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applySuggestion(s.chord, s.duration)}
                      className="group relative text-left rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/3 hover:from-primary/10 hover:border-primary/40 hover:shadow-md transition-all duration-200 p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base font-black text-foreground">{s.chord}</span>
                        <span className="text-[10px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">
                          {s.romanNumeral}
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold text-primary mb-1">{s.emotion}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight line-clamp-3">
                        {s.reason}
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-primary/70 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-3 h-3" />
                        Aplicar
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-border/40">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} className="gap-2">
            <Check className="w-4 h-4" />
            Guardar Acorde
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
