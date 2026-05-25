import { z } from "zod";

// Schema for the client form input
export const chordInputSchema = z.object({
  prompt: z.string().min(1, "El prompt es obligatorio"),
  key: z.string().optional(),
  scale: z.string().optional(),
  tempo: z.string().optional(),
  chordCount: z.number().optional(),
  lyrics: z.string().optional(),
});

export type ChordInput = z.infer<typeof chordInputSchema>;

// Schema for the structured LLM output
export const chordDetailsSchema = z.object({
  chord: z.string().describe("Nombre de acorde (ej: Cmaj7, Dm9)"),
  duration: z.number().describe("Duracion en tiempos (ej: 4, 2)"),
  role: z.string().describe("Rol armonico (ej: Tonica, Dominante)"),
  romanNumeral: z.string().describe("Grado romano relativo (ej: i9, V7b9, bVImaj7)"),
  suggestedScale: z.string().describe("Escala de improvisacion (ej: C Dorica, G Alterada)"),
  description: z.string().describe("Descripcion del color (MAX 5 palabras)"),
  voicing: z.string().describe("Voicing para piano (ej: Drop 2)"),
  inversion: z.string().describe("Inversion (ej: Estado Fundamental)"),
  pianoNotes: z.array(z.string()).describe("Notas octavas 3-4 (ej: Eb3, G3, Bb3, D4)"),
});

export const chordProgressionSchema = z.object({
  name: z.string().describe("Nombre de la progresion"),
  description: z.string().describe("Descripcion (MAX 15 palabras)"),
  key: z.string().describe("Tonalidad (ej: C Minor)"),
  tempo: z.number().describe("BPM (ej: 75)"),
  theoryExplanation: z.string().describe("Explicación teórica detallada de la secuencia (MAX 60 palabras)"),
  chords: z.array(chordDetailsSchema).describe("Lista de acordes"),
});

export type ChordDetails = z.infer<typeof chordDetailsSchema>;
export type ChordProgression = z.infer<typeof chordProgressionSchema>;
