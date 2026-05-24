"use server";

import { generateObject } from "ai";
import { getActiveAiProvider } from '@/features/ai-assistant/services/ai-provider.service';
import { chordInputSchema, chordProgressionSchema, ChordInput, ChordProgression } from '@/features/chord-generator/schemas/chord-generator.schema';

export interface GenerateChordProgressionResult {
  success: boolean;
  data?: ChordProgression;
  error?: string;
  debugInfo?: string;
}

export async function generateChordProgressionAction(data: ChordInput): Promise<GenerateChordProgressionResult> {
  const validated = chordInputSchema.parse(data);
  const count = validated.chordCount || 4;

  try {
    // 1. Get the active AI provider
    const provider = await getActiveAiProvider();

    // 2. Define the system prompt to guide the LLM
    const systemPrompt = `Eres un compositor y teórico musical de clase mundial experto en armonía de jazz, pop, clásica y neo-soul.
Tu tarea es componer una progresión de acordes hermosa, coherente y emotiva (de EXACTAMENTE ${count} acordes) que se ajuste a la descripción del usuario.
Debes rellenar todos los campos del esquema JSON estructurado de forma ultra-concisa.

{
  "name": "Nostalgia de Otoño",
  "description": "Vibra melancólica con jazz lento y fluido.",
  "key": "C Minor",
  "tempo": 80,
  "theoryExplanation": "Esta secuencia utiliza un acorde Cm9 inicial de tónica para establecer una base sombría. Luego, la subdominante Fm9 introduce tensión suave mediante un voicing Drop 2, resolviendo las voces superiores fluidamente por grados conjuntos.",
  "chords": [
    {
      "chord": "Cm9",
      "duration": 4,
      "role": "Tónica",
      "romanNumeral": "i9",
      "suggestedScale": "C Dórica",
      "description": "Inicio sombrío.",
      "voicing": "Close",
      "inversion": "Fundamental",
      "pianoNotes": ["C3", "Eb3", "G3", "Bb3", "D4"]
    },
    {
      "chord": "Fm9",
      "duration": 4,
      "role": "Subdominante",
      "romanNumeral": "iv9",
      "suggestedScale": "F Dórica",
      "description": "Tensión y movimiento.",
      "voicing": "Drop 2",
      "inversion": "1ra Inversión",
      "pianoNotes": ["Ab3", "C4", "Eb4", "F4", "G4"]
    }
  ]
}

REGLAS DE TEORÍA Y CORRESPONDENCIA DE BAJO (OBLIGATORIO):
- La nota más grave (la primera del array 'pianoNotes') DEBE corresponder exactamente a la inversión seleccionada en 'inversion':
  * 'Fundamental': La nota más grave de 'pianoNotes' debe ser la tónica (ej. C3 para Cm9).
  * '1ra Inversión': La nota más grave de 'pianoNotes' debe ser la tercera del acorde (ej. Ab3 para Fm9, o Eb3 para Cm9).
  * '2da Inversión': La nota más grave de 'pianoNotes' debe ser la quinta del acorde (ej. C4 para Fm9, o G3 para Cm9).
  * '3ra Inversión': La nota más grave de 'pianoNotes' debe ser la séptima del acorde (ej. Eb4 para Fm9, o Bb3 para Cm9).
- INCLUSIÓN DE LA TÓNICA (OBLIGATORIO): Todo acorde generado DEBE incluir obligatoriamente la tónica (Root/Fundamental) del acorde dentro del array 'pianoNotes'. Por ejemplo, para Ebm9, 'pianoNotes' DEBE incluir la nota Eb (ej. Eb3 o Eb4). Queda STRICTAMENTE PROHIBIDO utilizar voicings 'Rootless' (sin tónica) que omitan la nota fundamental.

REGLAS DE CONCISIÓN DE OBLIGADO CUMPLIMIENTO:
- Genera EXACTAMENTE ${count} acordes (ni más ni menos).
- 'description' principal de la progresión: MÁXIMO 8 palabras.
- 'description' individual de cada acorde: MÁXIMO 5 palabras.
- 'romanNumeral': MÁXIMO 2 palabras (ej: 'i9', 'V7b9', 'bVImaj7').
- 'suggestedScale': MÁXIMO 3 palabras (ej: 'C Dórica', 'G Alterada', 'Ab Lidia').
- 'theoryExplanation': Explicación teórica detallada sobre las tensiones y resoluciones de toda la progresión. MÁXIMO 60 palabras.
- 'voicing': MÁXIMO 2 palabras (ej: 'Drop 2', 'Close').
- 'inversion': MÁXIMO 2 palabras (ej: 'Fundamental', '1ra Inversión').
- 'pianoNotes': Notas individuales de la octava 3 a la 4, de grave a agudo (ej. C3, Eb3, G3, Bb3, D4).
- RITMO ARMÓNICO VARIABLE (CRÍTICO): Debes asignar una 'duration' a cada acorde de forma inteligente y realista para la progresión (en tiempos/beats). No asumas que todo dura 4 tiempos. Puedes usar 1, 2, 3, 4 o fracciones (0.5, 1.5). La suma de la duración de todos los acordes representará el total de tiempos de la sección. Ajusta la velocidad armónica (armonía rítmica) al género.`;

    // Build target user prompt respecting key, scale, and tempo
    let targetPrompt = `Genera una progresión de exactamente ${count} acordes basada en el prompt: "${validated.prompt}".\n`;
    if (validated.key && validated.key !== "Automático") {
      targetPrompt += `- Tonalidad obligatoria: Debe estar estrictamente en la tonalidad de: ${validated.key}.\n`;
    }
    if (validated.scale && validated.scale !== "Automático") {
      targetPrompt += `- Escala/Modo obligatorio: Debe basarse en la escala o modo de: ${validated.scale}.\n`;
    }
    if (validated.tempo && validated.tempo !== "Automático" && validated.tempo.trim() !== "") {
      targetPrompt += `- Tempo (BPM) obligatorio: Debe sugerir exactamente: ${validated.tempo} BPM.\n`;
    }

    // 3. Generate structured JSON output using the recommended Vercel AI SDK generateText API with Output.object
    console.log(`Calling Vercel AI SDK generateText with Output.object for prompt (${count} chords):`, targetPrompt);
    
    const result = await generateObject({
      model: provider,
      schema: chordProgressionSchema,
      system: systemPrompt,
      prompt: targetPrompt,
      abortSignal: AbortSignal.timeout(45000),
      maxRetries: 0
    });

    return {
      success: true,
      data: result.object,
    };
  } catch (error: any) {
    console.error("Error generating chord progression via AI:", error);
    
    // Extract actual error string if it is an object
    let errorMessage = error.message || "Failed to generate chord progression via AI.";
    if (typeof error === 'object' && error !== null) {
      if (error.value) errorMessage = JSON.stringify(error.value);
      else if (error.cause) errorMessage = JSON.stringify(error.cause);
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}
