import { z } from "zod";

export const pianoInputSchema = z.object({
  prompt: z.string().min(1, "El prompt es obligatorio"),
  musicStyle: z.string().optional(),
  complexity: z.enum(["simple", "intermediate", "advanced", "virtuoso"]).default("intermediate"),
  mode: z.enum(["accompaniment", "melody"]).default("accompaniment"),
  targetDurationMinutes: z.number().optional().describe("Duración objetivo de la pieza en minutos (ej. 2.0, 3.5)"),
  key: z.string().optional(),
  scale: z.string().optional(),
  tempo: z.string().optional(),
});

export type PianoInput = z.infer<typeof pianoInputSchema>;

// The structure of a single piano note, enforcing strict human playability ranges.
export const pianoNoteSchema = z.object({
  note: z.string().describe("Nota musical con octava (ej: C4, Eb5)"),
  startBeat: z.coerce.number().describe("Tiempo de inicio relativo AL INICIO DEL ACORDE ACTUAL (ej. 0.0)"),
  durationBeats: z.coerce.number().describe("Duración de la nota en negras (ej: 0.5, 1.0, 2.0)"),
  velocity: z.coerce.number().transform(v => v > 1 ? Math.min(1.0, v / 100) : Math.max(0.0, Math.min(1.0, v))).describe("Velocidad o volumen de la nota (0.0 a 1.0)"),
  hand: z.enum(["left", "right"]).describe("Mano asignada para tocar esta nota (left o right)"),
  sustain: z.boolean().optional().describe("Si es true, se aplicará el efecto pedal sustain MIDI (CC 64)"),
});

export const pianoChordBlockSchema = z.object({
  chordIndex: z.coerce.number().describe("Índice del acorde (0, 1, 2...)"),
  chordName: z.string().describe("Nombre del acorde asignado (ej. Cm9)"),
  durationBeats: z.coerce.number().describe("Duración exacta en tiempos de este acorde según la progresión asignada (ej. 1, 2, 3, o 4)"),
  notes: z.array(pianoNoteSchema).describe("Notas ARPEGIADAS de ESTE acorde. NUNCA pongas 3+ notas con el mismo startBeat. Distribúyelas en el tiempo: 0.0, 0.25, 0.5, 0.75, 1.0... como hace un pianista real. startBeat SIEMPRE va de 0.0 hasta (durationBeats - 0.05)."),
});


export type PianoNote = z.infer<typeof pianoNoteSchema>;

export const pianoSectionSchema = z.object({
  id: z.string(),
  type: z.string().describe("Tipo de sección (ej. Intro, Tema A, Desarrollo, Tema B, Outro)"),
  prompt: z.string().describe("Instrucción musical y de color para esta sección"),
  key: z.string().describe("Tonalidad (ej. C Minor)"),
  scale: z.string().describe("Escala (ej. Dórico, Menor Armónica)"),
  chordCount: z.number().optional(),
  notes: z.array(pianoNoteSchema).optional().describe("Lista de notas individuales generadas para la sección"),
  isGenerating: z.boolean().optional(),
  error: z.string().optional(),
});

export type PianoSection = z.infer<typeof pianoSectionSchema>;

export const pianoCompositionSchema = z.object({
  id: z.string(),
  title: z.string().describe("Título creativo de la pieza"),
  genre: z.string().describe("Género o estilo de la pieza de piano"),
  key: z.string().describe("Tonalidad general"),
  tempo: z.number().describe("BPM general (ej. 80)"),
  description: z.string().describe("Descripción de la narrativa o concepto (MÁXIMO 15 palabras)"),
  sections: z.array(pianoSectionSchema).describe("Estructura ordenada de secciones"),
  mode: z.enum(["accompaniment", "melody"]),
  complexity: z.enum(["simple", "intermediate", "advanced", "virtuoso"]),
});

export type PianoComposition = z.infer<typeof pianoCompositionSchema>;

// For the AI Blueprint generator
export const pianoBlueprintSchema = z.object({
  title: z.string().describe("Título creativo de la pieza de piano"),
  genre: z.string().describe("Estilo pianístico (ej. Clásico, Jazz, Neo-Soul, Pop, Balada)"),
  key: z.string().describe("Tonalidad general sugerida (ej. C Minor)"),
  tempo: z.coerce.number().describe("BPM general sugerido de la pieza (ej. 75)"),
  description: z.string().describe("Descripción de la vibra pianística (MÁXIMO 15 palabras)"),
  sections: z.array(z.object({
    type: z.string().describe("Tipo de sección (ej. Intro, Tema Principal, Desarrollo, Coda)"),
    prompt: z.string().describe("Instrucción armónica y rítmica específica para esta sección"),
    key: z.string().describe("Tonalidad sugerida de esta sección (ej. C Minor)"),
    scale: z.string().describe("Escala de esta sección (ej. Dórico, Mayor)"),
    chordCount: z.coerce.number().min(2).optional().describe("Número de compases o acordes sugerido para esta sección"),
  })).describe("Estructura ordenada de secciones"),
});

export type PianoBlueprint = z.infer<typeof pianoBlueprintSchema>;

// For the AI Section Generator (to generate actual piano notes)
export const pianoSectionNotesGenerationSchema = z.object({
  chainOfThought: z.string().describe("¡CRÍTICO! Explica PASO A PASO cómo vas a evitar los acordes en bloque. Diseña la rítmica de tu arpegio, las síncopas, y cómo distribuirás las notas en diferentes 'startBeat' antes de generarlas."),
  motifDescription: z.string().describe("Breve descripción del motivo musical o ritmo de acompañamiento empleado aquí, para pasarlo a la siguiente sección y mantener coherencia."),
  chordBlocks: z.array(pianoChordBlockSchema).describe("Lista de bloques de acordes. DEBES generar exactamente un bloque por cada acorde asignado en la progresión."),
}).refine((data) => {
  for (const block of data.chordBlocks) {
    const duration = block.durationBeats;
    
    // Al menos 1 nota para acordes muy cortos, o duration * 0.7 para acordes más largos
    const minNotes = duration <= 1.5 ? 1 : Math.max(2, Math.floor(duration * 0.7));
    if (block.notes.length < minNotes) {
      return false; // Rejects lazy/sparse note generation
    }

    const beatBuckets: Record<number, number> = {};
    for (const note of block.notes) {
      beatBuckets[note.startBeat] = (beatBuckets[note.startBeat] || 0) + 1;
    }

    // Permitir hasta 6 notas simultáneas (para acordes con ambas manos tocando juntas)
    const hasBlockChords = Object.values(beatBuckets).some((count) => count > 6);
    if (hasBlockChords) {
      return false;
    }

    // Para acordes largos (4 tiempos o más), no concentrar todo en el primer tiempo
    if (duration >= 4.0) {
      const allAtStart = block.notes.every((note) => note.startBeat < 1.0);
      if (allAtStart) {
        return false; // All notes are at the start, leaving the rest silent. Reject!
      }
    }
  }
  return true;
}, {
  message: "ERROR DE VALIDACIÓN: Has generado acordes masivos en bloque (más de 6 notas en el mismo startBeat) o has concentrado todas las notas al inicio de un acorde largo dejando el resto vacío. Debes arpegiar de forma creativa.",
});
