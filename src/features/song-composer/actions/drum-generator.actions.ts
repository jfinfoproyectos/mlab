"use server";

import { generateText, Output } from "ai";
import { getActiveAiProvider } from '@/features/ai-assistant/services/ai-provider.service';
import { z } from "zod";
import { songTrackNoteSchema, SongTrackNote, SongStructure } from "../schemas/song-generator.schema";
import { type DrumMapping } from "../schemas/drum-maps";

export async function generateDrumTrackAction(params: {
  songTitle: string;
  sectionType: string;
  totalBeats: number;
  userPrompt: string;
  tempo: number;
  drumMapping?: DrumMapping;
  customDrumMap?: string;
  progressionRhythmNotes?: any[];
}) {
  const { songTitle, sectionType, totalBeats, userPrompt, tempo, drumMapping, customDrumMap, progressionRhythmNotes } = params;

  try {
    const provider = await getActiveAiProvider();

    const syncInstructions = progressionRhythmNotes && progressionRhythmNotes.length > 0
      ? `\n5. SINCRONIZACIÓN DE ACORDES: Te he entregado el patrón rítmico subyacente de la canción. Usa esta información para acentuar cortes (crashes), bombos y caja EXACTAMENTE en los tiempos donde caen los acordes clave. Esto dará la sensación de que la banda toca junta y el baterista 'escucha' a los demás músicos.`
      : "";

    const rhythmDataStr = progressionRhythmNotes && progressionRhythmNotes.length > 0
      ? `\nPatrón de Acordes (beats donde ocurren cambios armónicos y rítmicos importantes):\n${JSON.stringify(progressionRhythmNotes.map((n:any) => ({ beat: n.startBeat, dur: n.durationBeats })), null, 2)}`
      : "";

    const systemPrompt = `Eres un Baterista Profesional y Productor Musical de clase mundial.
Tu tarea es componer un arreglo de batería y percusión (GROOVE) altamente realista, con swing, dinámicas humanas (Ghost notes) y fills (redobles) creativos.
INSTRUCCIÓN CRÍTICA DE REALISMO Y ESTILO: Tu interpretación debe emular a los bateristas y productores más reconocidos del género musical solicitado. Si el usuario sugiere un artista clásico o un ARTISTA MODERNO DE CUALQUIER GÉNERO (ej. The Weeknd, Blink-182, Rosalía, Travis Barker, Daft Punk), IDENTIFICA SU ESTILO MUSICAL, su "groove" de batería característico, y genéralo creativamente adoptando su filosofía. ¡EVITA TOTALMENTE LA MONOTONÍA! Usa síncopas, notas fantasma (ghost notes) y variaciones sutiles a lo largo del patrón. Que no suene a una caja de ritmos estática, sino a un músico humano tocando con "feeling" y "groove" de primer nivel.

INSTRUCCIONES CRÍTICAS:
1. REGLAS UNIVERSALES DE COHESIÓN:
   - MANTENER UN ANCLA: En cualquier género musical, no cambies todo el patrón a la vez al generar variaciones. Mantén constante un "ancla" rítmica (ej. el patrón del bombo o la caja) mientras varías los platos (Hi-Hat a Ride). Esto evitará el caos y mantendrá el groove.
   - TRANSICIONES GRADUALES: Para entrar a una nueva sección o variación, usa redobles.
3. EXCELENCIA EN FINALES (OUTRO/CODA): Si el usuario indica que la sección actual es un "Outro", "Coda" o "Final", OBLIGATORIAMENTE la batería no puede terminar cortada abruptamente a máxima intensidad. Debes GARANTIZAR UN FINAL ESPECTACULAR: remata con un platillo (Crash) potente en el último beat lógico y luego deja un silencio absoluto, o crea un "ritardando" (redoble que pierde energía) para cerrar la canción como un verdadero profesional.
2. Longitud: Debes componer notas a lo largo de TODA la duración de la sección, desde el beat 0.0 hasta el beat ${totalBeats}.0.
2. Dinámicas: NUNCA uses la misma velocidad para todos los golpes. El Hi-Hat debe tener acentos fuertes (0.8) y débiles (0.4). La caja debe tener golpes potentes (0.9) y notas fantasma (0.2). El bombo suele ser constante pero puede tener variaciones sutiles.
3. El compás típico es 4/4. Un tiempo (beat) es una negra (durationBeats: 1.0). Una corchea dura 0.5. Una semicorchea dura 0.25.
4. Genera redobles (fills) en los últimos 2 a 4 tiempos de la sección para dar paso a la siguiente.${syncInstructions}
5. GRAN FINAL EN OUTROS (CRÍTICO ABSOLUTO): Si el "sectionType" que estás generando contiene la palabra "Outro" o "Final" (insensible a mayúsculas), DEBES generar un cierre espectacular. Da un último golpe majestuoso (ej. Crash + Bombo a máxima fuerza 1.0) exactamente en el momento en que cae el último acorde de la sección. ¡A PARTIR DE ESE GOLPE NO DEBES TOCAR NADA MÁS! Silencio absoluto para cerrar con contundencia.

MAPA DE BATERÍA OBLIGATORIO:
${customDrumMap ? `Usa estrictamente este mapeo personalizado provisto por el usuario:\n${customDrumMap}` : `Usa SOLAMENTE estas notas para componer el ritmo según el VST elegido (${drumMapping?.name}):
- ${drumMapping?.map.kick}: Bombo (Kick Drum) - Fuerte y grave, marca el pulso base.
- ${drumMapping?.map.snare}: Caja/Tarola (Acoustic Snare) - Golpe principal, usualmente en los tiempos 2 y 4 (o 3 en Reggaeton).
- ${drumMapping?.map.closedHihat}: Charles cerrado (Closed Hi-Hat) - Mantiene la subdivisión rítmica continua.
- ${drumMapping?.map.openHihat}: Charles abierto (Open Hi-Hat) - Acento brillante.
- ${drumMapping?.map.crash}: Platillo Crash (Crash Cymbal 1) - Para explosiones al inicio de compases clave o coros.
- ${drumMapping?.map.ride}: Platillo Ride (Ride Cymbal 1) - Patrón continuo para estribillos abiertos.
- ${drumMapping?.map.lowFloorTom}: Tom de piso (Low Floor Tom).
- ${drumMapping?.map.lowTom}: Tom medio (Low Tom).
- ${drumMapping?.map.hiMidTom}: Tom alto (Hi-Mid Tom) - Útiles para redobles (fills) al final de la sección.
- ${drumMapping?.map.clap}: Palmas (Hand Clap).`}
`;

    const targetPrompt = `Genera la pista de BATERÍA para la sección "${sectionType}" de la canción "${songTitle}".
El Tempo es de ${tempo} BPM. La longitud de la sección es de ${totalBeats} tiempos (negras).${rhythmDataStr}

Instrucción del usuario para el Groove/Estilo:
"${userPrompt}"
`;

    const drumNoteSchema = z.object({
      id: z.string().optional(),
      note: z.string().describe("SOLO la nota exacta (ej: C2, D2, F#2) según el mapa provisto. NUNCA escribas el nombre del instrumento (ej. no pongas 'Bombo')."),
      startBeat: z.number().describe(`Tiempo de inicio (0.0 a ${totalBeats}.0). Distribuye por todo el tiempo.`),
      durationBeats: z.number().describe("Duración en negras. Para baterías, usa notas cortas (0.25 o 0.5) ya que son sonidos percusivos no sostenidos."),
      velocity: z.number().describe("Fuerza del golpe (0.0 a 1.0). Expresividad humana CRÍTICA."),
    });

    const result = await generateText({
      model: provider,
      output: Output.array({ element: drumNoteSchema }),
      system: systemPrompt,
      prompt: targetPrompt,
    });
    const generated = result.output;

    if (Array.isArray(generated)) {
      const generatedNotes: SongTrackNote[] = generated.map((n: any) => ({
        id: crypto.randomUUID(),
        note: n.note,
        startBeat: n.startBeat,
        durationBeats: n.durationBeats || 0.25,
        velocity: Math.max(0.1, Math.min(1.0, n.velocity)),
      }));

      // Sort by time
      generatedNotes.sort((a, b) => a.startBeat - b.startBeat);

      return { success: true, notes: generatedNotes };
    }

    throw new Error("El modelo de IA no devolvió un formato válido de notas rítmicas.");
  } catch (error: any) {
    console.error("Error generating drum track:", error);
    return { success: false, error: error.message || "Error al componer el ritmo." };
  }
}
