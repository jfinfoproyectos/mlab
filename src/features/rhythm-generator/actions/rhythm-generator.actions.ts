"use server";

import { generateObject } from "ai";
import { getActiveAiProvider } from '@/features/ai-assistant/services/ai-provider.service';
import { z } from "zod";

const rhythmPatternSchema = z.object({
  name: z.string().describe("Nombre creativo del patrón"),
  steps: z.array(z.array(z.boolean())).describe("Una matriz de 5 filas y 16 pasos booleanos"),
});

export interface GenerateRhythmResult {
  success: boolean;
  name?: string;
  steps?: boolean[][];
  error?: string;
}

export async function generateRhythmPatternAction(prompt: string): Promise<GenerateRhythmResult> {
  if (!prompt || prompt.trim() === "") {
    return { success: false, error: "El prompt es obligatorio." };
  }

  try {
    const provider = await getActiveAiProvider();

    const systemPrompt = `Eres un percusionista y programador de ritmos MIDI de clase mundial.
Tu tarea es programar un patrón rítmico profesional y con groove en una cuadrícula de 5 filas y 16 pasos (compás de 4/4 dividido en semicorcheas, de paso 0 a 15).
Las 5 filas representan los siguientes registros musicales (de abajo hacia arriba, índice 0 a 4):
- Fila 0 (Bajo / Grave): Línea de bajo y acentos rítmicos graves.
- Fila 1 (Tenor): Notas de compresión media baja.
- Fila 2 (Voz Media): Relleno armónico intermedio.
- Fila 3 (Tercera): Notas de armonía y contrapuntos.
- Fila 4 (Melodía / Agudo): Acentos agudos y melodías sincopadas.

Debes devolver un objeto JSON con:
1. 'name': Un nombre creativo y descriptivo para el patrón.
2. 'steps': Una matriz de 5 filas, donde cada fila tiene EXACTAMENTE 16 valores booleanos (true para nota activa, false para silencio).

REGLAS DE GROOVE PROFESIONAL:
- Si el usuario pide un género como 'Reggaeton' o 'Dembow': La Fila 0 (Bajo) debe tener golpes sincopados clásicos del Dembow (ej: pasos 0, 3, 8, 11) y la Fila 4 (Agudo) debe complementar con contratiempos.
- Si el usuario pide 'Funk': Debe ser un patrón sincopado muy activo, con notas en la Fila 0 (Bajo) y adornos rápidos en la Fila 4 (Agudo).
- Si el usuario pide 'House' o 'EDM': Fila 0 debe ser golpes constantes 4-on-the-floor (pasos 0, 4, 8, 12) y las otras filas rellenar rítmicamente.
- Si el usuario pide 'Cumbia': Debe tener el contratiempo clásico cumbiero.
- FINALES / OUTROS: Si la instrucción indica que es un final, outro o cierre, el patrón debe ir disminuyendo su energía y terminar con un golpe fuerte (crash/bombo) en el paso 0, y el resto de los pasos (1 al 15) deben ser COMPLETAMENTE SILENCIO en todas las filas.
- ASEGÚRATE de que cada una de las 5 filas tenga EXACTAMENTE 16 booleanos. No agregues más de 16 pasos por fila ni menos de 16.`;

    const userPrompt = `Genera un patrón rítmico creativo y profesional de 16 pasos basado en la siguiente instrucción de estilo: "${prompt}"`;

    try {
      const result = await generateObject({
        model: provider,
        schema: rhythmPatternSchema,
        system: systemPrompt,
        prompt: userPrompt,
        abortSignal: AbortSignal.timeout(45000),
        maxRetries: 0
      });

      const steps = result.object.steps;
      if (!steps || steps.length !== 5 || steps.some(row => row.length !== 16)) {
        throw new Error("La cuadrícula generada no tiene las dimensiones correctas (5x16).");
      }

      return { success: true, name: result.object.name, steps };
    } catch (error: any) {
      console.error("Error generating rhythm pattern via AI:", error);
      return { success: false, error: error.message || "Failed to generate rhythm pattern." };
    }
  } catch (error: any) {
    console.error("Outer error generating rhythm:", error);
    return { success: false, error: error.message || "Unknown error." };
  }
}
//  POLYPHONIC AI RHYTHM GENERATOR
// ─────────────────────────────────────────────────────────────

export type PolyphonicVoiceRole = "bass" | "melody" | "countermelody" | "pad";

export interface PolyphonicVoiceNote {
  note: string;
  startBeat: number;
  durationBeats: number;
  velocity: number;
  sustain?: boolean;
}

export interface PolyphonicVoice {
  voiceName: string;
  voiceRole: PolyphonicVoiceRole;
  instrumentPreset: string;
  midiChannel: number;
  notes: PolyphonicVoiceNote[];
}

export interface GeneratePolyphonicRhythmResult {
  success: boolean;
  voices?: PolyphonicVoice[];
  error?: string;
}

const polyphonicNoteSchema = z.object({
  note: z.string().describe("Nota musical con octava (ej: C4, Eb3, G5)"),
  startBeat: z.number().describe("Tiempo de inicio en negras (0.0 a totalBeats)"),
  durationBeats: z.number().describe("Duración en negras (ej: 0.25, 0.5, 1.0, 2.0)"),
  velocity: z.number().min(0.0).max(1.0).describe("Volumen de la nota (0.0 a 1.0)"),
  sustain: z.boolean().optional().describe("Si es true, se aplicará el efecto pedal sustain MIDI (CC 64) en esta nota"),
});

const polyphonicVoiceSchema = z.object({
  voiceName: z.string().describe("Nombre descriptivo de la voz (ej: Línea de Bajo, Melodía Principal)"),
  voiceRole: z.enum(["bass", "melody", "countermelody", "pad"]).describe("Rol musical de la voz"),
  instrumentPreset: z.string().describe("Preset de instrumento sugerido: grand-piano, electric-bass, synth-pad, electric-piano, strings"),
  midiChannel: z.number().min(1).max(16).describe("Canal MIDI recomendado para esta voz"),
  notes: z.array(polyphonicNoteSchema).describe("Notas de esta voz para la sección completa"),
});

const polyphonicResponseSchema = z.object({
  voices: z.array(polyphonicVoiceSchema).describe("Array de todas las voces polifónicas generadas"),
});

export async function generatePolyphonicRhythmAction(params: {
  prompt: string;
  songTitle: string;
  sectionType: string;
  sectionKey: string;
  sectionScale: string;
  chordsList: Array<{ chord: string; pianoNotes: string[]; role: string }>;
  selectedVoices: PolyphonicVoiceRole[];
  rhythmicDensity: "sparse" | "medium" | "dense";
  tempo?: number;
}): Promise<GeneratePolyphonicRhythmResult> {
  const {
    prompt,
    songTitle,
    sectionType,
    sectionKey,
    sectionScale,
    chordsList,
    selectedVoices,
    rhythmicDensity,
    tempo = 90,
  } = params;

  if (!selectedVoices || selectedVoices.length === 0) {
    return { success: false, error: "Debes seleccionar al menos una voz." };
  }

  const totalBeats = chordsList.length * 4;

  const chordsString = chordsList
    .map((c, idx) => {
      const start = idx * 4;
      const end = start + 4;
      return `  Acorde ${idx + 1}: ${c.chord} | Notas: ${c.pianoNotes.join(", ")} | Función: ${c.role} | Tiempos: ${start.toFixed(1)}–${(end - 0.01).toFixed(2)}`;
    })
    .join("\n");

  const densityInstructions: Record<typeof rhythmicDensity, string> = {
    sparse: "Usa pocas notas: máximo 3-5 notas por compás de 4 tiempos. Deja silencios amplios. Duración media por nota: 1.0-2.0 beats.",
    medium: "Densidad media: 6-10 notas por compás. Mezcla notas largas y cortas. Duración media: 0.5-1.0 beats.",
    dense: "Alta densidad rítmica: 10-16 notas por compás. Semicorcheas y contratiempos frecuentes. Duración media: 0.25-0.5 beats.",
  };

  const voiceInstructions: Record<PolyphonicVoiceRole, string> = {
    bass: `LÍNEA DE BAJO (bass): Octava 2-3. Debe anclar la armonía. Toca la fundamental del acorde en el tiempo 1 de cada compás. Puede incluir notas de aproximación cromática, la quinta del acorde y walk-ups entre acordes. Canal MIDI: 2. Preset: electric-bass.`,
    melody: `MELODÍA PRINCIPAL (melody): Octava 4-5. Es la voz más aguda y cantable. >>> ¡Crea melodías MÁGICAS e INSPIRADORAS! <<< NO te limites a las notas del acorde. Usa tensiones (9nas, 11nas, 13ras), notas de paso diatónicas y cromáticas libremente. Debe trazar un arco melódico expresivo y profundamente emocional que trascienda la progresión base. Canal MIDI: 3. Preset: grand-piano.`,
    countermelody: `CONTRAPUNTO / CONTRAMELODÍA (countermelody): Octava 3-4. Voz interior que complementa la melodía principal con movimiento contrario: cuando la melodía sube, el contrapunto debe tender a bajar. Evita duplicar notas exactas de la melodía en el mismo tiempo. Canal MIDI: 4. Preset: electric-piano.`,
    pad: `PAD ARMÓNICO (pad): Octava 3-4. Notas largas y sostenidas que rellenan el espacio armónico. Puede usar 2-3 notas simultáneas (voicings). Cambia de notas en cada cambio de acorde. Velocidades bajas (0.4-0.65) para no dominar. Canal MIDI: 5. Preset: synth-pad.`,
  };

  const activeVoiceInstructions = selectedVoices
    .map((v, i) => `${i + 1}. ${voiceInstructions[v]}`)
    .join("\n\n");

  const systemPrompt = `Eres un arreglista orquestal y productor musical de clase mundial. Tu especialidad es la escritura de partituras POLIFÓNICAS — múltiples voces musicales independientes que suenan simultáneamente y se complementan armónicamente.

REGLAS ABSOLUTAS DE POLIFONÍA PROFESIONAL:
1. INDEPENDENCIA DE VOCES: Cada voz debe tener un ritmo y movimiento melódico independiente. Nunca toques todas las voces en el mismo beat exacto.
2. CONTRAPUNTO: Aplica movimiento contrario entre voces adyacentes cuando sea posible.
3. NO COLISIONES: Asegúrate de que dos voces no toquen la misma nota en el mismo octava al mismo tiempo.
4. JERARQUÍA DINÁMICA: Bajo (velocity 0.8-1.0), Melodía (0.7-0.9), Contrapunto/Pad (0.4-0.7).
5. DIRECCIÓN MELÓDICA: Cada voz debe tener una dirección clara. Preferir movimiento conjunto sobre saltos grandes.
6. COBERTURA DE ACORDES: Cada voz DEBE tener al menos 2 notas por compás, dentro del rango de tiempos del acorde activo.
7. FINALES REALES Y CONCLUSIVOS (CRÍTICO): Si la sección actual es un "Outro", "Final" o similar, TODAS las voces deben converger y resolver en el último acorde. Deben tocar notas largas sostenidas (durationBeats entre 4.0 y 8.0) en el inicio de ese último acorde y luego mantener silencio absoluto. NO generar más notas rítmicas ni melodías rápidas al final, debe sonar como el verdadero final definitivo de una canción.

INFORMACIÓN MUSICAL:
- Canción: ${songTitle}
- Sección: ${sectionType}
- Tonalidad: ${sectionKey} | Escala: ${sectionScale}
- Tempo: ${tempo} BPM
- Total de beats: ${totalBeats}

PROGRESIÓN DE ACORDES (cada acorde dura exactamente 4 beats):
${chordsString}

DENSIDAD RÍTMICA REQUERIDA: ${densityInstructions[rhythmicDensity]}

VOCES A GENERAR (exactamente estas ${selectedVoices.length}):
${activeVoiceInstructions}

ESTILO DEL USUARIO: "${prompt}"

El resultado debe sonar como una partitura real de un músico profesional. Devuelve SOLO las ${selectedVoices.length} voz(es) solicitada(s).`;

  const userPrompt = `Genera la partitura polifónica para la sección "${sectionType}" de "${songTitle}". Voces: ${selectedVoices.join(", ")}. Total de beats: ${totalBeats}. Estilo: "${prompt}".`;

  try {
    const provider = await getActiveAiProvider();

    const result = await generateObject({
        model: provider,
        schema: polyphonicResponseSchema,
        system: systemPrompt,
        prompt: userPrompt,
        abortSignal: AbortSignal.timeout(60000),
        maxRetries: 0
      });

      const voices = result.object.voices;
      if (!voices || voices.length === 0) {
        throw new Error("La IA no generó ninguna voz polifónica.");
      }

      const validVoices = voices.filter((v: any) => v.notes && v.notes.length > 0);
      if (validVoices.length === 0) {
        throw new Error("Las voces generadas no contienen notas.");
      }

      return { success: true, voices: validVoices as PolyphonicVoice[] };
  } catch (error: any) {
    console.error("Error generating polyphonic rhythm via AI:", error);
    // Extract actual error string if it is an object
    let errorMessage = error.message || "Failed to generate polyphonic rhythm via AI.";
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
