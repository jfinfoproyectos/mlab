import { z } from "zod";
import { chordProgressionSchema } from "./chord-generator.schema";

export const songInputSchema = z.object({
  prompt: z.string().min(1, "El prompt es obligatorio"),
  key: z.string().optional(),
  scale: z.string().optional(),
  tempo: z.string().optional(),
  structureMode: z.string().optional(),
  chordsMode: z.string().optional(),
  repetitionMode: z.string().optional(),
});

export type SongInput = z.infer<typeof songInputSchema>;

export const songSectionBlueprintSchema = z.object({
  type: z.string().describe("Tipo de sección (ej. Intro, Verso, Pre-Coro, Coro, Puente, Outro)"),
  prompt: z.string().describe("Instrucción armónica de color o vibra específica de esta sección"),
  key: z.string().describe("Tonalidad sugerida de esta sección (ej. C Minor)"),
  scale: z.string().describe("Escala de esta sección (ej. Dórico, Mayor)"),
  chordCount: z.number().min(2).max(8).optional().describe("Número de acordes sugerido para esta sección"),
  reusedFrom: z.string().optional().describe("Nombre exacto de la sección previa de la cual clonar la progresión (ej. 'Coro 1')"),
  variationOf: z.string().optional().describe("Nombre exacto de la sección previa de la cual es una variación armónica (ej. 'Verso 1')"),
});

export const songBlueprintSchema = z.object({
  title: z.string().describe("Título creativo de la canción"),
  genre: z.string().describe("Género principal de la canción"),
  key: z.string().describe("Tonalidad general sugerida de la canción (ej. C Minor)"),
  tempo: z.number().describe("BPM general sugerido de la canción (ej. 80)"),
  description: z.string().describe("Descripción de la narrativa o concepto (MÁXIMO 15 palabras)"),
  sections: z.array(songSectionBlueprintSchema).describe("Estructura ordenada de secciones (de 3 a 8 secciones, permitiendo repeticiones y variaciones lógicas)"),
});

export type SongSectionBlueprint = z.infer<typeof songSectionBlueprintSchema>;
export type SongBlueprint = z.infer<typeof songBlueprintSchema>;

export const songSectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  prompt: z.string(),
  key: z.string(),
  scale: z.string(),
  chords: chordProgressionSchema.nullable().optional(),
  chordCount: z.number().optional(),
  reusedFrom: z.string().optional(),
  variationOf: z.string().optional(),
});

export type SongSection = z.infer<typeof songSectionSchema>;

export const songSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  genre: z.string(),
  key: z.string(),
  tempo: z.number(),
  description: z.string(),
  sections: z.array(songSectionSchema),
});

export type SongStructure = z.infer<typeof songSchema>;
