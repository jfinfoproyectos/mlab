import { z } from "zod";
import { chordProgressionSchema } from '@/features/chord-generator/schemas/chord-generator.schema';

export const songInputSchema = z.object({
  generationMode: z.enum(["idea", "lyrics", "piano"]).optional(),
  lyrics: z.string().optional(),
  prompt: z.string().min(1, "El prompt es obligatorio"),
  key: z.string().optional(),
  scale: z.string().optional(),
  tempo: z.string().optional(),
  targetDurationMinutes: z.number().optional().describe("Duración objetivo de la canción en minutos (ej. 2.5, 3.0)"),
  musicStyle: z.string().optional(),
  autoGenerateRhythm: z.boolean().optional(),
  rhythmPolyphonic: z.preprocess((val) => {
    if (typeof val === "string") return val === "true";
    return val;
  }, z.boolean()).optional(),
  rhythmDensity: z.enum(["sparse", "medium", "dense"]).optional(),
  polyphonicVoices: z.array(z.string()).optional(),
  pianoMode: z.enum(["accompaniment", "melody"]).optional(),
  pianoComplexity: z.enum(["simple", "intermediate", "advanced", "virtuoso"]).optional(),
});

export type SongInput = z.infer<typeof songInputSchema>;

export const songSectionBlueprintSchema = z.object({
  type: z.string().describe("Tipo de sección (ej. Intro, Verso, Pre-Coro, Coro, Puente, Outro)"),
  prompt: z.string().describe("Instrucción armónica de color o vibra específica de esta sección"),
  key: z.string().describe("Tonalidad sugerida de esta sección (ej. C Minor)"),
  scale: z.string().describe("Escala de esta sección (ej. Dórico, Mayor)"),
  chordCount: z.coerce.number().min(2).optional().describe("Número de acordes sugerido para esta sección"),
  reusedFrom: z.string().optional().describe("Nombre exacto de la sección previa de la cual clonar la progresión (ej. 'Coro 1')"),
  variationOf: z.string().optional().describe("Nombre exacto de la sección previa de la cual es una variación armónica (ej. 'Verso 1')"),
  lyrics: z.string().optional().describe("Letra asignada a esta sección específica"),
});

export const songBlueprintSchema = z.object({
  title: z.string().describe("Título creativo de la canción"),
  genre: z.string().describe("Género principal de la canción"),
  key: z.string().describe("Tonalidad general sugerida de la canción (ej. C Minor)"),
  tempo: z.coerce.number().describe("BPM general sugerido de la canción (ej. 80)"),
  description: z.string().describe("Descripción de la narrativa o concepto (MÁXIMO 15 palabras)"),
  sections: z.array(songSectionBlueprintSchema).describe("Estructura ordenada de secciones, cantidad totalmente libre dictada por la duración o letra"),
});

export type SongSectionBlueprint = z.infer<typeof songSectionBlueprintSchema>;
export type SongBlueprint = z.infer<typeof songBlueprintSchema>;

export const songTrackNoteSchema = z.object({
  id: z.string().optional().describe("Identificador único de la nota"),
  note: z.string().describe("Nota musical con octava (ej: C4, Eb5)"),
  startBeat: z.number().describe("Tiempo de inicio en negras relativo a la sección (0.0 a 16.0)"),
  durationBeats: z.number().describe("Duración de la nota en negras (ej: 0.5, 1.0, 2.0)"),
  velocity: z.number().min(0.0).max(1.0).describe("Velocidad o volumen de la nota (0.0 a 1.0)"),
  sustain: z.boolean().optional().describe("Si es true, se aplicará el efecto pedal sustain MIDI (CC 64)"),
  syllable: z.string().optional().describe("Sílaba de la letra cantada en esta nota (solo para melodías vocales)"),
});

export type SongTrackNote = z.infer<typeof songTrackNoteSchema>;

export const songSectionTrackSchema = z.object({
  id: z.string(),
  name: z.string().describe("Nombre de la pista (ej: Voz Principal, Línea de Bajo)"),
  midiChannel: z.number().min(1).max(16).describe("Canal MIDI para reproducir esta pista (1 a 16)"),
  instrumentPreset: z.string().optional().describe("Preset de instrumento opcional para sintetizador interno"),
  notes: z.array(songTrackNoteSchema),
  prompt: z.string().optional().describe("Prompt opcional utilizado para la generación"),
  volume: z.number().min(0.0).max(1.0).default(0.7).describe("Volumen de pista (0.0 a 1.0)"),
  muted: z.boolean().optional().describe("Indica si la pista está silenciada"),
  soloed: z.boolean().optional().describe("Indica si la pista está en modo solo"),
});

export type SongSectionTrack = z.infer<typeof songSectionTrackSchema>;

export const songTrackSchema = z.object({
  id: z.string(),
  name: z.string().describe("Nombre de la pista global (ej. Línea de Bajo, Voz Principal)"),
  midiChannel: z.number().min(1).max(16).describe("Canal MIDI para reproducir esta pista (1 a 16)"),
  instrumentPreset: z.string().optional().describe("Preset de instrumento opcional para reproducir esta pista"),
  volume: z.number().min(0.0).max(1.0).default(0.7).describe("Volumen global de la pista (0.0 a 1.0)"),
  prompts: z.record(z.string(), z.string()).optional().describe("Mapeo de sectionId a prompt utilizado"),
  sectionNotes: z.record(z.string(), z.array(songTrackNoteSchema)).describe("Mapeo de sectionId a la lista de notas de la pista"),
  isGenerating: z.boolean().optional(),
  progress: z.number().optional(),
  muted: z.boolean().optional().describe("Indica si la pista está silenciada"),
  soloed: z.boolean().optional().describe("Indica si la pista está en modo solo"),
  isProgressionRhythm: z.boolean().optional().describe("Indica si la pista representa el ritmo de la progresión de acordes"),
  aiSections: z.record(z.string(), z.boolean()).optional().describe("Mapeo de sectionId a boolean indicando si la sección fue generada por IA"),
  isPolyphonicLayer: z.boolean().optional().describe("Indica si esta pista es una capa polifónica generada por el asistente IA"),
  polyphonicRole: z.enum(["bass", "melody", "countermelody", "pad"]).optional().describe("Rol musical de la capa polifónica: bass, melody, countermelody o pad"),
});

export type SongTrack = z.infer<typeof songTrackSchema>;

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
  lyrics: z.string().optional(),
  tracks: z.array(songSectionTrackSchema).optional(),
});

export type SongSection = z.infer<typeof songSectionSchema>;

export const songSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  genre: z.string(),
  key: z.string(),
  tempo: z.number(),
  description: z.string(),
  lyrics: z.string().optional(),
  sections: z.array(songSectionSchema),
  tracks: z.array(songTrackSchema).optional(),
  playbackVolume: z.number().optional().describe("Volumen master de reproducción"),
  loopMode: z.string().optional().describe("Modo de bucle (song, section, off)"),
});

export type SongStructure = z.infer<typeof songSchema>;
