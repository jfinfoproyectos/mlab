"use server";

import { z } from "zod";
import { generateObject } from "ai";
import { getActiveAiProvider } from "@/features/ai-assistant/services/ai-provider.service";
import { SongSectionTrack } from "../schemas/song-generator.schema";

/**
 * Analiza un texto para extraer sílabas y marcar heurísticamente el acento prosódico.
 */
function analyzeProsody(text: string): Array<{ syllable: string, isAccented: boolean }> {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const result: Array<{ syllable: string, isAccented: boolean }> = [];
  
  words.forEach(word => {
    // Limpiar puntuación para análisis, pero la guardamos para la sílaba final
    const cleanWord = word.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/g, "");
    if (!cleanWord) {
      if (result.length > 0) result[result.length - 1].syllable += word; // adjuntar puntuación
      return;
    }
    
    // Separación básica por vocales
    const chunks = word.match(/([^aeiouáéíóúüA-ZÁÉÍÓÚÜ]*[aeiouáéíóúüA-ZÁÉÍÓÚÜ]+(?:[^aeiouáéíóúüA-ZÁÉÍÓÚÜ]*$|[^aeiouáéíóúüA-ZÁÉÍÓÚÜ](?=[^aeiouáéíóúüA-ZÁÉÍÓÚÜ])))/gi) || [word];
    
    // Heurística de acento en español:
    // - Si tiene tilde, esa es la tónica.
    // - Si termina en N, S o vocal, la tónica es la penúltima.
    // - Sino, la tónica es la última.
    let tonicIndex = chunks.length - 1;
    let foundTilde = false;
    
    for (let i = 0; i < chunks.length; i++) {
      if (/[áéíóúÁÉÍÓÚ]/.test(chunks[i])) {
        tonicIndex = i;
        foundTilde = true;
        break;
      }
    }
    
    if (!foundTilde && chunks.length > 1) {
      const lastChar = cleanWord[cleanWord.length - 1].toLowerCase();
      if (['n', 's', 'a', 'e', 'i', 'o', 'u'].includes(lastChar)) {
        tonicIndex = chunks.length - 2;
      }
    }

    chunks.forEach((c, i) => {
      const isAccented = i === tonicIndex;
      const formattedSyllable = (i === chunks.length - 1) ? c : c + "-";
      result.push({ syllable: formattedSyllable, isAccented });
    });
  });
  
  return result;
}

export async function generateIntelligentMelodyAction(params: {
  songTitle: string;
  songGenre?: string;
  sectionType: string;
  sectionKey: string;
  sectionScale: string;
  chordsList: Array<{ chord: string; pianoNotes: string[]; role: string; duration?: number; }>;
  trackName: string;
  midiChannel: number;
  userPrompt: string;
  lyrics?: string;
  isVocal: boolean;
  motifContext?: string; // Información sobre motivos generados previamente
}): Promise<{ success: boolean; data?: SongSectionTrack; error?: string; motifCreated?: string }> {
  
  const {
    songTitle, songGenre, sectionType, sectionKey, sectionScale,
    chordsList, trackName, midiChannel, userPrompt, lyrics, isVocal, motifContext
  } = params;

  const totalBeats = chordsList.reduce((acc, c) => acc + (c.duration || 4), 0);
  
  let prosodyArray: Array<{ syllable: string, isAccented: boolean }> = [];
  if (isVocal && lyrics) {
    prosodyArray = analyzeProsody(lyrics);
  }

  try {
    const provider = await getActiveAiProvider();

    let gridStart = 0;
    const gridTemporal = chordsList.map((c, idx) => {
      const start = gridStart;
      const duration = c.duration || 4;
      const end = start + duration;
      gridStart = end;
      return `- Acorde ${idx + 1} (${c.chord}): tiempos [${start.toFixed(1)} a ${(end).toFixed(1)}]. Notas base: ${c.pianoNotes.join(", ")}`;
    }).join("\n    ");

    const systemPrompt = `Eres un arreglista solista, virtuoso instrumental y vocal coach de clase mundial.
Tu tarea es componer un solo o una melodía principal SUPER INTELIGENTE MUSICALMENTE para la sección actual de la canción.
Debes emular a compositores clásicos y modernos (como Bach o virtuosos del jazz) manteniendo "unidad de afecto" y coherencia formal. Si el usuario menciona a un artista clásico, contemporáneo o un ARTISTA MODERNO DE CUALQUIER GÉNERO (ej. Ariana Grande, The Weeknd, Freddie Mercury, Rosalía), IDENTIFICA SU ESTILO VOCAL O INSTRUMENTAL, sus adornos característicos (melismas, staccatos, falsetes), y genera la melodía adoptando profundamente su filosofía creativa. ¡Cero caos estructural!

DIRECTRICES MAESTRAS (SISTEMA MELÓDICO INTELIGENTE):
1. DESARROLLO MOTÍVICO: No dispares notas al azar. Plantea una frase musical con sentido ("Pregunta y Respuesta"). Si ya existe un motivo previo en la canción, desarrolla sobre él; si no, establécelo ahora.
2. EXPRESIVIDAD HUMANA (Micro-Articulaciones): Tus notas no son midi estático. Debes añadir campos de expresión a cada nota para que el sintetizador "respire" y "sienta".
3. FRASEO Y RESPIRACIÓN: El instrumento o la voz NECESITA RESPIRAR. Introduce silencios (gaps entre startBeat y final de la nota previa) lógicamente al final de las frases.
4. ARMONÍA Y CONDUCCIÓN: Usa las notas del acorde en tiempos fuertes, y notas de tensión (9nas, 11nas, cromáticas) en los tiempos débiles resolviendo elegantemente.
5. EXCELENCIA EN FINALES (OUTRO/CODA): Si te indican que estás componiendo para un "Outro", "Final" o "Coda", ESTÁ PROHIBIDO cortar la melodía de golpe. Debes GARANTIZAR UN FINAL EXCELENTE: diseña una frase musical conclusiva que resuelva armónicamente hacia la tónica principal, cantando o tocando la nota final con autoridad y extendiéndola hermosamente, seguida de silencio para dejar respirar el cierre.
`;

    let targetPrompt = `Sección: ${sectionType}
Género: ${songGenre}
Tonalidad: ${sectionKey} (${sectionScale})
Grid Temporal y Armonía (Total: ${totalBeats} tiempos):
    ${gridTemporal}

Vibe solicitado: "${userPrompt}"
`;

    if (motifContext) {
      targetPrompt += `\nCONTEXTO MOTÍVICO DE LA CANCIÓN:\n${motifContext}\n(Usa este contexto para no perder el hilo conductor de la canción. Puedes variar rítmicamente el motivo o transportarlo armónicamente).`;
    }

    if (isVocal && prosodyArray.length > 0) {
      targetPrompt += `\n
=== MODO KARAOKE / VOZ PRINCIPAL ===
Letra original a musicalizar: "${lyrics}"

ARRAY ESTRICTO DE PROSODIA (Total: ${prosodyArray.length} sílabas):
${JSON.stringify(prosodyArray)}

REGLAS DE PROSODIA (CRÍTICO):
1. ACENTOS NATURALES: Observa la propiedad "isAccented: true". ¡Esas sílabas DEBEN OBLIGATORIAMENTE caer en un tiempo fuerte del compás (ej. startBeat 0.0, 1.0, 2.0, 3.0)! Si pones una sílaba tónica en un contratiempo débil y una átona en un fuerte, sonarás como un robot sin ritmo.
2. MAPEADO ESTRICTO 1:1: Tienes que devolver un array de notas usando TODAS Y CADA UNA de las sílabas proporcionadas, en su orden exacto. ¡No omitas ninguna sílaba ni inventes palabras nuevas!
3. DISTRIBUCIÓN: Abarca artísticamente los ${totalBeats} tiempos.
4. MELISMAS Y LEGATO: Si decides estirar una vocal hermosa, genera varias notas con la MISMA sílaba repetida. (Ej. "zón", "zón").
5. SILENCIOS Y COMAS: Cuando termines una oración o frase de la letra, DEJA UN SILENCIO DE RESPIRACIÓN de 1.0 o 2.0 tiempos.
`;
    } else {
      targetPrompt += `\n
=== MODO SOLO INSTRUMENTAL ===
Crea una melodía instrumental inolvidable. Aplica curvas de Pitch Bend (para emular estiramientos de cuerdas o embocadura) y modulación expresiva. Usa notas largas y rápidas.
`;
    }

    const intelligentTrackSchema = z.object({
      motifDescription: z.string().describe("Breve descripción del motivo musical o fraseo empleado aquí, para pasarlo a la siguiente sección y mantener coherencia."),
      notes: z.array(z.object({
        id: z.string().optional(),
        syllable: z.string().optional().describe("Solo para voz: La sílaba exacta de la letra (del array de prosodia)."),
        note: z.string().describe("Nota con octava (ej. C4, Eb5)"),
        startBeat: z.number().describe("Tiempo de inicio (debe encajar en los acentos si es prosodia)"),
        durationBeats: z.number().describe("Duración en negras"),
        velocity: z.number().describe("Fuerza de ataque (0.0 - 1.0). Varíala para humanizar."),
        expressionCurve: z.enum(["flat", "crescendo", "decrescendo", "swell"]).optional().describe("Arco de volumen (CC11). 'swell' crece y decrece para notas largas."),
        vibrato: z.boolean().optional().describe("Activar modulación (CC1) para esta nota (típicamente al final de notas largas)."),
        portamento: z.boolean().optional().describe("Deslizar el tono suavemente desde la nota anterior hacia esta (Pitch bend glide).")
      }))
    });

    const result = await generateObject({
      model: provider,
      schema: intelligentTrackSchema ,
      system: systemPrompt,
      prompt: targetPrompt,
      abortSignal: AbortSignal.timeout(60000),
      maxRetries: 1,
    });

    if (result.object && Array.isArray(result.object.notes)) {
      const generatedNotes = result.object.notes.map((n: any) => ({
        id: n.id ? String(n.id) : `melody-${Math.random().toString(36).substr(2, 6)}`,
        syllable: n.syllable ? String(n.syllable) : undefined,
        note: String(n.note),
        startBeat: Number(n.startBeat),
        durationBeats: Number(n.durationBeats),
        velocity: Math.min(1.0, Math.max(0.0, Number(n.velocity))),
        expressionCurve: n.expressionCurve,
        vibrato: Boolean(n.vibrato),
        portamento: Boolean(n.portamento)
      }));

      return {
        success: true,
        motifCreated: result.object.motifDescription,
        data: {
          id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: trackName,
          midiChannel: midiChannel,
          instrumentPreset: isVocal ? "synth-lead" : "electric-guitar", // o dinámico
          notes: generatedNotes,
          prompt: userPrompt,
          volume: 0.9
        }
      };
    }

    throw new Error("Formato de IA inválido");
  } catch (error: any) {
    console.error("Error generating intelligent melody:", error);
    return { success: false, error: error.message || "Failed to generate intelligent melody." };
  }
}
