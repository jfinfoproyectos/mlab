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
Debes diseñar EXACTAMENTE 4 secciones ordenadas de forma fluida y coherente (ej: Intro, Verso, Coro, Outro).

Para cada sección, debes formular:
1. 'type': El tipo de sección.
2. 'prompt': Una instrucción armónica de color específica, detallada y motivadora para que otro LLM genere la progresión de acordes perfecta (ej. "Verso melancólico que fluye con acordes de séptima suspendida, tempo lento" o "Coro majestuoso con tensiones de novena y modulación ascendente").
3. 'key' y 'scale': La tonalidad y escala sugerida de la sección (ej. tonalidad: "D", escala: "Dórico" o "Mayor").

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
      "prompt": "Textura inicial etérea y suspendida para establecer el tono menor.",
      "key": "C Minor",
      "scale": "Dórico"
    },
    {
      "type": "Verso",
      "prompt": "Base armónica melancólica y estable con acordes menores de séptima.",
      "key": "C Minor",
      "scale": "Menor Natural"
    },
    {
      "type": "Coro",
      "prompt": "Clímax armónico brillante con acordes de novena y tensiones de color.",
      "key": "C Minor",
      "scale": "Dórico"
    },
    {
      "type": "Outro",
      "prompt": "Disipación armónica con acordes abiertos y un acorde de resolución suspendido.",
      "key": "C Minor",
      "scale": "Menor Melódica"
    }
  ]
}

REGLAS ESTRICTAS DE CONCISIÓN:
- 'description': MÁXIMO 15 palabras.
- 'sections': Debe tener EXACTAMENTE 4 secciones.
- 'prompt' de cada sección: MÁXIMO 15 palabras.`;

    let targetPrompt = `Genera un blueprint de canción de 4 secciones basado en: "${validated.prompt}".\n`;
    if (validated.key && validated.key !== "Automático") {
      targetPrompt += `- Tonalidad general sugerida: ${validated.key}.\n`;
    }
    if (validated.scale && validated.scale !== "Automático") {
      targetPrompt += `- Escala general sugerida: ${validated.scale}.\n`;
    }
    if (validated.tempo && validated.tempo !== "Automático" && validated.tempo.trim() !== "") {
      targetPrompt += `- Tempo (BPM) general sugerido: ${validated.tempo} BPM.\n`;
    }

    console.log("Calling Vercel AI SDK generateText for Song Blueprint:", targetPrompt);

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
      
      const fallbackPrompt = `Genera un blueprint de canción de 4 secciones basado en: "${targetPrompt}".
IMPORTANTE: Tu respuesta debe ser EXCLUSIVAMENTE un objeto JSON en bruto válido, sin bloques de código markdown ni texto adicional.

ESQUEMA A SEGUIR ESTRICTAMENTE:
{
  "title": "Título de la canción",
  "genre": "Género",
  "key": "Tonalidad (ej: C Minor)",
  "tempo": 80,
  "description": "Concepto (máx 15 palabras)",
  "sections": [
    {
      "type": "Intro",
      "prompt": "Instrucción armónica (máx 15 palabras)",
      "key": "C Minor",
      "scale": "Dórico"
    }
  ]
}

Completa exactamente 4 secciones.`;

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
    let description = "Diseño estructural de contingencia compuesto offline debido a API Key inalcanzable.";
    let sections = [];

    if (lowerPrompt.includes("urbano") || lowerPrompt.includes("reggaeton") || lowerPrompt.includes("dembow")) {
      title = title || "Ritmo y Fuego";
      genre = "Urbano Latino";
      sections = [
        {
          type: "Intro",
          prompt: "Entrada etérea con filtro de paso bajo y tensión armónica suave.",
          key: key,
          scale: "Menor Natural"
        },
        {
          type: "Verso",
          prompt: "Línea de bajo sólida y espacio amplio para la voz rítmica.",
          key: key,
          scale: "Menor Natural"
        },
        {
          type: "Coro",
          prompt: "Clímax bailable con dembow completo y tensiones armónicas brillantes.",
          key: key,
          scale: "Dórico"
        },
        {
          type: "Outro",
          prompt: "Desvanecimiento del ritmo y acordes sostenidos de despedida.",
          key: key,
          scale: "Menor Natural"
        }
      ];
    } else if (lowerPrompt.includes("triste") || lowerPrompt.includes("melancolic") || lowerPrompt.includes("menor") || key.toLowerCase().includes("minor")) {
      title = title || "Susurros del Pasado";
      genre = "Neo-Soul / Lo-Fi";
      sections = [
        {
          type: "Intro",
          prompt: "Textura inicial suspendida y melancólica para establecer la tónica menor.",
          key: key,
          scale: "Dórico"
        },
        {
          type: "Verso",
          prompt: "Armonía menor estable y suave con acordes menores de séptima y novena.",
          key: key,
          scale: "Menor Natural"
        },
        {
          type: "Coro",
          prompt: "Clímax emotivo brillante con acordes mayores de novena y tensiones de color.",
          key: key,
          scale: "Dórico"
        },
        {
          type: "Outro",
          prompt: "Disipación armónica con acordes abiertos y un acorde de resolución suspendido.",
          key: key,
          scale: "Menor Melódica"
        }
      ];
    } else {
      title = title || "Sueño Dorado";
      genre = "Pop Moderno";
      sections = [
        {
          type: "Intro",
          prompt: "Entrada brillante con acordes mayores extendidos para invitar al oyente.",
          key: key,
          scale: "Mayor / Jónica"
        },
        {
          type: "Verso",
          prompt: "Progresión pop arpegiada estable y dulce que apoya la melodía inicial.",
          key: key,
          scale: "Mayor / Jónica"
        },
        {
          type: "Coro",
          prompt: "Poderosa modulación armónica ascendente con máxima energía y acordes llenos.",
          key: key,
          scale: "Lidia"
        },
        {
          type: "Outro",
          prompt: "Resolución placentera de regreso a la tónica con un suave decrescendo.",
          key: key,
          scale: "Mayor / Jónica"
        }
      ];
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
