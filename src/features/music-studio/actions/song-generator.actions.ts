"use server";

import { generateText, generateObject } from "ai";
import { z } from "zod";
import { getActiveAiProvider } from "../services/ai-provider.service";
import { 
  songInputSchema, 
  songBlueprintSchema, 
  SongInput, 
  SongBlueprint, 
  SongStructure,
  SongSectionTrack,
  SongTrackNote
} from "../schemas/song-generator.schema";
import prisma from "@/lib/prisma";
import { requireSession } from "@/proxy";
import { revalidatePath } from "next/cache";

export interface GenerateSongBlueprintResult {
  success: boolean;
  data?: SongBlueprint;
  error?: string;
}

/**
 * Step 1: Generate the full song structural blueprint with tailored prompts for each section.
 */
export async function generateSongBlueprintAction(data: SongInput): Promise<GenerateSongBlueprintResult> {
  const validated = songInputSchema.parse(data);

  try {
    const provider = await getActiveAiProvider();

    const systemPrompt = `Eres un arreglista y productor musical de clase mundial galardonado.
Tu tarea es componer la estructura de secciones (el Plano Estructural o "Song Blueprint") para una canción completa basada en la instrucción del usuario.
Debes diseñar una estructura fluida, musical y coherente de entre 3 y 8 secciones (ej: Intro, Verso 1, Coro 1, Verso 2, Coro 2, Puente, Coro 3, Outro).

Para cada sección, debes formular:
1. 'type': El tipo de sección (ej. Intro, Verso 1, Coro 1, Verso 2, Pre-Coro, Puente, Outro).
2. 'prompt': Una instrucción armónica de color específica, detallada y motivadora (MÁXIMO 15 palabras).
3. 'key' y 'scale': La tonalidad y escala sugerida de la sección (ej. tonalidad: "C Minor", escala: "Dórico").
4. 'chordCount': Un número entero de 2 a 8 que indique cuántos acordes componen esta sección según su densidad musical.
5. 'reusedFrom': (Opcional) Si esta sección repite EXACTAMENTE la misma progresión armónica de una sección anterior, indica el 'type' de la sección de origen (ej. "Coro 1").
6. 'variationOf': (Opcional) Si esta sección es una VARIACIÓN armónica de una sección previa, indica el 'type' de origen (ej. "Verso 1"). El 'prompt' debe describir la variación (ej. "modulado un tono arriba" o "añadir tensiones").

REGLAS DE REUTILIZACIÓN Y COHERENCIA MUSICAL:
- Para coros o versos repetidos, usa 'reusedFrom' o 'variationOf' para garantizar consistencia musical y coherencia estructural en la composición.
- Si una sección usa 'reusedFrom', copiará los acordes exactos en el DAW. Si usa 'variationOf', generará acordes basados en la sección de origen.

EJEMPLO DE RESPUESTA EN FORMATO VÁLIDO:
{
  "title": "Amanecer de Cristal",
  "genre": "Neo-Soul Lento",
  "key": "C Minor",
  "tempo": 75,
  "description": "Una pieza íntima que transiciona de la melancolía a la esperanza.",
  "sections": [
    {
      "type": "Intro",
      "prompt": "Textura suspendida y lenta de dos acordes para establecer el tono menor.",
      "key": "C Minor",
      "scale": "Dórico",
      "chordCount": 2
    },
    {
      "type": "Verso 1",
      "prompt": "Base armónica melancólica y estable con acordes menores de séptima.",
      "key": "C Minor",
      "scale": "Menor Natural",
      "chordCount": 4
    },
    {
      "type": "Coro 1",
      "prompt": "Clímax armónico brillante con acordes de novena y tensiones de color.",
      "key": "C Minor",
      "scale": "Dórico",
      "chordCount": 4
    },
    {
      "type": "Verso 2",
      "prompt": "Variación del Verso 1 con tensiones añadidas para más dinamismo.",
      "key": "C Minor",
      "scale": "Menor Natural",
      "chordCount": 4,
      "variationOf": "Verso 1"
    },
    {
      "type": "Coro 2",
      "prompt": "Repetición exacta del Coro 1.",
      "key": "C Minor",
      "scale": "Dórico",
      "chordCount": 4,
      "reusedFrom": "Coro 1"
    },
    {
      "type": "Outro",
      "prompt": "Disipación armónica con acordes abiertos y un acorde de resolución suspendido.",
      "key": "C Minor",
      "scale": "Menor Melódica",
      "chordCount": 2
    }
  ]
}

REGLAS ESTRICTAS DE CONCISIÓN:
- 'description': MÁXIMO 15 palabras.
- 'sections': Debe tener entre 3 y 8 secciones.
- 'prompt' de cada sección: MÁXIMO 15 palabras.`;

    let targetPrompt = `Genera un blueprint de canción dinámico basado en: "${validated.prompt}".\n`;
    if (validated.key && validated.key !== "Automático") {
      targetPrompt += `- Tonalidad general sugerida: ${validated.key}.\n`;
    }
    if (validated.scale && validated.scale !== "Automático") {
      targetPrompt += `- Escala general sugerida: ${validated.scale}.\n`;
    }
    if (validated.tempo && validated.tempo !== "Automático" && validated.tempo.trim() !== "") {
      targetPrompt += `- Tempo (BPM) general sugerido: ${validated.tempo} BPM.\n`;
    }

    // Dynamic structure guidelines
    if (validated.structureMode && validated.structureMode !== "Automático") {
      if (validated.structureMode === "3-sections") {
        targetPrompt += `- ESTRUCTURA OBLIGATORIA: La canción DEBE tener exactamente 3 secciones ordenadas (ej. Intro, Coro, Outro).\n`;
      } else if (validated.structureMode === "4-sections") {
        targetPrompt += `- ESTRUCTURA OBLIGATORIA: La canción DEBE tener exactamente 4 secciones ordenadas (ej. Intro, Verso, Coro, Outro).\n`;
      } else if (validated.structureMode === "6-sections") {
        targetPrompt += `- ESTRUCTURA OBLIGATORIA: La canción DEBE tener exactamente 6 secciones ordenadas (ej. Intro, Verso 1, Coro 1, Verso 2, Coro 2, Outro).\n`;
      } else if (validated.structureMode === "8-sections") {
        targetPrompt += `- ESTRUCTURA OBLIGATORIA: La canción DEBE tener exactamente 8 secciones ordenadas (ej. Intro, Verso 1, Coro 1, Verso 2, Coro 2, Puente, Coro 3, Outro).\n`;
      }
    } else {
      targetPrompt += `- Estructura sugerida: Decide libremente y de manera inteligente la cantidad de secciones (entre 3 y 8) según el género y vibe.\n`;
    }

    // Dynamic chord count guidelines
    if (validated.chordsMode && validated.chordsMode !== "Automático") {
      targetPrompt += `- CANTIDAD DE ACORDES OBLIGATORIA: Cada sección generada DEBE tener exactamente ${validated.chordsMode} acordes (el campo 'chordCount' de todas las secciones debe ser exactamente ${validated.chordsMode}).\n`;
    } else {
      targetPrompt += `- Cantidad de acordes por sección: Decide libremente el 'chordCount' (de 2 a 8) para cada sección según sea musicalmente apropiado.\n`;
    }

    // Dynamic repetition / variation guidelines
    if (validated.repetitionMode && validated.repetitionMode !== "Automático") {
      if (validated.repetitionMode === "none") {
        targetPrompt += `- REPETICIONES: Queda STRICTAMENTE PROHIBIDO reutilizar secciones. NO utilices 'reusedFrom' ni 'variationOf' en ninguna sección; todas deben ser independientes.\n`;
      } else if (validated.repetitionMode === "force-exact") {
        targetPrompt += `- REPETICIONES: Fuerza y maximiza la repetición exacta. Aquellas secciones del mismo tipo que aparezcan más de una vez deben apuntar obligatoriamente a la primera aparición utilizando el campo 'reusedFrom'.\n`;
      }
    } else {
      targetPrompt += `- Repeticiones y Variaciones: Decide libremente si usar 'reusedFrom', 'variationOf' o crear desde cero de forma inteligente para mantener coherencia.\n`;
    }

    console.log("Calling Vercel AI SDK generateText for Song Blueprint (Dynamic with Controls):", targetPrompt);

    try {
      const result = await generateObject({
        model: provider,
        schema: songBlueprintSchema,
        system: systemPrompt,
        prompt: targetPrompt,
        abortSignal: AbortSignal.timeout(60000),
        maxRetries: 0
      });

      return {
        success: true,
        data: result.object,
      };
    } catch (structuredError: any) {
      console.warn("Song Blueprint estructurado nativo falló, ejecutando fallback de texto resiliente:", structuredError);
      
      const fallbackPrompt = `Genera un blueprint de canción dinámico (entre 3 y 8 secciones) basado en: "${targetPrompt}".
IMPORTANTE: Tu respuesta debe ser EXCLUSIVAMENTE un objeto JSON en bruto válido, sin bloques de código markdown ni texto adicional.

ESQUEMA A SEGUIR ESTRICTAMENTE:
{
  "title": "Título de la canción",
  "genre": "Género",
  "key": "Tonalidad",
  "tempo": 80,
  "description": "Concepto (máx 15 palabras)",
  "sections": [
    {
      "type": "Intro",
      "prompt": "Instrucción armónica (máx 15 palabras)",
      "key": "C Minor",
      "scale": "Dórico",
      "chordCount": 2
    },
    {
      "type": "Verso 1",
      "prompt": "Instrucción armónica (máx 15 palabras)",
      "key": "C Minor",
      "scale": "Menor Natural",
      "chordCount": 4
    },
    {
      "type": "Coro 1",
      "prompt": "Instrucción armónica (máx 15 palabras)",
      "key": "C Minor",
      "scale": "Dórico",
      "chordCount": 4
    },
    {
      "type": "Verso 2",
      "prompt": "Variación con tensiones añadidas",
      "key": "C Minor",
      "scale": "Menor Natural",
      "chordCount": 4,
      "variationOf": "Verso 1"
    },
    {
      "type": "Coro 2",
      "prompt": "Repetición del Coro 1",
      "key": "C Minor",
      "scale": "Dórico",
      "chordCount": 4,
      "reusedFrom": "Coro 1"
    },
    {
      "type": "Outro",
      "prompt": "Resolución suave",
      "key": "C Minor",
      "scale": "Dórico",
      "chordCount": 2
    }
  ]
}

Completa entre 3 y 8 secciones lógicas.`;

      const textResult = await generateText({
        model: provider,
        system: systemPrompt,
        prompt: fallbackPrompt,
        abortSignal: AbortSignal.timeout(45000),
        maxRetries: 0
      });

      const cleanJson = textResult.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return {
        success: true,
        data: parsed,
      };
    }
  } catch (error: any) {
    console.error("Error generating song blueprint via AI:", error);
    return {
      success: false,
      error: error.message || "Failed to generate song blueprint via AI.",
    };
  }
}

/**
 * DB ACTION: Save or Update a complete Song in the database.
 */
export async function saveSongAction(songData: SongStructure) {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    // Ensure tempo is stored as a valid integer
    const tempoInt = songData.tempo ? Math.round(songData.tempo) : null;

    if (songData.id) {
      // Security: verify this song belongs to the current user before updating
      const existing = await prisma.song.findFirst({
        where: { id: songData.id, userId },
        select: { id: true },
      });
      if (!existing) {
        return { success: false, error: "Canción no encontrada o sin permisos." };
      }

      // Update using only the unique @id field (Prisma requirement)
      const updated = await prisma.song.update({
        where: { id: songData.id },
        data: {
          title: songData.title,
          genre: songData.genre,
          key: songData.key,
          tempo: tempoInt,
          description: songData.description,
          data: songData as any,
        },
      });
      revalidatePath("/dashboard/song-generator");
      return { success: true as const, song: { ...updated, data: songData as any } };
    } else {
      // Create new song
      const created = await prisma.song.create({
        data: {
          title: songData.title,
          genre: songData.genre,
          key: songData.key,
          tempo: tempoInt,
          description: songData.description,
          userId,
          data: songData as any, // store full structure in Json field
        },
      });

      // Write the DB-assigned id back into the Json data so it is self-contained
      const dataWithId = { ...songData, id: created.id };
      await prisma.song.update({
        where: { id: created.id },
        data: { data: dataWithId as any },
      });

      revalidatePath("/dashboard/song-generator");
      return { success: true as const, song: { ...created, id: created.id, data: dataWithId as any } };
    }
  } catch (error: any) {
    console.error("Error in saveSongAction:", error);
    try {
      const fs = require("fs");
      fs.appendFileSync("c:/Users/Jhon/Documents/Datos/Informacion/2026/Proyectos/musiclab/db_error.log", 
        `[${new Date().toISOString()}] SAVE ERROR: ${error?.stack || error?.message || error}\n`
      );
    } catch (e) {}
    return { success: false as const, error: error.message || "Error al guardar la canción en la base de datos." };
  }
}

/**
 * DB ACTION: Load all saved songs of the currently logged-in user.
 */
export async function loadUserSongsAction() {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const songs = await prisma.song.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" }
    });

    return { 
      success: true, 
      songs: songs.map(s => ({
        id: s.id,
        title: s.title,
        genre: s.genre,
        key: s.key,
        tempo: s.tempo,
        description: s.description,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        data: s.data as any as SongStructure
      }))
    };
  } catch (error: any) {
    console.error("Error in loadUserSongsAction:", error);
    try {
      const fs = require("fs");
      fs.appendFileSync("c:/Users/Jhon/Documents/Datos/Informacion/2026/Proyectos/musiclab/db_error.log", 
        `[${new Date().toISOString()}] LOAD ERROR: ${error?.stack || error?.message || error}\n`
      );
    } catch (e) {}
    return { success: false, error: error.message || "Error al cargar las canciones." };
  }
}

/**
 * DB ACTION: Delete a song (verify ownership via findFirst before delete).
 */
export async function deleteSongAction(songId: string) {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    // Verify ownership before deleting
    const existing = await prisma.song.findFirst({
      where: { id: songId, userId },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: "Canción no encontrada o sin permisos." };
    }

    await prisma.song.delete({
      where: { id: songId }, // Only @id in where for delete
    });

    revalidatePath("/dashboard/song-generator");
    return { success: true as const };
  } catch (error: any) {
    console.error("Error in deleteSongAction:", error);
    return { success: false as const, error: error.message || "Error al eliminar la canción." };
  }
}

/**
 * Action: Generate modular melodic or instrumental track for a song section.
 */
export async function generateSectionTrackAction(params: {
  songTitle: string;
  sectionType: string;
  sectionKey: string;
  sectionScale: string;
  chordsList: Array<{
    chord: string;
    pianoNotes: string[];
    role: string;
    duration?: number;
  }>;
  trackName: string;
  midiChannel: number;
  userPrompt: string;
  previousSectionType?: string;
  previousChordsList?: Array<{
    chord: string;
    pianoNotes: string[];
    role: string;
    duration?: number;
  }>;
  previousSectionNotes?: Array<{
    note: string;
    startBeat: number;
    durationBeats: number;
    velocity: number;
  }>;
  nextSectionType?: string;
  nextChordsList?: Array<{
    chord: string;
    pianoNotes: string[];
    role: string;
    duration?: number;
  }>;
  progressionRhythmNotes?: Array<{
    note: string;
    startBeat: number;
    durationBeats: number;
    velocity: number;
  }>;
  useOrnamentalNotes?: boolean;
  ornamentalTypes?: string[];
  midiReferencePattern?: string;
}): Promise<{ success: boolean; data?: SongSectionTrack; error?: string }> {
  const { 
    songTitle, 
    sectionType, 
    sectionKey, 
    sectionScale, 
    chordsList, 
    trackName, 
    midiChannel, 
    userPrompt,
    previousSectionType,
    previousChordsList,
    previousSectionNotes,
    nextSectionType,
    nextChordsList,
    progressionRhythmNotes,
    useOrnamentalNotes = false,
    ornamentalTypes = [],
    midiReferencePattern
  } = params;

  const totalBeats = chordsList.reduce((acc, c) => acc + (c.duration || 4), 0);

  console.log(`[AI Multitrack] Generating track "${trackName}" for section "${sectionType}" (${songTitle})`);


  try {
    const provider = await getActiveAiProvider();

    const chordsString = chordsList
      .map((c, idx) => `Acorde ${idx + 1}: ${c.chord} (Notas: ${c.pianoNotes.join(", ")}, Función: ${c.role})`)
      .join("\n");

    let currentStart = 0;
    const chordCoverageInstructions = chordsList.map((c, idx) => {
      const start = currentStart;
      const duration = c.duration || 4;
      const end = start + duration;
      currentStart = end;
      return `- Acorde ${idx + 1} (${c.chord}): Genera OBLIGATORIAMENTE entre 2 y 5 notas con 'startBeat' entre los tiempos ${start.toFixed(1)} y ${(end - 0.1).toFixed(1)} (que es el intervalo en el que suena este acorde).`;
    }).join("\n");

    let gridStart = 0;
    const gridTemporal = chordsList.map((c, idx) => {
      const start = gridStart;
      const duration = c.duration || 4;
      const end = start + duration;
      gridStart = end;
      return `- Chord ${idx + 1} (${c.chord}): tiempos ${start.toFixed(1)} a ${end.toFixed(1)}.`;
    }).join("\n    ");

    let ornamentalTheoryBlock = "";
    if (useOrnamentalNotes && ornamentalTypes.length > 0) {
      const scaleNotes: Record<string, string[]> = {
        major: ["1(tónica)", "2(mayor)", "3(mayor)", "4(subdominante)", "5(quinta)", "6(mayor)", "7(sensible)"],
        minor: ["1(tónica)", "2(mayor)", "b3(menor)", "4(subdominante)", "5(quinta)", "b6(menor)", "b7(subtónica)"],
        dorian: ["1", "2", "b3", "4", "5", "6", "b7"],
        mixolydian: ["1", "2", "3", "4", "5", "6", "b7"],
        lydian: ["1", "2", "3", "#4", "5", "6", "7"],
        phrygian: ["1", "b2", "b3", "4", "5", "b6", "b7"],
        locrian: ["1", "b2", "b3", "4", "b5", "b6", "b7"]
      };
      const scaleGrades = scaleNotes[sectionScale] ?? scaleNotes["major"];

      const techniqueDescriptions: Record<string, string> = {
        "passing-tones": `NOTAS DE PASO (Passing Tones): En los tiempos débiles y contratiempos (ej. 0.5, 1.5, 2.5, 3.5), intercala notas escalísticas diatónicas que conecten suavemente las notas del acorde activo. Por ejemplo, entre la tónica (${sectionKey}) y la tercera del acorde, pasa por la segunda de la escala. Estas notas de paso crean movimiento melódico fluido y evitan saltos bruscos.`,
        "neighbor-tones": `NOTAS DE ADORNO (Neighbor Tones / Ornamentos): Añade mordentes superiores e inferiores: un semitono o tono por encima o debajo de una nota del acorde, regresando inmediatamente a la nota principal. Úsalos en los tiempos 0.75, 1.75, 2.75, 3.75 con duraciones cortas (0.25). Estos ornamentos dan expresividad y virtuosismo.`,
        "chromatic-approach": `APROXIMACIONES CROMÁTICAS (Chromatic Approach Notes): Antes de cada tiempo fuerte de cambio de acorde (tiempos 0.0, 4.0, 8.0, 12.0...), incluye una nota a un semitono de distancia de la nota objetivo. Estas notas de aproximación cromáticas crean una fuerte atracción melódica y son fundamentales en jazz, bebop y music latina avanzada.`,
        "9th-11th-13th": `EXTENSIONES ARMÓNICAS (9ª, 11ª y 13ª): Usa libremente tensiones armónicas que van más allá del acorde de 4 sonidos. Para un acorde mayor (ej. C Mayor): la 9na (D), 11na (F), 13na (A). Para acordes menores: 9na (D), 11na (F), b13na (Ab). Para dominantes (V7): 9na (D o Db o D#), #11na (F#), 13na (A o Ab). Estas extensiones pueden usarse tanto en tiempos fuertes como débiles, pero es preferible resolver las alteradas (b9, #9, #11, b13) a notas del acorde en el tiempo siguiente.`,
        "modal-color": `COLOR MODAL (Modal Interchange / Borrowing): Enriquece la paleta armónica usando grados de modos paralelos. En ${sectionKey} ${sectionScale}: (a) Intercambia una nota del modo dórico (6ta mayor en un contexto menor), o (b) usa la #4ta característica del Lidio en contextos mayores, o (c) la b7ta del Mixolidio para dar un sabor blues o rock. Esta técnica crea sorpresa armónica manteniendo la coherencia tonal.`,
        "anticipations": `ANTICIPACIONES (Anticipations): En el compás o tiempo inmediatamente anterior a un cambio de acorde, toca la nota que corresponde al nuevo acorde en lugar del acorde actual. Por ejemplo, si el compás 1 tiene Am y el compás 2 tiene F, a partir del tiempo 3.5 del compás 1 puedes anticipar una nota de F (C o F o A). Esta técnica crea un pull rítmico emocional.`,
        "suspensions": `SUSPENSIONES Y RETARDOS (Suspensions / Retardations): Al inicio de un nuevo acorde en los tiempos fuertes, retén la nota del acorde anterior (el grado 4 o 2 funcionando como suspensión) y luego resuélvela hacia abajo a la tercera o tónica del nuevo acorde. Ej. sus4→3: si el nuevo acorde es Am, empieza en D (sus4) y resuelve a C# (3ra). Esta crea una tensión expresiva y su resolución es muy satisfactoria.`,
        "voice-leading": `CONDUCCIÓN DE VOCES (Voice Leading): Trata cada voz del acorde (soprano, alto, tenor, bajo) de forma independiente. Mueve cada voz lo menos posible entre acordes (movimiento por semitono o tono). Usa notas comunes (common tones) entre acordes adyacentes y mantenlas. Evita quintas y octavas paralelas. Aplica la regla del movimiento contrario: si el bajo sube, las voces superiores deben tender a bajar. Esta es la base del contrapunto y del arreglo profesional.`
      };

      const activeTechniques = ornamentalTypes
        .filter(t => techniqueDescriptions[t])
        .map(t => techniqueDescriptions[t])
        .join("\n\n");

      ornamentalTheoryBlock = `

=== MODO TEORÍA MUSICAL AVANZADA Y NOTAS DE ADORNO (MÁXIMA EXPRESIVIDAD) ===
Esta generación tiene activada la Teoría Musical Avanzada completa. DEBES aplicar las siguientes técnicas para crear una pista de acompañamiento rítmico-melódica de alta calidad profesional.

TONALIDAD ACTIVA: ${sectionKey} ${sectionScale}
GRADOS DE LA ESCALA: ${scaleGrades.join(", ")}

REGLAS UNIVERSALES DE TEORÍA QUE SIEMPRE DEBES APLICAR:
1. JERARQUÍA MÉTRICA: Las notas del acorde deben estar en los tiempos fuertes (0.0, 1.0, 2.0, 3.0). Las notas de adorno, paso y tensión en los débiles (0.25, 0.5, 0.75, 1.5, etc.).
2. DIRECCIÓN MELÓDICA: La melodía debe tener forma de arco: sube gradualmente a un clímax en el centro-final de la sección y luego desciende para resolver.
3. RANGO VOCAL NATURAL: Mantén las notas dentro de un rango de máximo 2 octavas. Para piano comping: mano izquierda C2-C3 (bajo), mano derecha C3-C5 (voicing del acorde y melodía).
4. DENSIDAD RÍTMICA: Varía la densidad. No toques siempre la misma cantidad de notas. Crea respiración con algunos espacios de silencio.
5. RESOLUCIÓN OBLIGATORIA: Cada nota de tensión o adorno DEBE resolverse en la siguiente nota del acorde activo. No dejes tensiones sin resolver al final de cada compás.

TÉCNICAS ESPECÍFICAS HABILITADAS:
${activeTechniques}

⚠️ RECORDATORIO CRÍTICO DE ROLES MUSICALES:
Las reglas de mantener las pianoNotes (chord tones) en los tiempos fuertes APLICAN ÚNICAMENTE a los instrumentos rítmicos y bajos (Ritmo, Pads, Bajos).
Si estás generando una MELODÍA o un SOLO, IGNORA ESTO. Tienes LIBERTAD CREATIVA para tocar cualquier nota de la escala en cualquier tiempo, usar notas de paso, etc. Las melodías NO DEBEN ser simples arpegios.

INSTRUCCIÓN FINAL: La pista resultante debe sonar como la tocara un músico profesional de sesión con pleno dominio de la teoría musical. El resultado debe ser expresivo, rítmicamente interesante y armónicamente rico, integrando las técnicas anteriores de forma natural y musical, no mecánica. Pero siempre respetando la progresión armónica como columna vertebral.`;
    }

    let midiConstraintBlock = "";
    if (midiReferencePattern) {
      midiConstraintBlock = `
=== REGLA DE ORO: EXTRACCIÓN DE GROOVE MIDI (PRIORIDAD ABSOLUTA) ===
El usuario ha subido un archivo MIDI de referencia para dictar la estructura rítmica exacta.
DEBES REEMPLAZAR tu inventiva rítmica por este esqueleto rítmico extraído del MIDI.

PATRÓN RÍTMICO DE REFERENCIA:
${midiReferencePattern}

TU TAREA PRINCIPAL AHORA ES "MAPEAR" LA ARMONÍA AL RITMO MIDI:
1. Copia exactamente los momentos de inicio (startBeat o t) y duraciones (durationBeats) indicados en el patrón de referencia.
2. Tu único trabajo creativo es decidir QUÉ NOTA (pitch) tocar en cada uno de esos momentos.
3. Para decidir las notas, debes seguir estrictamente las "REGLAS DE ARMONIZACIÓN Y DIRECCIÓN MUSICAL" (usar las pianoNotes del acorde activo, aplicar notas de paso si está activo, etc.).
4. Básicamente: (Ritmo del MIDI) + (Armonía de la Progresión) = Tu respuesta.
5. Si el patrón MIDI es más largo que la sección, trúncalo. Si es más corto, haz un bucle (loop) del patrón hasta cubrir los ${totalBeats} tiempos.
`;
    }

    const systemPrompt = `Eres un arreglista e instrumentista de sesión de clase mundial galardonado.${ornamentalTheoryBlock ? " Con dominio absoluto de la teoría musical y el contrapunto." : ""}${midiConstraintBlock}
    Tu tarea es componer una pista instrumental o de voz melódica solista que armonice a la perfección con la progresión de acordes de la sección dada.

    INFORMACIÓN DEL GRID TEMPORAL:
    - La sección dura exactamente ${totalBeats} tiempos/negras.
    - La progresión de acordes tiene las siguientes ubicaciones temporales:
    ${gridTemporal}

    DISTRIBUCIÓN OBLIGATORIA DE NOTAS POR ACORDE (CRÍTICO):
    Debes componer y distribuir notas para la totalidad de la progresión. Específicamente, debes asegurarte de colocar notas en el rango de tiempo de cada acorde. No dejes acordes vacíos sin melodía:
    ${chordCoverageInstructions}

    ⚠️ DIRECTRICES ARMÓNICAS OBLIGATORIAS SEGÚN EL ROL DE LA PISTA:
    El comportamiento armónico DEBE cambiar drásticamente según qué instrumento estés tocando:
    1. Si eres BAJO (Bassline): Toca solo fundamentales y quintas en tiempos fuertes.
    2. Si eres RITMO o ACORDES (Piano, Pads, Guitarra Rítmica): Mantén una adherencia estricta a las notas del acorde (pianoNotes) en un 80%.
    3. Si eres MELODÍA, VOZ, LEAD, SOLO o CUALQUIER INSTRUMENTO SOLISTA:
       >>> ¡CREA MELODÍAS MÁGICAS, INSPIRADORAS Y PROFUNDAMENTE HUMANAS! <<<
       Tus notas NO deben ser un simple arpegio predecible. ESTÁ ESTRICTAMENTE PROHIBIDO limitarte solo a las notas del acorde. DEBES usar la escala completa (${sectionScale} de ${sectionKey}) para tejer una historia musical. Incorpora tensiones que generen emoción (9nas, 11nas, 13ras), notas de paso diatónicas y cromatismos para acercarte a tus notas objetivo. ¡Queremos pura magia musical generada por IA, que emocione a quien la escuche!

    REGLAS DE ARMONIZACIÓN Y DIRECCIÓN MUSICAL:
    1. Las notas generadas DEBEN empezar dentro de los tiempos de la sección (desde 0.0 hasta ${totalBeats}.0).
    2. Debes adaptar la dirección y vibe del prompt del usuario: "${userPrompt}".
    3. COBERTURA COMPLETA Y OBLIGATORIA DE TODOS LOS ACORDES (CRÍTICO): Debes componer notas que abarquen y cubran la SECCIÓN COMPLETA y todos los acordes de la progresión, desde el tiempo 0.0 hasta el tiempo ${totalBeats}.0. La melodía o patrón rítmico NO debe detenerse tras el primer o segundo acorde. Debe continuar desarrollándose de forma fluida y constante a lo largo de todos los compases y acordes de la sección entera (por ejemplo, tocando sobre el tiempo 0..4, el tiempo 4..8, el tiempo 8..12, y el tiempo 12..16). EXCEPCIÓN: La única excepción a esta regla es si el prompt de usuario ("${userPrompt}") indica explícitamente limitar la melodía a una parte específica.
    4. Para pistas de BAJO (Bassline): Enfócate estrictamente en las fundamentales (roots) y quintas (5ths) de cada acorde activo. Coloca la tónica en el tiempo fuerte del acorde (ej. tiempo 0.0, 4.0, 8.0, 12.0) y la quinta o paso de aproximación cromática/diatónica en los contratiempos (ej. 2.0, 3.0, 3.5) para conducir al siguiente acorde de forma fluida (aplicando walking bass o patrones rítmicos estables).
    5. Para pistas de VOZ / SOLISTAS / LÍDERES (Melody): 
       >>> ¡PROHIBICIÓN ABSOLUTA DE LIMITARSE A LAS NOTAS DEL ACORDE! <<<
       Se requiere que compongas melodías MÁGICAS, LÍRICAS e INSPIRADORAS. Ignora cualquier regla que te limite a la fundamental o tercera del acorde. Usa las notas de la escala (${sectionScale} de ${sectionKey}) libremente como un lienzo en blanco en TODOS los tiempos.
       - FORMA MELÓDICA: Crea contornos expresivos. Usa saltos emocionales (ej. 6tas, 8vas) combinados con grados conjuntos. Usa la 2da, 4ta, 6ta y 7ma mayor/menor constantemente para inyectar tensión melódica dulce y nostalgia.
       - SÍNCOPAS Y SILENCIOS: Una melodía mágica respira. No empieces siempre en el 0.0. Juega con contratiempos (0.5, 1.25) y pausas dramáticas.
       - CROMATISMOS: Usa tensiones (9nas, 11nas, 13ras) en tiempos fuertes para crear "magia armónica", y usa notas de paso fuera de la escala para resolución.
       Si devuelves un arpegio robótico o te limitas a las notas del acorde, fallarás tu propósito. ¡Queremos pura inspiración!

    6. REGLAS GENERALES PARA PISTAS MELÓDICAS O ARMÓNICAS:
       - VELOCITY Y DINÁMICA: Ajusta la velocidad entre 0.4 y 0.9. Acentos en los tiempos fuertes, más suave en notas de paso.
       - SUSTAIN (CC 64): Si deseas que una nota o un bloque de acordes resuene mágicamente con el pedal de sustain presionado, incluye \`sustain: true\` en esa nota.

    7. Para pistas de BATERÍA / PERCUSIÓN (Canal MIDI 10 / Pistas de percusión):
       - FIGURAS Y ESTILO: Adapta el patrón rítmico según el género y ritmo solicitado ("${userPrompt}"). Respeta las figuras rítmicas del estilo:
         * Rock/Pop: Bombo en tiempos fuertes ("C2" en 0.0, 2.0...), Caja en contratiempos ("D2" en 1.0, 3.0...), Charleston Cerrado ("F#2") constante.
         * Funk/R&B: Síncopas rítmicas de bombo doble, cajas fantasmas y charles abierto ("A#2") en contratiempos débiles.
         * Jazz/Swing: Ritmo de Ride ("D#3") oscilado/swingeado en tresillos y golpes de caja sutiles.
         * Latin/Bossa: Patrón de aro ("C#2" o "D2") simulando la clave y bombo sincopado.
       - INTROS: Si la sección actual es un "Intro" (tipo de sección: "${sectionType}"), inicia con un patrón rítmico simplificado o introduce un redoble de entrada (pickup drum fill) de 1 o 2 tiempos de duración.
       - REDOBLES / TRANSICIONES (Fills): En el último compás de la sección (especialmente entre los tiempos ${totalBeats - 2.5} y ${totalBeats}.0), rompe el patrón rítmico principal y genera un redoble (drum fill) rápido usando Caja ("D2"), Toms ("G2", "A2", "B2", "C3") y un Platillo Crash ("C#3") justo al final para acentuar el paso a la siguiente sección.
       - FINALES / OUTROS: Si la sección actual es un "Outro" o la parte final de la canción (sectionType: "${sectionType}" contiene "outro" o "final"), OBLIGATORIAMENTE el patrón debe terminar al llegar al ÚLTIMO acorde de la progresión. Genera un último golpe simultáneo de Platillo Crash ("C#3") y Bombo ("C2") en el primer tiempo de ese acorde final, y a partir de ahí EL RESTO DEBE SER SILENCIO ABSOLUTO. No agregues más notas rítmicas después de ese golpe final.
       - Notas GM Drum Map correspondientes:
         * "C2" (Pitch 36) para Bombo / Kick Drum.
         * "D2" (Pitch 38) para Caja / Snare Drum.
         * "F#2" (Pitch 42) para Charleston Cerrado / Closed Hi-Hat.
         * "A#2" (Pitch 46) para Charleston Abierto / Open Hi-Hat.
         * "C#3" (Pitch 49) para Platillo Crash / Crash Cymbal.
         * "G2" / "A2" / "B2" / "C3" (Pitches 43, 45, 47, 48) para Toms (Tom Grave, Medio y Agudo) para redobles.
    7. Para la pista "Ritmo de Progresión" o pistas de teclado rítmico armónico (Comping):
       - BASE ARMÓNICA ESTRICTA: La base de TODAS las notas que generes DEBE ser las pianoNotes exactas del acorde activo. Son tu vocabulario armónico primario e irrenunciable.
       - ESTRUCTURA POR ACORDE: Para cada acorde (durante sus tiempos designados), debes usar las pianoNotes exactas proporcionadas para ese acorde. Por ejemplo, si el Acorde 1 tiene pianoNotes ["C3", "E3", "G3", "C4"], esas son las notas con las que construyes el acompañamiento rítmico durante la duración de ese acorde.
       - MANO IZQUIERDA (BAJO): Toca la primera pianoNote (nota más grave del acorde, típicamente la fundamental) una octava abajo (C2-C3) en el tiempo fuerte de cada compás para dar profundidad.
       - MANO DERECHA (VOICING): Usa las demás pianoNotes del acorde para crear el patrón rítmico (arpegios, síncopas, acordes en bloque a contratiempo, etc.) en el rango C3-C5.
       - NOTAS DE ADORNO (SOLO SI ESTÁN HABILITADAS): Si la Teoría Musical Avanzada está activada, puedes incluir notas de paso, cromáticas o extensiones SOLO en tiempos débiles (fracciones como 0.25, 0.75, 1.5, etc.), pero siempre resolviendo a una pianoNote del acorde activo en el siguiente tiempo fuerte. Las notas de adorno NO deben superar el 30% del total de notas del compás.
       - Adapta el patrón rítmico al estilo del prompt del usuario (arpegios fluidos, síncopas, acordes en bloque, etc.).
    8. Cada nota debe especificarse en formato de pitch con octava estándar (ej: C4, Eb4, G3, A#4, D5). En batería usa C2, D2, F#2, A#2, G2, A2, B2, C3 y C#3 para los elementos clave del kit.
    9. Ajusta las velocidades (velocity) de 0.0 a 1.0 para dar un toque humano y expresivo.
    10. DINÁMICAS Y VELOCIDAD (VELOCITY) BAJO DEMANDA: Si el usuario solicita dinámicas específicas en su prompt (por ejemplo: crescendo, decrescendo, pianissimo/suave (0.2-0.4), mezzoforte (0.5-0.7), fortissimo/fuerte (0.8-1.0), acentos o notas fantasma), DEBES programar minuciosamente la propiedad 'velocity' de cada nota a lo largo de la sección para simular esta expresividad física y volumen real. Si no se pide nada de esto en el prompt, usa variaciones sutiles (ej. acentuar sutilmente los tiempos fuertes con velocity 0.8-0.9 y rebajar tiempos débiles o contratiempos a 0.6-0.7).
    11. RESOLUCIÓN FINAL EN OUTROS (CRÍTICO ABSOLUTO): Si la sección actual es de tipo "Outro" o final (sectionType: "${sectionType}" contiene "outro" o "final"), TODAS las pistas (Bajo, Melodía, Ritmo) DEBEN DETENERSE al llegar al ÚLTIMO acorde de la progresión. En ese acorde final, toca una única nota larga o acorde en bloque sostenido (durationBeats: 8.0) y NINGUNA OTRA NOTA DESPUÉS. Debe haber silencio total tras este acorde para lograr un final genuino y resolutivo de canción.

    EJEMPLO DE ESTRUCTURA JSON DE RESPUESTA (Para una sección de 4 acordes / 16 tiempos de duración total):
    {
      "notes": [
        { "note": "C4", "startBeat": 0.0, "durationBeats": 1.0, "velocity": 0.9 },
        { "note": "E4", "startBeat": 1.0, "durationBeats": 1.0, "velocity": 0.8 },
        { "note": "G4", "startBeat": 2.0, "durationBeats": 1.5, "velocity": 0.85 },
        
        { "note": "F4", "startBeat": 4.0, "durationBeats": 1.0, "velocity": 0.9 },
        { "note": "A4", "startBeat": 5.0, "durationBeats": 1.0, "velocity": 0.8 },
        { "note": "C5", "startBeat": 6.0, "durationBeats": 2.0, "velocity": 0.85 },
        
        { "note": "G4", "startBeat": 8.0, "durationBeats": 0.75, "velocity": 0.9 },
        { "note": "B4", "startBeat": 9.0, "durationBeats": 1.0, "velocity": 0.8 },
        { "note": "D5", "startBeat": 10.5, "durationBeats": 1.5, "velocity": 0.85 },
        
        { "note": "C5", "startBeat": 12.0, "durationBeats": 2.0, "velocity": 0.9 },
        { "note": "G4", "startBeat": 14.0, "durationBeats": 1.0, "velocity": 0.8 },
        { "note": "C4", "startBeat": 15.0, "durationBeats": 1.0, "velocity": 0.7 }
      ]
    }`;

    let transitionInstructions = "";
    if (previousSectionType) {
      const prevChordsStr = previousChordsList && previousChordsList.length > 0
        ? previousChordsList.map(c => c.chord).join(" -> ")
        : "Progresión base";
      const prevNotesSummary = previousSectionNotes && previousSectionNotes.length > 0
        ? previousSectionNotes.slice(-4).map(n => `${n.note} (tiempo ${n.startBeat}, dur ${n.durationBeats})`).join(", ")
        : "Melodía de la sección previa";
      transitionInstructions += `\n\n--- CONEXIÓN CON SECCIÓN PREVIA (${previousSectionType}) ---
- Estructura Armónica Previa: ${prevChordsStr}
- Últimas notas del solo anterior: [${prevNotesSummary}]
- INSTRUCCIÓN DE COHERENCIA: Inicia la melodía de esta sección actual de forma suave y conectada con el solo/arreglo anterior. Evita saltos bruscos de octava (ej: si la sección previa terminó en C4, no comiences repentinamente en C6). Continúa la idea motívica, actuando como una frase responsiva o extensión de la sección anterior.`;
    }

    if (nextSectionType) {
      const nextChordsStr = nextChordsList && nextChordsList.length > 0
        ? nextChordsList.map(c => c.chord).join(" -> ")
        : "Progresión base";
      transitionInstructions += `\n\n--- CONEXIÓN CON SECCIÓN SIGUIENTE (${nextSectionType}) ---
- Estructura Armónica Siguiente: ${nextChordsStr}
- INSTRUCCIÓN DE COHERENCIA: Hacia los últimos compases de esta sección actual (tiempos ${totalBeats - 4}.0 a ${totalBeats}.0), conduce melódicamente las notas para crear una tensión, anticipación o resolución suave que sirva de puente natural para entrar a la sección siguiente (${nextSectionType}).`;
    }

    let rhythmicContextInstructions = "";
    if (progressionRhythmNotes && progressionRhythmNotes.length > 0) {
      const formattedProgNotes = progressionRhythmNotes
        .slice(0, 20) // limit to avoid massive context size
        .map(n => `Nota: ${n.note}, start: ${n.startBeat}, duration: ${n.durationBeats}`)
        .join("\n");

      rhythmicContextInstructions = `\n\n--- CONTEXTO RÍTMICO DE LA PISTA DE ACOMPAÑAMIENTO (PROGRESIÓN) ---
Aquí tienes las notas actuales y duraciones que están sonando en la pista de progresiones (acompañamiento) en esta misma sección:
${formattedProgNotes}

INSTRUCCIÓN DE COORDINACIÓN DE RITMO:
Usa esta información para que la pista "${trackName}" juegue de forma complementaria. 
- Puedes crear un contrapunto o jugar en contratiempo con el ritmo del acompañamiento.
- Evita colisionar con las mismas rítmicas de forma tosca. Si el acompañamiento es denso, toca frases más ligeras. Si el acompañamiento tiene notas largas, puedes rellenar los espacios rítmicamente con pasajes más activos.
- Coordina el groove para que el ensamble suene cohesionado y profesional.`;
    }

    const targetPrompt = `Genera un arreglo melódico instrumental para la pista "${trackName}" (Canal MIDI ${midiChannel}) sobre el Verso/Sección "${sectionType}" de la canción "${songTitle}".
Tonalidad de Sección: ${sectionKey} (${sectionScale})
Progresión Armónica:\n${chordsString}

DISTRIBUCIÓN DE NOTAS PARA ESTA GENERACIÓN (OBLIGATORIO):
Debes generar notas a lo largo de toda la sección. Genera notas específicas para cada uno de los siguientes intervalos de acordes:
${chordCoverageInstructions}

Directrices del Arreglo:\n- Prompt del Usuario: "${userPrompt}"\n- Papel del Instrumento: ${trackName}${transitionInstructions}${rhythmicContextInstructions}${ornamentalTheoryBlock}`;

    const generatedTrackSchema = z.object({
      notes: z.array(z.object({
        note: z.string().describe("Paso de nota con octava, ej: C4, Eb4, G3, Bb4"),
        startBeat: z.number().describe(`Tiempo de inicio en negras relativo a la sección (desde 0.0 hasta ${totalBeats}.0). Debes distribuir las notas a lo largo de todo este rango para cubrir la sección completa. A menos que el prompt del usuario indique explícitamente limitar la melodía en su prompt (ej: "toca solo al inicio"), la música debe durar y distribuirse por toda la progresión entera de principio a fin.`),
        durationBeats: z.number().describe("Duración en negras (ej: 0.25, 0.5, 1.0, 2.0)"),
        velocity: z.number().describe("Velocidad de pulsación (0.0 a 1.0)"),
        sustain: z.boolean().optional().describe("Si es true, se aplicará el efecto pedal sustain MIDI (CC 64) en esta nota, ideal para notas mágicas que deban resonar"),
      }))
    });

    const result = await generateObject({
      model: provider,
      schema: generatedTrackSchema,
      system: systemPrompt,
      prompt: targetPrompt,
    });

    if (result.object && Array.isArray(result.object.notes)) {
      const generatedNotes = result.object.notes.map((n: any) => ({
        note: String(n.note),
        startBeat: Number(n.startBeat),
        durationBeats: Number(n.durationBeats),
        velocity: Math.min(1.0, Math.max(0.0, Number(n.velocity))),
        sustain: Boolean(n.sustain)
      }));

      const isBass = trackName.toLowerCase().includes("bajo") || trackName.toLowerCase().includes("bass");

      return {
        success: true,
        data: {
          id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: trackName,
          midiChannel: midiChannel,
          instrumentPreset: isBass ? "8bit-synth" : "grand-piano",
          notes: generatedNotes,
          prompt: userPrompt,
          volume: 0.7
        }
      };
    }

    throw new Error("Formato de respuesta de IA inválido");
  } catch (error: any) {
    console.error("Error generating section track via AI:", error);
    // Extract actual error string to avoid Next.js serialization errors
    let errorMessage = "Failed to generate section track via AI.";
    if (error?.message) {
      errorMessage = String(error.message);
    } else if (typeof error === 'object' && error !== null) {
      try {
        errorMessage = JSON.stringify(error);
      } catch (e) {
        errorMessage = "Unknown AI generation error (unserializable)";
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Action: Refine an existing song structure using AI or a rule-based offline fallback.
 */
export async function refineSongWithAiAction(
  currentSong: SongStructure,
  userInstruction: string,
  chatHistory: Array<{ role: "user" | "assistant"; text: string }> = []
): Promise<{
  success: boolean;
  explanation?: string;
  data?: SongStructure;
  error?: string;
}> {


  try {
    const provider = await getActiveAiProvider();
    
    const systemPrompt = `Eres un productor musical de clase mundial y co-compositor interactivo.
 Tu tarea es modificar la canción existente según la instrucción del usuario.
 
 REGLAS DE REFINAMIENTO CRÍTICAS:
 1. NO TIENES QUE DEVOLVER LA CANCIÓN COMPLETA. Solo devuelve las modificaciones exactas que se te piden usando el esquema JSON proporcionado.
 2. MODIFICACIONES GLOBALES: Si el usuario pide cambiar el tempo, título, género o tonalidad general, usa el objeto 'modifications'.
 3. MODIFICACIONES DE SECCIONES (ACORDES): Si el usuario pide cambiar los acordes de una sección, usa 'sectionsToUpdate'. Asegúrate de incluir el 'sectionId' exacto y los nuevos 'chords'.
 4. MODIFICACIÓN DE PISTAS (ESTADOS Y NOTAS):
    - Si el usuario te pide cambiar volumen, mute, solo, nombre o preset, usa 'tracksToUpdate' con el 'trackId' exacto.
    - Si el usuario te pide modificar o re-generar las notas musicales o ritmo, NO escribas notas. Pon 'isGenerating': true en 'tracksToUpdate' para esa pista, y proporciona las instrucciones en 'prompts' (mapeo de sectionId -> instrucción).
    - DINÁMICAS Y VELOCIDADES: Pon estas instrucciones directamente en el campo 'prompts' de la pista.`;

    const historyPrompt = chatHistory.length > 0 
      ? `Historial de la conversación:\n${chatHistory.map(m => `${m.role === "user" ? "Usuario" : "IA"}: ${m.text}`).join("\n")}\n\n`
      : "";

    const userPrompt = `${historyPrompt}Canción actual (JSON):\n${JSON.stringify({
      title: currentSong.title, tempo: currentSong.tempo, genre: currentSong.genre,
      sections: currentSong.sections.map(s => ({ id: s.id, type: s.type, chords: s.chords })),
      tracks: currentSong.tracks?.map(t => ({ id: t.id, name: t.name, midiChannel: t.midiChannel, isProgressionRhythm: t.isProgressionRhythm }))
    }, null, 2)}\n\nInstrucción de refinamiento del usuario: "${userInstruction}"`;

    const { chordProgressionSchema } = await import("../schemas/chord-generator.schema");
    const responseSchema = z.object({
      explanation: z.string().describe("Breve descripción en español de los cambios realizados."),
      modifications: z.object({
        title: z.string().optional(),
        genre: z.string().optional(),
        tempo: z.number().optional(),
        key: z.string().optional(),
      }).optional(),
      sectionsToUpdate: z.array(z.object({
        sectionId: z.string(),
        chords: chordProgressionSchema.optional()
      })).optional(),
      tracksToUpdate: z.array(z.object({
        trackId: z.string(),
        volume: z.number().optional(),
        muted: z.boolean().optional(),
        soloed: z.boolean().optional(),
        instrumentPreset: z.string().optional(),
        name: z.string().optional(),
        isGenerating: z.boolean().optional(),
        prompts: z.record(z.string(), z.string()).optional()
      })).optional()
    });

    const result = await generateObject({
      model: provider,
      schema: responseSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    if (result.object) {
      const patchedSong = JSON.parse(JSON.stringify(currentSong)) as SongStructure;
      
      if (result.object.modifications) {
        if (result.object.modifications.title) patchedSong.title = result.object.modifications.title;
        if (result.object.modifications.genre) patchedSong.genre = result.object.modifications.genre;
        if (result.object.modifications.tempo) patchedSong.tempo = result.object.modifications.tempo;
        if (result.object.modifications.key) patchedSong.key = result.object.modifications.key;
      }

      if (result.object.sectionsToUpdate) {
        result.object.sectionsToUpdate.forEach((secUpdate: any) => {
          const sec = patchedSong.sections.find(s => s.id === secUpdate.sectionId);
          if (sec && secUpdate.chords) sec.chords = secUpdate.chords;
        });
      }

      if (result.object.tracksToUpdate && patchedSong.tracks) {
        result.object.tracksToUpdate.forEach((trkUpdate: any) => {
          const trk = patchedSong.tracks!.find(t => t.id === trkUpdate.trackId);
          if (trk) {
            if (trkUpdate.volume !== undefined) trk.volume = trkUpdate.volume;
            if (trkUpdate.muted !== undefined) trk.muted = trkUpdate.muted;
            if (trkUpdate.soloed !== undefined) trk.soloed = trkUpdate.soloed;
            if (trkUpdate.instrumentPreset !== undefined) trk.instrumentPreset = trkUpdate.instrumentPreset;
            if (trkUpdate.name !== undefined) trk.name = trkUpdate.name;
            if (trkUpdate.isGenerating !== undefined) trk.isGenerating = trkUpdate.isGenerating;
            if (trkUpdate.prompts) trk.prompts = { ...trk.prompts, ...trkUpdate.prompts };
          }
        });
      }

      return {
        success: true,
        explanation: result.object.explanation,
        data: patchedSong,
      };
    }

    throw new Error("Formato de refinamiento inválido");
  } catch (error: any) {
    console.error("Error refining song via AI:", error);
    return {
      success: false,
      error: error.message || "Failed to refine song via AI.",
    };
  }
}
