"use server";

import { generateText, Output } from "ai";
import { getActiveAiProvider } from "../services/ai-provider.service";
import { 
  songInputSchema, 
  songBlueprintSchema, 
  SongInput, 
  SongBlueprint, 
  SongStructure 
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
      const result = await generateText({
        model: provider,
        system: systemPrompt,
        prompt: targetPrompt,
        output: Output.object({
          schema: songBlueprintSchema,
        }),
      });

      return {
        success: true,
        data: result.output,
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
      });

      const cleanJson = textResult.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return {
        success: true,
        data: parsed,
      };
    }
  } catch (error: any) {
    console.warn("Error generating song blueprint via AI. Activating premium offline fallback...", error);
    
    const lowerPrompt = validated.prompt.toLowerCase();
    let title = validated.prompt.trim().substring(0, 25) || "Nueva Composición (Offline)";
    let genre = "Pop Moderno";
    let key = validated.key && validated.key !== "Automático" ? validated.key : "C Minor";
    let tempo = validated.tempo && validated.tempo !== "Automático" ? parseInt(validated.tempo, 10) || 80 : 80;
    let description = "Diseño estructural dinámico de contingencia compuesto offline debido a API Key inalcanzable.";
    let sections: any[] = [];

    if (lowerPrompt.includes("urbano") || lowerPrompt.includes("reggaeton") || lowerPrompt.includes("dembow")) {
      title = title || "Ritmo y Fuego";
      genre = "Urbano Latino";
      sections = [
        {
          type: "Intro",
          prompt: "Entrada etérea con filtro de paso bajo y tensión armónica suave.",
          key: key,
          scale: "Menor Natural",
          chordCount: 2
        },
        {
          type: "Coro 1",
          prompt: "Clímax bailable con dembow completo y tensiones armónicas brillantes.",
          key: key,
          scale: "Dórico",
          chordCount: 4
        },
        {
          type: "Verso 1",
          prompt: "Línea de bajo sólida y espacio amplio para la voz rítmica.",
          key: key,
          scale: "Menor Natural",
          chordCount: 4
        },
        {
          type: "Coro 2",
          prompt: "Repetición del coro principal para fijar el gancho armónico.",
          key: key,
          scale: "Dórico",
          chordCount: 4,
          reusedFrom: "Coro 1"
        },
        {
          type: "Verso 2",
          prompt: "Variación con ligera variación de bajo y arreglos.",
          key: key,
          scale: "Menor Natural",
          chordCount: 4,
          variationOf: "Verso 1"
        },
        {
          type: "Coro 3",
          prompt: "Repetición final del coro principal.",
          key: key,
          scale: "Dórico",
          chordCount: 4,
          reusedFrom: "Coro 1"
        },
        {
          type: "Outro",
          prompt: "Desvanecimiento del ritmo y acordes sostenidos de despedida.",
          key: key,
          scale: "Menor Natural",
          chordCount: 2
        }
      ];
    } else if (lowerPrompt.includes("triste") || lowerPrompt.includes("melancolic") || lowerPrompt.includes("menor") || key.toLowerCase().includes("minor")) {
      title = title || "Susurros del Pasado";
      genre = "Neo-Soul / Lo-Fi";
      sections = [
        {
          type: "Intro",
          prompt: "Textura inicial suspendida de 2 acordes para establecer la tónica menor.",
          key: key,
          scale: "Dórico",
          chordCount: 2
        },
        {
          type: "Verso 1",
          prompt: "Armonía menor estable y suave con acordes menores de séptima y novena.",
          key: key,
          scale: "Menor Natural",
          chordCount: 4
        },
        {
          type: "Coro 1",
          prompt: "Clímax emotivo brillante con acordes mayores de novena y tensiones de color.",
          key: key,
          scale: "Dórico",
          chordCount: 4
        },
        {
          type: "Verso 2",
          prompt: "Variación de Verso 1 con tensiones añadidas para más dinamismo.",
          key: key,
          scale: "Menor Natural",
          chordCount: 4,
          variationOf: "Verso 1"
        },
        {
          type: "Coro 2",
          prompt: "Repetición exacta del coro principal.",
          key: key,
          scale: "Dórico",
          chordCount: 4,
          reusedFrom: "Coro 1"
        },
        {
          type: "Puente",
          prompt: "Tensión dramática máxima antes de la resolución final.",
          key: key,
          scale: "Lidia",
          chordCount: 4
        },
        {
          type: "Outro",
          prompt: "Disipación armónica con acordes abiertos y un acorde de resolución suspendido.",
          key: key,
          scale: "Menor Melódica",
          chordCount: 2
        }
      ];
    } else {
      title = title || "Sueño Dorado";
      genre = "Pop Moderno";
      sections = [
        {
          type: "Intro",
          prompt: "Entrada brillante de 2 acordes mayores extendidos para invitar al oyente.",
          key: key,
          scale: "Mayor / Jónica",
          chordCount: 2
        },
        {
          type: "Verso 1",
          prompt: "Progresión pop arpegiada estable y dulce que apoya la melodía inicial.",
          key: key,
          scale: "Mayor / Jónica",
          chordCount: 4
        },
        {
          type: "Coro 1",
          prompt: "Poderosa modulación armónica ascendente con máxima energía y acordes llenos.",
          key: key,
          scale: "Lidia",
          chordCount: 4
        },
        {
          type: "Verso 2",
          prompt: "Repetición del Verso 1.",
          key: key,
          scale: "Mayor / Jónica",
          chordCount: 4,
          reusedFrom: "Verso 1"
        },
        {
          type: "Coro 2",
          prompt: "Repetición del Coro 1.",
          key: key,
          scale: "Lidia",
          chordCount: 4,
          reusedFrom: "Coro 1"
        },
        {
          type: "Puente",
          prompt: "Sección contrastante y lírica.",
          key: key,
          scale: "Mixolidia",
          chordCount: 4
        },
        {
          type: "Coro 3",
          prompt: "Clímax de coro final.",
          key: key,
          scale: "Lidia",
          chordCount: 4,
          reusedFrom: "Coro 1"
        },
        {
          type: "Outro",
          prompt: "Resolución placentera de regreso a la tónica con un suave decrescendo.",
          key: key,
          scale: "Mayor / Jónica",
          chordCount: 2
        }
      ];
    }

    // Overwrite fields in the offline fallback sections based on user controls
    let adjustedSections = sections;
    
    // 1. Overwrite structureMode offline
    if (validated.structureMode && validated.structureMode !== "Automático") {
      if (validated.structureMode === "3-sections") {
        const intro = sections.find(s => s.type.toLowerCase().includes("intro")) || sections[0];
        const coro = sections.find(s => s.type.toLowerCase().includes("coro")) || sections[1] || sections[0];
        const outro = sections.find(s => s.type.toLowerCase().includes("outro")) || sections[sections.length - 1];
        adjustedSections = [
          { ...intro, type: "Intro" },
          { ...coro, type: "Coro" },
          { ...outro, type: "Outro" }
        ];
      } else if (validated.structureMode === "4-sections") {
        const intro = sections.find(s => s.type.toLowerCase().includes("intro")) || sections[0];
        const verso = sections.find(s => s.type.toLowerCase().includes("verso")) || sections[1] || sections[0];
        const coro = sections.find(s => s.type.toLowerCase().includes("coro")) || sections[2] || sections[0];
        const outro = sections.find(s => s.type.toLowerCase().includes("outro")) || sections[sections.length - 1];
        adjustedSections = [
          { ...intro, type: "Intro" },
          { ...verso, type: "Verso" },
          { ...coro, type: "Coro" },
          { ...outro, type: "Outro" }
        ];
      } else if (validated.structureMode === "6-sections") {
        adjustedSections = sections.slice(0, 6);
        while (adjustedSections.length < 6) {
          adjustedSections.push({
            type: `Sección ${adjustedSections.length + 1}`,
            prompt: "Variación musical complementaria.",
            key: key,
            scale: "Mayor / Jónica",
            chordCount: 4
          });
        }
      } else if (validated.structureMode === "8-sections") {
        adjustedSections = sections.slice(0, 8);
        while (adjustedSections.length < 8) {
          adjustedSections.push({
            type: `Sección ${adjustedSections.length + 1}`,
            prompt: "Sección final de resolución.",
            key: key,
            scale: "Mayor / Jónica",
            chordCount: 4
          });
        }
      }
    }

    // 2. Overwrite chordsMode offline
    if (validated.chordsMode && validated.chordsMode !== "Automático") {
      const parsedCount = parseInt(validated.chordsMode, 10) || 4;
      adjustedSections = adjustedSections.map(s => ({
        ...s,
        chordCount: parsedCount
      }));
    }

    // 3. Overwrite repetitionMode offline
    if (validated.repetitionMode && validated.repetitionMode !== "Automático") {
      if (validated.repetitionMode === "none") {
        adjustedSections = adjustedSections.map(s => {
          const { reusedFrom, variationOf, ...rest } = s as any;
          return rest;
        });
      } else if (validated.repetitionMode === "force-exact") {
        const seenTypes = new Set<string>();
        adjustedSections = adjustedSections.map(s => {
          const baseType = s.type.replace(/\s+\d+$/, "");
          if (seenTypes.has(baseType)) {
            const first = adjustedSections.find(x => x.type.replace(/\s+\d+$/, "") === baseType);
            return {
              ...s,
              reusedFrom: first ? first.type : undefined,
              variationOf: undefined
            };
          }
          seenTypes.add(baseType);
          return s;
        });
      }
    }

    return {
      success: true,
      data: {
        title,
        genre,
        key,
        tempo,
        description,
        sections
      }
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
