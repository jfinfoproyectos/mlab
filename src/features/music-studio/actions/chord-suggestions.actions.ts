"use server";

import { generateObject } from "ai";
import { getActiveAiProvider } from "../services/ai-provider.service";
import { z } from "zod";

const chordSuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        chord: z.string().describe("Nombre del acorde en notación estándar, ej: Am7, Fmaj7, G"),
        reason: z.string().describe("Por qué este acorde funciona aquí, en términos musicales y emocionales (máx 80 caracteres)"),
        emotion: z.string().describe("Emoción o color que aporta este acorde (máx 40 caracteres)"),
        romanNumeral: z.string().describe("Función tonal en números romanos, ej: IV, V7, IIm7"),
        duration: z.number().describe("Duración sugerida en tiempos (1, 2, 4 u 8)"),
      })
    )
    .min(3)
    .max(6)
    .describe("Lista de acordes sugeridos para continuar la progresión"),
});

export interface ChordSuggestion {
  chord: string;
  reason: string;
  emotion: string;
  romanNumeral: string;
  duration: number;
}

export interface ChordSuggestionsResult {
  success: boolean;
  suggestions?: ChordSuggestion[];
  error?: string;
}

export async function getAiChordSuggestionsAction(params: {
  previousChords: string[];
  currentChord: string;
  sectionKey: string;
  sectionType: string;
  style?: string;
}): Promise<ChordSuggestionsResult> {
  const { previousChords, currentChord, sectionKey, sectionType, style } = params;

  try {
    const provider = await getActiveAiProvider();

    const progressionContext =
      previousChords.length > 0
        ? `La progresión actual es: ${previousChords.join(" → ")}. El último acorde agregado es: "${currentChord}".`
        : `Se está empezando la progresión con el acorde: "${currentChord}".`;

    const systemPrompt = `Eres un maestro de la armonía tonal y un productor musical con décadas de experiencia en la construcción de progresiones de acordes. Tu tarea es sugerir acordes que continúen de manera natural y musical una progresión dada.

REGLAS PARA SUGERENCIAS PROFESIONALES:
1. Aplica principios de movimiento tonal: resoluciones naturales (V→I, II→V→I, IV→I), plagales, modales.
2. Considera la Tonalidad (key) como centro gravitacional, pero incluye al menos 1-2 sugerencias que introduzcan color modal o préstamo de escala paralela.
3. Cada sugerencia debe sonar plausible, no forzada.
4. Las sugerencias deben cubrir diferentes opciones: una obvia/segura, una sorprendente/creativa, una emotiva/melancólica, etc.
5. La razón debe ser técnica pero comprensible para un músico semi-profesional.
6. Devuelve EXACTAMENTE entre 4 y 6 sugerencias.`;

    const userPrompt = `Sección: "${sectionType}" | Tonalidad: ${sectionKey} | Estilo: "${style || "general"}".

${progressionContext}

Sugiere los mejores acordes para continuar esta progresión. Considera la narrativa emocional de la sección y la resolución armónica natural.`;

    const result = await generateObject({
      model: provider,
      schema: chordSuggestionSchema,
      system: systemPrompt,
      prompt: userPrompt,
      abortSignal: AbortSignal.timeout(30000),
      maxRetries: 0,
    });

    return {
      success: true,
      suggestions: result.object.suggestions as ChordSuggestion[],
    };
  } catch (error: any) {
    console.error("Error getting AI chord suggestions:", error);
    return {
      success: false,
      error: error.message || "No se pudieron obtener sugerencias de IA.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION ANALYSIS ACTION
// ─────────────────────────────────────────────────────────────────────────────
const progressionAnalysisSchema = z.object({
  theoryExplanation: z
    .string()
    .describe(
      "Análisis teórico detallado de la progresión: tensiones, resoluciones, funciones tonales, conducción de voces y carácter emocional. MÁXIMO 80 palabras."
    ),
});

export interface ProgressionAnalysisResult {
  success: boolean;
  theoryExplanation?: string;
  error?: string;
}

export async function analyzeProgressionAction(params: {
  chords: Array<{ chord: string; role?: string; romanNumeral?: string; duration?: number }>;
  sectionKey: string;
  sectionType: string;
}): Promise<ProgressionAnalysisResult> {
  const { chords, sectionKey, sectionType } = params;

  if (!chords || chords.length === 0) {
    return { success: false, error: "No hay acordes en la sección para analizar." };
  }

  try {
    const provider = await getActiveAiProvider();

    const chordList = chords
      .map((c, i) => {
        const parts = [`${i + 1}. ${c.chord}`];
        if (c.romanNumeral && c.romanNumeral !== "?") parts.push(`(${c.romanNumeral})`);
        if (c.role && c.role !== "Manual") parts.push(`[${c.role}]`);
        if (c.duration) parts.push(`${c.duration} tiempos`);
        return parts.join(" ");
      })
      .join(" → ");

    const systemPrompt = `Eres un musicólogo y arreglista experto en teoría armónica avanzada. Analiza progresiones de acordes con precisión técnica y claridad expresiva.

TU ANÁLISIS DEBE INCLUIR:
1. La función tonal de cada acorde (tónica, subdominante, dominante, préstamo, etc.).
2. Las tensiones y resoluciones principales (cadencias, movimientos V→I, II→V→I, deceptivas, etc.).
3. La conducción de voces más relevante si aplica (movimiento conjunto, saltos, cromatismos).
4. El carácter emocional que genera esta progresión en el oyente.
5. Si hay acordes "especiales" (prestados, alterados, sustituciones de tritono), mencionarlos brevemente.

RESTRICCIONES:
- Máximo 80 palabras. Sé denso y preciso, no repetitivo.
- Escribe en español, tono técnico pero accesible para músicos semi-profesionales.
- NO uses listas, escribe en prosa fluida.`;

    const userPrompt = `Analiza la siguiente progresión de acordes de la sección "${sectionType}" en tonalidad ${sectionKey}:

${chordList}

Genera el análisis armónico y de conducción de voces.`;

    const result = await generateObject({
      model: provider,
      schema: progressionAnalysisSchema,
      system: systemPrompt,
      prompt: userPrompt,
      abortSignal: AbortSignal.timeout(30000),
      maxRetries: 0,
    });

    return {
      success: true,
      theoryExplanation: result.object.theoryExplanation,
    };
  } catch (error: any) {
    console.error("Error analyzing progression:", error);
    return {
      success: false,
      error: error.message || "No se pudo analizar la progresión.",
    };
  }
}
