"use server";

import { generateText, generateObject } from "ai";
import { getActiveAiProvider } from "../services/ai-provider.service";
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

      return {
        success: true,
        name: result.object.name,
        steps: steps,
      };
    } catch (err: any) {
      console.warn("Rhythm generation structured output failed, running fallback parser:", err);
      
      const fallbackPrompt = `${userPrompt}
IMPORTANTE: Tu respuesta debe ser EXCLUSIVAMENTE un objeto JSON en bruto válido, sin bloques de código markdown ni texto adicional.
Esquema:
{
  "name": "Nombre",
  "steps": [
    [true, false, ...], // Fila 0 (16 booleanos)
    [true, false, ...], // Fila 1 (16 booleanos)
    [true, false, ...], // Fila 2 (16 booleanos)
    [true, false, ...], // Fila 3 (16 booleanos)
    [true, false, ...]  // Fila 4 (16 booleanos)
  ]
}`;

      const textResult = await generateText({
        model: provider,
        system: systemPrompt,
        prompt: fallbackPrompt,
        abortSignal: AbortSignal.timeout(35000),
        maxRetries: 0
      });

      const cleanJson = textResult.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      
      if (!parsed.steps || parsed.steps.length !== 5 || parsed.steps.some((row: any) => row.length !== 16)) {
        throw new Error("El fallback JSON no tiene las dimensiones 5x16.");
      }

      return {
        success: true,
        name: parsed.name || "Patrón Personalizado IA",
        steps: parsed.steps,
      };
    }

  } catch (error: any) {
    console.warn("Error generating rhythm pattern via AI. Activating premium dynamic offline composer...", error);
    
    const lowerPrompt = prompt.toLowerCase();
    let name = "Groove Pop/Rock (Offline)";
    let steps = Array(5).fill(null).map(() => Array(16).fill(false));

    // A simple deterministic hash function from the prompt string
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      hash = prompt.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Helper to check if a step should be active based on hash, instrument probability, and beat structure
    const getStepVal = (instrumentIdx: number, stepIdx: number, density: number) => {
      // Keep a strong musical structure: beats 1 and 3 are stronger
      const isBeat1Or3 = stepIdx === 0 || stepIdx === 8;
      const isBeat2Or4 = stepIdx === 4 || stepIdx === 12;

      // Modify density based on instrument
      let prob = density;
      if (instrumentIdx === 0) { // Bass/Kick
        if (isBeat1Or3) return true; // Keep downbeats solid
        if (isBeat2Or4) prob = 0.1;
        else prob = 0.25;
      } else if (instrumentIdx === 1) { // Tenor (Snare/Clap)
        if (isBeat2Or4) return true; // Standard backbeat
        prob = 0.08;
      } else if (instrumentIdx === 4) { // Agudo (Hat)
        if (stepIdx % 2 === 0) return true; // Standard 8th notes
        prob = 0.45;
      } else { // Mid voices
        prob = 0.2;
      }

      // Deterministic pseudo-random check based on hash and step coordinates
      const val = Math.abs(Math.sin(hash + instrumentIdx * 43 + stepIdx * 17));
      return val < prob;
    };

    if (lowerPrompt.includes("dembow") || lowerPrompt.includes("reggaeton") || lowerPrompt.includes("urbano")) {
      name = "Dembow Sincopado (Offline)";
      // Kick/Bass
      steps[0] = [true, false, false, true, false, false, true, false, true, false, false, true, false, false, true, false];
      // Tenor (Snare/Clap)
      steps[1] = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
      // Voice
      steps[2] = [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
      // Agudo
      steps[4] = [false, false, true, false, false, true, false, true, false, false, true, false, false, true, false, true];

      // Add small hash-based fills
      for (let c = 0; c < 16; c++) {
        if (c % 4 !== 0 && c % 3 !== 0) {
          const val = Math.abs(Math.sin(hash + c * 29));
          if (val < 0.25) steps[3][c] = true; // add some high harmony accents
        }
      }
    } else if (lowerPrompt.includes("house") || lowerPrompt.includes("edm") || lowerPrompt.includes("techno") || lowerPrompt.includes("dance")) {
      name = "House 4-on-the-Floor (Offline)";
      // Kick/Bass
      steps[0] = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
      // Tenor (Hat)
      steps[1] = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
      // Voice
      steps[2] = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
      // Agudo
      steps[4] = [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false];

      // Add dynamic hi-hat accents based on hash
      for (let c = 0; c < 16; c++) {
        if (c % 2 !== 0) {
          const val = Math.abs(Math.sin(hash + c * 31));
          if (val < 0.35) steps[4][c] = true;
        }
      }
    } else if (lowerPrompt.includes("rock") || lowerPrompt.includes("metal") || lowerPrompt.includes("pesado") || lowerPrompt.includes("heavy")) {
      name = `Heavy Rock Groove (Offline)`;
      // Punchy rock beat
      steps[0] = [true, false, false, false, false, false, false, true, true, false, false, false, false, false, true, false]; // Double kick
      steps[1] = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false]; // Snare on 2 and 4
      steps[4] = [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false]; // Constant hats
      
      // Add custom variations based on hash (Kick double bass drum action or snare ghost notes!)
      for (let c = 0; c < 16; c++) {
        const kickVal = Math.abs(Math.sin(hash + c * 13));
        const snareVal = Math.abs(Math.sin(hash + c * 19));
        const tomVal = Math.abs(Math.sin(hash + c * 37));

        if (c % 4 !== 0 && c % 4 !== 2) {
          if (kickVal < 0.28) steps[0][c] = true; // extra kick accents!
          if (snareVal < 0.15) steps[1][c] = true; // ghost snares!
        }
        if (tomVal < 0.22) steps[2][c] = true; // tom accents!
        if (tomVal > 0.8) steps[3][c] = true; // cymbal accents!
      }
    } else if (lowerPrompt.includes("funk") || lowerPrompt.includes("groove") || lowerPrompt.includes("disco")) {
      name = `Funk Sincopado (Offline)`;
      steps[0] = [true, false, false, false, false, false, true, false, false, true, false, false, false, false, true, false];
      steps[1] = [false, false, true, false, true, false, false, false, false, false, true, false, true, false, false, false];
      steps[2] = [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
      steps[3] = [false, false, false, true, false, false, false, false, false, false, false, true, false, false, false, false];
      steps[4] = [true, false, true, false, false, true, false, true, true, false, true, false, false, true, false, true];

      // Dynamic funk additions
      for (let c = 0; c < 16; c++) {
        const val = Math.abs(Math.sin(hash + c * 47));
        if (val < 0.25) steps[4][c] = true; // extra hats
        if (val > 0.85) steps[2][c] = true; // extra ghost fills
      }
    } else if (lowerPrompt.includes("cumbia") || lowerPrompt.includes("tropical") || lowerPrompt.includes("salsa")) {
      name = "Ritmo Tropical/Cumbia (Offline)";
      steps[0] = [true, false, false, false, false, false, true, false, true, false, false, false, false, false, true, false];
      steps[1] = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
      steps[2] = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
      steps[4] = [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true];

      for (let c = 0; c < 16; c++) {
        const val = Math.abs(Math.sin(hash + c * 23));
        if (val < 0.25) steps[3][c] = true; // conga accents!
      }
    } else if (lowerPrompt.includes("rap") || lowerPrompt.includes("hiphop") || lowerPrompt.includes("lofi") || lowerPrompt.includes("trap")) {
      name = `Hip-Hop Beat (Offline)`;
      steps[0] = [true, false, false, false, false, false, false, true, false, true, false, false, false, false, false, false];
      steps[1] = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
      steps[4] = [true, false, true, true, true, false, true, false, true, false, true, true, true, false, true, false];
      
      // Add trap hats or boom bap ghost hits based on prompt
      const isTrap = lowerPrompt.includes("trap");
      for (let c = 0; c < 16; c++) {
        const val = Math.abs(Math.sin(hash + c * 59));
        if (isTrap) {
          if (val < 0.6) steps[4][c] = true; // rapid hihat roll!
        } else {
          if (val < 0.15) steps[2][c] = true; // swingy lazy fills
        }
      }
    } else {
      // General custom prompt generator
      name = `Groove Personalizado (Offline)`;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 16; c++) {
          steps[r][c] = getStepVal(r, c, 0.28);
        }
      }
    }

    return {
      success: true,
      name: `${name}`,
      steps: steps,
    };
  }
}

// ─────────────────────────────────────────────────────────────
//  POLYPHONIC AI RHYTHM GENERATOR
// ─────────────────────────────────────────────────────────────

export type PolyphonicVoiceRole = "bass" | "melody" | "countermelody" | "pad";

export interface PolyphonicVoiceNote {
  note: string;
  startBeat: number;
  durationBeats: number;
  velocity: number;
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
    melody: `MELODÍA PRINCIPAL (melody): Octava 4-5. Es la voz más aguda y cantable. Debe trazar un arco melódico expresivo sobre los cambios de acorde. Usa principalmente las notas del acorde activo pero puede incluir notas de paso escalísticas. Canal MIDI: 3. Preset: grand-piano.`,
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

    try {
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

      const validVoices = voices.filter(v => v.notes && v.notes.length > 0);
      if (validVoices.length === 0) {
        throw new Error("Las voces generadas no contienen notas.");
      }

      return { success: true, voices: validVoices as PolyphonicVoice[] };
    } catch (err: any) {
      console.warn("[PolyphonicRhythm] Structured output failed, trying text fallback:", err?.message);

      const fallbackPrompt = `${userPrompt}

IMPORTANTE: Responde EXCLUSIVAMENTE con un JSON válido (sin markdown):
{
  "voices": [
    {
      "voiceName": "Línea de Bajo",
      "voiceRole": "bass",
      "instrumentPreset": "electric-bass",
      "midiChannel": 2,
      "notes": [
        {"note": "C3", "startBeat": 0.0, "durationBeats": 1.0, "velocity": 0.9}
      ]
    }
  ]
}
Genera exactamente ${selectedVoices.length} voz(es): ${selectedVoices.join(", ")}. Total beats: ${totalBeats}.`;

      const textResult = await generateText({
        model: provider,
        system: systemPrompt,
        prompt: fallbackPrompt,
        abortSignal: AbortSignal.timeout(45000),
        maxRetries: 0
      });

      const cleanJson = textResult.text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleanJson);
      if (!parsed.voices || parsed.voices.length === 0) {
        throw new Error("El fallback no generó voces válidas.");
      }

      return { success: true, voices: parsed.voices as PolyphonicVoice[] };
    }
  } catch (error: any) {
    console.warn("[PolyphonicRhythm] AI failed — running offline polyphonic fallback:", error?.message);

    const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const getFifth = (pitch: string): string => {
      const idx = CHROMATIC.indexOf(pitch.replace("b", "#").toUpperCase());
      return idx >= 0 ? CHROMATIC[(idx + 7) % 12] : "G";
    };

    const offlineVoices: PolyphonicVoice[] = [];

    selectedVoices.forEach((role) => {
      const notes: PolyphonicVoiceNote[] = [];

      chordsList.forEach((chord, chordIdx) => {
        const baseStart = chordIdx * 4;
        const rawNotes = chord.pianoNotes && chord.pianoNotes.length > 0 ? chord.pianoNotes : ["C4"];
        const match = rawNotes[0].match(/^([A-G][#b]?)([0-9])$/i);
        const pitch = match ? match[1] : "C";
        const octave = match ? parseInt(match[2], 10) : 4;
        const fifth = getFifth(pitch);
        const third = rawNotes[1] || `${fifth}${octave}`;
        const fifth2 = rawNotes[2] || `${fifth}${octave}`;

        if (role === "bass") {
          const bassOct = Math.max(1, octave - 2);
          notes.push({ note: `${pitch}${bassOct}`, startBeat: baseStart + 0.0, durationBeats: 1.0, velocity: 0.95 });
          notes.push({ note: `${fifth}${bassOct}`, startBeat: baseStart + 1.5, durationBeats: 0.5, velocity: 0.85 });
          notes.push({ note: `${pitch}${bassOct}`, startBeat: baseStart + 2.0, durationBeats: 1.0, velocity: 0.9 });
          if (rhythmicDensity !== "sparse") {
            notes.push({ note: `${fifth}${bassOct}`, startBeat: baseStart + 3.5, durationBeats: 0.5, velocity: 0.8 });
          }
        } else if (role === "melody") {
          const melOct = Math.max(3, Math.min(5, octave));
          const step = rhythmicDensity === "sparse" ? 1.5 : rhythmicDensity === "medium" ? 1.0 : 0.5;
          notes.push({ note: `${pitch}${melOct}`, startBeat: baseStart + 0.0, durationBeats: step, velocity: 0.88 });
          notes.push({ note: third, startBeat: baseStart + step, durationBeats: step, velocity: 0.82 });
          notes.push({ note: fifth2, startBeat: baseStart + step * 2, durationBeats: step, velocity: 0.85 });
          if (rhythmicDensity === "dense") {
            notes.push({ note: `${pitch}${melOct + 1}`, startBeat: baseStart + step * 3, durationBeats: step, velocity: 0.78 });
          }
        } else if (role === "countermelody") {
          const cOct = Math.max(2, octave - 1);
          notes.push({ note: third, startBeat: baseStart + 0.5, durationBeats: 1.0, velocity: 0.7 });
          notes.push({ note: `${pitch}${cOct}`, startBeat: baseStart + 2.5, durationBeats: 1.0, velocity: 0.65 });
          if (rhythmicDensity === "dense") {
            notes.push({ note: `${fifth}${cOct}`, startBeat: baseStart + 1.5, durationBeats: 0.5, velocity: 0.6 });
          }
        } else if (role === "pad") {
          const padOct = Math.max(2, octave - 1);
          const duration = rhythmicDensity === "sparse" ? 4.0 : rhythmicDensity === "medium" ? 2.0 : 1.5;
          notes.push({ note: `${pitch}${padOct}`, startBeat: baseStart + 0.0, durationBeats: duration, velocity: 0.55 });
          notes.push({ note: third, startBeat: baseStart + 0.0, durationBeats: duration, velocity: 0.5 });
          notes.push({ note: fifth2, startBeat: baseStart + 0.0, durationBeats: duration, velocity: 0.48 });
        }
      });

      const voiceMeta: Record<PolyphonicVoiceRole, { name: string; preset: string; channel: number }> = {
        bass: { name: "Bajo IA", preset: "electric-bass", channel: 2 },
        melody: { name: "Melodía IA", preset: "grand-piano", channel: 3 },
        countermelody: { name: "Contrapunto IA", preset: "electric-piano", channel: 4 },
        pad: { name: "Pad Armónico IA", preset: "synth-pad", channel: 5 },
      };

      offlineVoices.push({
        voiceName: voiceMeta[role].name,
        voiceRole: role,
        instrumentPreset: voiceMeta[role].preset,
        midiChannel: voiceMeta[role].channel,
        notes,
      });
    });

    return { success: true, voices: offlineVoices };
  }
}
