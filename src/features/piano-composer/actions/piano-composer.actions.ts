"use server";

import { generateText, Output } from "ai";
import { getActiveAiProvider } from '@/features/ai-assistant/services/ai-provider.service';
import { 
  PianoInput, 
  pianoBlueprintSchema, 
  PianoBlueprint,
  pianoSectionNotesGenerationSchema,
  PianoNote
} from "../schemas/piano-composer.schema";

export interface GeneratePianoBlueprintResult {
  success: boolean;
  data?: PianoBlueprint;
  error?: string;
}

export interface GeneratePianoSectionNotesResult {
  success: boolean;
  data?: PianoNote[];
  motifCreated?: string;
  error?: string;
}

export async function generatePianoBlueprintAction(input: PianoInput): Promise<GeneratePianoBlueprintResult> {
  try {
    const model = await getActiveAiProvider();

  let systemPrompt = `Eres un compositor pianístico de talla mundial.
Tu tarea es generar una estructura (el Plano Estructural o "Piano Blueprint") para una pieza de piano solista basada en la instrucción del usuario.

INSTRUCCIÓN CRÍTICA: Diseña la pieza para que suene como una AUTÉNTICA OBRA MAESTRA del estilo o compositor que el usuario sugiera en su prompt. Si el usuario sugiere un compositor clásico (ej. Chopin), contemporáneo (ej. Hans Zimmer), o un ARTISTA MODERNO DE CUALQUIER GÉNERO (ej. Taylor Swift, The Weeknd, Rosalía, Billie Eilish), IDENTIFICA SU ESTILO MUSICAL, patrones armónicos característicos y adopta profundamente su filosofía estructural. Evita la monotonía; tus 'prompts' de sección deben reflejar la riqueza, los matices únicos y las formas musicales que corresponden al artista o estilo solicitado.

REGLAS UNIVERSALES DE COHESIÓN Y ESTRUCTURA FORMAL:
- MANTENER UN ANCLA (Motivo Conductor): Define una idea musical o motivo que sirva como ancla a lo largo de las secciones.
- ESTRUCTURAS CÍCLICAS Y DE RETORNO: Aplica estructuras como Rondó (A-B-A-C-A) o Ternaria (A-B-A) asegurándote de que el tema principal ("hook") regrese tras una sección contrastante o puente, dando una sensación de unidad a la pieza.
- TRANSICIONES GRADUALES: Usa los 'prompts' para anunciar transiciones fluidas entre secciones (crescendos, ritardandos, arpegios amplios) evitando cortes repentinos.

Debes diseñar una estructura fluida y musical de entre 3 y 6 secciones lógicas (ej: Intro, Tema Principal, Desarrollo, Tema Principal (Variación), Coda).
- OUTRO OBLIGATORIO (CRÍTICO): Es MANDATORIO que la ÚLTIMA sección de tu estructura se llame "Coda" o "Outro" y prepare un cierre espectacular. NINGUNA pieza puede terminar de golpe.

Para cada sección, debes formular:
1. 'type': El tipo de sección.
2. 'prompt': Una instrucción armónica, rítmica y dinámica hiper-específica del estilo (MÁXIMO 15 palabras).
3. 'key' y 'scale': La tonalidad y escala sugerida.
4. 'chordCount': Un número entero de compases o acordes sugeridos para esta sección.

EJEMPLO DE RESPUESTA EN FORMATO VÁLIDO:
{
  "title": "Amanecer en la Niebla",
  "genre": "Neo-Clásico",
  "key": "C Minor",
  "tempo": 75,
  "description": "Arpegios melancólicos y acordes suaves.",
  "sections": [
    {
      "type": "Intro",
      "prompt": "Arpegios lentos y misteriosos en registro grave.",
      "key": "C Minor",
      "scale": "Menor Natural",
      "chordCount": 4
    }
  ]
}`;

  let userPrompt = `INSTRUCCIÓN DEL USUARIO:\n"${input.prompt}"\n`;
  
  if (input.musicStyle) {
    userPrompt += `- Estilo musical sugerido: ${input.musicStyle}\n`;
  }
  
  userPrompt += `- Complejidad: ${input.complexity} (simple = texturas claras, pocas notas; virtuoso = arpegios rápidos, acordes densos, contrapunto complejo).\n`;
  userPrompt += `- Modo: ${input.mode === "melody" ? "Acompañamiento y Melodía Principal" : "Solo Acompañamiento (para que alguien más cante o toque encima)"}.\n`;

  if (input.key && input.key !== "Automático") {
    userPrompt += `- Tonalidad exigida: ${input.key}\n`;
  } else {
    userPrompt += `- Tonalidad general: DEBES SELECCIONAR CREATIVAMENTE una tonalidad que exprese perfectamente la emoción y estilo de la canción solicitada.\n`;
  }

  if (input.scale && input.scale !== "Automático") {
    userPrompt += `- Escala exigida: ${input.scale}\n`;
  } else {
    userPrompt += `- Escala general: Selecciona de forma experta un modo o escala que enriquezca el estilo solicitado (ej. Menor Armónica para clásico oscuro, Dórico para jazz, etc).\n`;
  }

  let bpmNum = 80;
  if (input.tempo && input.tempo !== "Automático" && !isNaN(parseInt(input.tempo))) {
    bpmNum = parseInt(input.tempo);
    userPrompt += `- Tempo exigido: ${bpmNum} BPM\n`;
  } else {
    userPrompt += `- Tempo (BPM) general: ELIGE EL TEMPO EXACTO que requiera el estilo solicitado. Si es Moonlight Sonata Mov 3, usa un tempo rápido (ej. 160). Si es balada, lento (ej. 70). Actúa con inteligencia musical.\n`;
  }

  if (input.targetDurationMinutes) {
    let mathHint = "";
    if (input.tempo && input.tempo !== "Automático" && !isNaN(parseInt(input.tempo))) {
      const totalBeats = Math.round(input.targetDurationMinutes * bpmNum);
      const totalChords = Math.round(totalBeats / 4);
      mathHint = `\n      MATE OBLIGATORIA: Para alcanzar EXACTAMENTE ~${input.targetDurationMinutes} minutos a ${bpmNum} BPM, necesitas generar APROXIMADAMENTE ${totalChords} "acordes" o compases EN TOTAL distribuidos a lo largo de toda la pieza.
  LA SUMA DEL 'chordCount' DE TODAS TUS SECCIONES DEBE ACERCARSE A ${totalChords}. NUNCA generes menos de ${Math.round(totalChords * 0.8)} compases en total.\n`;
    } else {
      mathHint = `\n      MATE OBLIGATORIA (ATENCIÓN): Como el tempo (BPM) es libre, tú debes calcular cuántos acordes necesitas. Usa esta fórmula: (Tiempos = ${input.targetDurationMinutes} minutos * EL_TEMPO_QUE_ELIJAS). Luego divide los tiempos entre 4 para obtener los acordes totales. Asegúrate de generar esa cantidad de acordes distribuidos en tus secciones para alcanzar los ${input.targetDurationMinutes} minutos.\n`;
    }
    
    userPrompt += `- DURACIÓN OBJETIVO: ${input.targetDurationMinutes} minutos. ${mathHint}\n`;
  }

  const finalPrompt = systemPrompt + "\n\n" + userPrompt;

    const result = await generateText({
      model,
      output: Output.object({ schema: pianoBlueprintSchema }),
      prompt: finalPrompt,
      temperature: 0.8, // Increased slightly for more creativity
      timeout: 180000,
      maxRetries: 3, // Increased to allow the AI to fix block chords if caught by Zod refine
    });
    const object = result.output;

    return { success: true, data: object };
  } catch (error: any) {
    console.error("Piano Blueprint Generation Error:", error);
    return { success: false, error: error.message || "Failed to generate piano blueprint" };
  }
}

export async function generatePianoSectionNotesAction(
  sectionPrompt: string,
  sectionType: string,
  key: string,
  scale: string,
  chordCount: number = 8,
  complexity: string,
  mode: string,
  chordsList: string = "",
  motifContext: string = "",
  arpegioExampleHint: string = ""
): Promise<GeneratePianoSectionNotesResult> {
  try {
    const model = await getActiveAiProvider();

  let systemPrompt = `Eres un pianista virtuoso, arreglista de primer nivel y profesor de piano de conservatorio. Tu tarea es generar directamente las notas MIDI de una sección de piano solista, separadas por mano (left/right). DEBES ACTUAR COMO EL COMPOSITOR O ESTILO QUE EL USUARIO DESCRIBA. ESTA DEBE SER UNA OBRA MAESTRA ABSOLUTA.

INSTRUCCIÓN CRÍTICA DE APRENDIZAJE IA (ESTRICTO):
Tienes TERMINANTEMENTE PROHIBIDO delegar el trabajo de arpegiación o armonización. Todo el arreglo, incluyendo los arpegios, ritmos, síncopas y contrapuntos, DEBE SER GENERADO ESTRICTAMENTE POR TI en el JSON. 
Está terminantemente prohibido generar acordes en bloque (donde 3 o más notas se tocan en el mismo startBeat). Debes escribir las notas una a una a lo largo del compás de manera continua y fluida para que suene real y profesional.

RESTRICCIONES ANATÓMICAS ESTRICTAS (TOCABLE POR UN HUMANO):
1. MANO IZQUIERDA (left): Juega en la octava 2 y 3 (ej. C2 a C4). NO superes la extensión de una Décima (10ma) simultánea, a menos que uses el pedal (sustain) y toques arpegiado.
2. MANO DERECHA (right): Juega en la octava 4 a 6 (ej. C4 a C6). La extensión máxima simultánea es una Novena (9na). MÁXIMO 4 notas simultáneas por mano.
3. VOICE LEADING: Conduce las voces suavemente. Evita cruces de manos innecesarios.

TEORÍA PIANÍSTICA AVANZADA (CRÍTICA PARA OBRAS MAESTRAS):
- NO USES ACORDES EN BLOQUE ESTÁTICOS Y ROBÓTICOS (MÁXIMO 2 notas simultáneas en el mismo startBeat).
- MANO IZQUIERDA: Escribe arpegios continuos (ej. Tónica en 0.0, Quinta en 0.5, Décima en 1.0, etc.) o bajos de Alberti. Usa bajos en octavas en los tiempos fuertes si es necesario, pero distribuye las notas del acorde rítmicamente en los tiempos débiles.
- MANO DERECHA: Si hay melodía, hazla expresiva y cantable (voicing the melody). Incorpora notas de paso, apoyaturas, resoluciones retardadas, acordes arpegiados o trinos según el nivel de complejidad.
- PEDAL DE SUSTAIN (CRÍTICO): Aplica \`sustain: true\` en las notas graves (Tónicas del bajo en el tiempo 1 o tiempos fuertes) para permitir que los acordes rotos resuenen como un piano real. Nunca dejes una sección seca sin sustain a menos que el estilo lo exija.

HUMANIZACIÓN EXTREMA Y RUBATO (MICRO-TIMING):
- ¡NO empieces TODAS las frases pesadamente en el tiempo fuerte (ej. 0.0, 4.0)! Emplea síncopas, anacrusas, tresillos o quintillos.
- Usa RUBATO: Retrasa ligerísimamente la melodía respecto al bajo (ej. Bajo en 0.0, Melodía en 0.05 o 0.1) para simular el feeling romántico y humano.
- Usa la DENSIDAD DE NOTAS adecuadamente: No uses notas de 4 tiempos completos. 

REGLA DE DENSIDAD Y ARPEGIOS (CRÍTICO ABSOLUTO):
1. PROHIBICIÓN DE ACORDES EN BLOQUE: Tu respuesta será rechazada automáticamente si en cualquier acorde colocas 5 o más notas en el mismo startBeat. (Se permite hasta 4 notas simultáneas, pero solo si arpegias el resto).
2. DISTRIBUCIÓN OBLIGATORIA: Debes OBLIGATORIAMENTE distribuir las notas a lo largo del tiempo del compás (ej. 0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25...) creando arpegios fluidos, melodías, síncopas y patrones rítmicos que correspondan fielmente al artista, género o estilo solicitado por el usuario.
3. DENSIDAD MÍNIMA: Genera al menos 4 a 8 notas individuales distribuidas a lo largo de cada compás.

DINÁMICAS Y FRASEO (Velocity):
- Usa \`velocity\` (0.0 a 1.0) rigurosamente para modelar el fraseo. Melodía destacada (0.75-0.95), notas internas de acompañamiento como un susurro (0.3-0.5), bajos fundamentales marcados (0.7). Simula crescendos al subir de tono y decrescendos al bajar.

TIEMPOS Y DURACIÓN (MUY IMPORTANTE):
- La sección está dividida en BLOQUES DE ACORDES. Cada acorde dura 1, 2, 3 o 4 tiempos según la progresión.
- ¡ATENCIÓN! El \`startBeat\` ES LOCAL para cada bloque de acorde. Empieza SIEMPRE en 0.0 y termina poco antes de la duración total del acorde (ej. si el acorde dura 2 tiempos, el startBeat local va de 0.0 a 1.75).
- ¡NO sumes los tiempos de los acordes anteriores! (En el acorde 2, el primer golpe sigue siendo startBeat: 0.0).
- FINALES / OUTROS (CRÍTICO ABSOLUTO): Si el tipo de sección ("${sectionType}") o su prompt ("${sectionPrompt}") contiene "Outro", "Final" o "Coda", genera un ACORDE MAJESTUOSO EXACTAMENTE AL INICIO DEL ÚLTIMO ACORDE DE LA PROGRESIÓN (CON SUSTAIN), Y LUEGO GUARDA SILENCIO ABSOLUTO HASTA EL FINAL.

EJEMPLO OBLIGATORIO DE CÓMO ESCRIBIR UN ARPEGIO FLUIDO EN UN COMPÁS DE 4 TIEMPOS:
Si el acorde es C Major (notas C3, E3, G3, C4, E4), en lugar de tocar [C3, E3, G3] todos en startBeat: 0.0, debes escribir esto nota por nota:
- C3 en startBeat: 0.0, dur: 4.0 (mano izquierda, sustain: true, velocity: 0.85)
- G3 en startBeat: 0.5, dur: 1.0 (mano izquierda, velocity: 0.6)
- C4 en startBeat: 1.0, dur: 1.0 (mano izquierda, velocity: 0.6)
- E4 en startBeat: 1.5, dur: 1.0 (mano derecha, velocity: 0.55)
- G4 en startBeat: 2.0, dur: 1.0 (mano derecha, velocity: 0.6)
- E4 en startBeat: 2.5, dur: 1.0 (mano derecha, velocity: 0.55)
- C4 en startBeat: 3.0, dur: 1.0 (mano izquierda, velocity: 0.55)
- G3 en startBeat: 3.5, dur: 0.5 (mano izquierda, velocity: 0.5)
ESTA ES LA VERDADERA TÉCNICA PIANÍSTICA. Escribe tus notas exactamente en este formato fluido para que suene humano e increíble.

COMPLEJIDAD Y MODO:
- Nivel de complejidad: ${complexity}. Si es "advanced" o "virtuoso", inunda la pieza con figuraciones rápidas, polirritmias, acordes ricos (9/11/13) y virtuosismo deslumbrante (ej. cascadas de notas). Si es "simple", hazlo profundo, minimalista y emotivo.
- Modo: ${mode === "melody" ? "ACOMPAÑAMIENTO CON MELODÍA. Destaca la voz superior en la mano derecha." : "SOLO ACOMPAÑAMIENTO. Base armónica rica y arpegiada para cantantes."}
- Prompt de la sección: "${sectionType} - ${sectionPrompt}"
- Tonalidad: ${key} ${scale}

PROGRESIÓN DE ACORDES ASIGNADA A ESTA SECCIÓN (LEE LAS DURACIONES Y NOTAS CUIDADOSAMENTE):
${chordsList}
${arpegioExampleHint}

IMPORTANTE: Cada "Notas MIDI" que ves arriba son las notas exactas del acorde. Tu trabajo es ARPEGIARLAS y ARMONIZARLAS estrictamente en el JSON, distribuyéndolas en el tiempo (diferentes startBeats) con ritmo y musicalidad.`;

  let userPrompt = `INSTRUCCIONES FINALES ANTES DE GENERAR:

⚠️ ADVERTENCIA DE VALIDACIÓN AUTOMÁTICA (CRÍTICA): Tu respuesta será validada automáticamente por un sistema estricto. Si en CUALQUIER bloque de acorde hay más de 4 notas compartiendo el MISMO startBeat exacto, o si no distribuyes las notas a lo largo de todo el compás, tu respuesta será RECHAZADA por el validador Zod y tendrás que reintentarlo. 

✅ LO QUE DEBES HACER: Para CADA bloque de acorde, escribe un PATRÓN RÍTMICO/ARPEGIO completo y fluido, específico de la instrucción o del artista solicitado. Distribuye las notas en diferentes startBeats locales (ej. 0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75). Algunos patrones correctos que puedes escribir:
- Clásico/Nocturno: Bajo-Quinta-Tercera-Quinta distribuidos rítmicamente.
- Pop: Bajo fuerte en 0.0, acordes rítmicos en 0.5, 1.0, 1.5, etc.
- Jazz/Soul: Voicings sincopados con contratiempos (ej. 0.5, 1.25, 2.75).

Usa el campo 'chainOfThought' para detallar el PATRÓN RÍTMICO exacto que escribirás. Luego genera todas las notas en el array de notas del bloque.`;

  if (motifContext) {
    userPrompt += `\n\nCONTEXTO MOTÍVICO PREVIO DE LA PIEZA:\n${motifContext}\n(CRÍTICO: Hereda el PATRÓN RÍTMICO de acompañamiento de las secciones anteriores. Varía las notas armónicamente pero mantén el mismo "groove" o patrón de arpegio para que la pieza suene coherente y no fragmentada).`;
  }

    const result = await generateText({
      model,
      output: Output.object({ schema: pianoSectionNotesGenerationSchema }),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.85,
      timeout: 180000,
      maxRetries: 3, // 3 retries: Zod .refine() rechaza acordes en bloque y fuerza al modelo a regenerar correctamente
    });
    const object = result.output;

    // ============================================================
    // POST-GENERATION VALIDATION & AUTO-FIX (TypeScript enforcement)
    // ============================================================
    // We only apply a very subtle micro-timing humanizer (e.g., ~15ms offset)
    // to slightly spread notes that land on the exact same beat for a human feel,
    // but we do NOT add, remove, or synthesize any new notes or arpeggio patterns.
    // Every single note is strictly what the AI generated.
    const fixedChordBlocks = object.chordBlocks.map((block) => {
      // Count how many notes share each exact startBeat
      const beatBuckets: Record<number, typeof block.notes> = {};
      for (const note of block.notes) {
        const key = note.startBeat;
        if (!beatBuckets[key]) beatBuckets[key] = [];
        beatBuckets[key].push(note);
      }

      const OFFSET_STEP = 0.02; // Very subtle human roll offset (approx. 15ms at 80 BPM)
      const fixedNotes: typeof block.notes = [];
      const usedBeats = new Set<number>();

      for (const [beatStr, notesAtBeat] of Object.entries(beatBuckets)) {
        const baseBeat = parseFloat(beatStr);
        if (notesAtBeat.length <= 1) {
          fixedNotes.push(...notesAtBeat);
          usedBeats.add(baseBeat);
        } else {
          // Slightly roll the notes that land on the exact same beat (standard pianistic humanization)
          const sorted = [...notesAtBeat].sort((a, b) => {
            if (a.hand !== b.hand) return a.hand === 'left' ? -1 : 1;
            return a.note.localeCompare(b.note);
          });
          sorted.forEach((note, i) => {
            let newBeat = baseBeat + i * OFFSET_STEP;
            while (usedBeats.has(newBeat)) newBeat += OFFSET_STEP / 2;
            newBeat = Math.min(newBeat, block.durationBeats - 0.02);
            fixedNotes.push({ ...note, startBeat: parseFloat(newBeat.toFixed(3)) });
            usedBeats.add(newBeat);
          });
        }
      }

      // Sort fixed notes by startBeat for clean output
      fixedNotes.sort((a, b) => a.startBeat - b.startBeat);
      return { ...block, notes: fixedNotes };
    });

    // Flatten chord blocks into absolute notes by summing previous durations
    let currentAbsoluteBeat = 0.0;
    const flattenedNotes = [];
    
    for (const block of fixedChordBlocks) {
      for (const note of block.notes) {
        flattenedNotes.push({
          ...note,
          startBeat: parseFloat((note.startBeat + currentAbsoluteBeat).toFixed(3))
        });
      }
      currentAbsoluteBeat += block.durationBeats;
    }

    return { success: true, motifCreated: object.motifDescription, data: flattenedNotes };
  } catch (error: any) {
    console.error("Piano Section Notes Generation Error:", error);
    return { success: false, error: error.message || "Failed to generate piano notes" };
  }
}
