"use server";

import { generateText, Output } from "ai";
import { getActiveAiProvider } from "../services/ai-provider.service";
import { chordInputSchema, chordProgressionSchema, ChordInput, ChordProgression } from "../schemas/chord-generator.schema";

export interface GenerateChordProgressionResult {
  success: boolean;
  data?: ChordProgression;
  error?: string;
  debugInfo?: string;
}

export async function generateChordProgressionAction(data: ChordInput): Promise<GenerateChordProgressionResult> {
  const validated = chordInputSchema.parse(data);
  const count = validated.chordCount || 4;

  try {
    // 1. Get the active AI provider
    const provider = await getActiveAiProvider();

    // 2. Define the system prompt to guide the LLM
    const systemPrompt = `Eres un compositor y teórico musical de clase mundial experto en armonía de jazz, pop, clásica y neo-soul.
Tu tarea es componer una progresión de acordes hermosa, coherente y emotiva (de EXACTAMENTE ${count} acordes) que se ajuste a la descripción del usuario.
Debes rellenar todos los campos del esquema JSON estructurado de forma ultra-concisa.

{
  "name": "Nostalgia de Otoño",
  "description": "Vibra melancólica con jazz lento y fluido.",
  "key": "C Minor",
  "tempo": 80,
  "theoryExplanation": "Esta secuencia utiliza un acorde Cm9 inicial de tónica para establecer una base sombría. Luego, la subdominante Fm9 introduce tensión suave mediante un voicing Drop 2, resolviendo las voces superiores fluidamente por grados conjuntos.",
  "chords": [
    {
      "chord": "Cm9",
      "duration": 4,
      "role": "Tónica",
      "romanNumeral": "i9",
      "suggestedScale": "C Dórica",
      "description": "Inicio sombrío.",
      "voicing": "Close",
      "inversion": "Fundamental",
      "pianoNotes": ["C3", "Eb3", "G3", "Bb3", "D4"]
    },
    {
      "chord": "Fm9",
      "duration": 4,
      "role": "Subdominante",
      "romanNumeral": "iv9",
      "suggestedScale": "F Dórica",
      "description": "Tensión y movimiento.",
      "voicing": "Drop 2",
      "inversion": "1ra Inversión",
      "pianoNotes": ["Ab3", "C4", "Eb4", "F4", "G4"]
    }
  ]
}

REGLAS DE TEORÍA Y CORRESPONDENCIA DE BAJO (OBLIGATORIO):
- La nota más grave (la primera del array 'pianoNotes') DEBE corresponder exactamente a la inversión seleccionada en 'inversion':
  * 'Fundamental': La nota más grave de 'pianoNotes' debe ser la tónica (ej. C3 para Cm9).
  * '1ra Inversión': La nota más grave de 'pianoNotes' debe ser la tercera del acorde (ej. Ab3 para Fm9, o Eb3 para Cm9).
  * '2da Inversión': La nota más grave de 'pianoNotes' debe ser la quinta del acorde (ej. C4 para Fm9, o G3 para Cm9).
  * '3ra Inversión': La nota más grave de 'pianoNotes' debe ser la séptima del acorde (ej. Eb4 para Fm9, o Bb3 para Cm9).
- INCLUSIÓN DE LA TÓNICA (OBLIGATORIO): Todo acorde generado DEBE incluir obligatoriamente la tónica (Root/Fundamental) del acorde dentro del array 'pianoNotes'. Por ejemplo, para Ebm9, 'pianoNotes' DEBE incluir la nota Eb (ej. Eb3 o Eb4). Queda STRICTAMENTE PROHIBIDO utilizar voicings 'Rootless' (sin tónica) que omitan la nota fundamental.

REGLAS DE CONCISIÓN DE OBLIGADO CUMPLIMIENTO:
- Genera EXACTAMENTE ${count} acordes (ni más ni menos).
- 'description' principal de la progresión: MÁXIMO 8 palabras.
- 'description' individual de cada acorde: MÁXIMO 5 palabras.
- 'romanNumeral': MÁXIMO 2 palabras (ej: 'i9', 'V7b9', 'bVImaj7').
- 'suggestedScale': MÁXIMO 3 palabras (ej: 'C Dórica', 'G Alterada', 'Ab Lidia').
- 'theoryExplanation': Explicación teórica detallada sobre las tensiones y resoluciones de toda la progresión. MÁXIMO 60 palabras.
- 'voicing': MÁXIMO 2 palabras (ej: 'Drop 2', 'Close').
- 'inversion': MÁXIMO 2 palabras (ej: 'Fundamental', '1ra Inversión').
- 'pianoNotes': Notas individuales de la octava 3 a la 4, de grave a agudo (ej. C3, Eb3, G3, Bb3, D4).`;

    // Build target user prompt respecting key, scale, and tempo
    let targetPrompt = `Genera una progresión de exactamente ${count} acordes basada en el prompt: "${validated.prompt}".\n`;
    if (validated.key && validated.key !== "Automático") {
      targetPrompt += `- Tonalidad obligatoria: Debe estar estrictamente en la tonalidad de: ${validated.key}.\n`;
    }
    if (validated.scale && validated.scale !== "Automático") {
      targetPrompt += `- Escala/Modo obligatorio: Debe basarse en la escala o modo de: ${validated.scale}.\n`;
    }
    if (validated.tempo && validated.tempo !== "Automático" && validated.tempo.trim() !== "") {
      targetPrompt += `- Tempo (BPM) obligatorio: Debe sugerir exactamente: ${validated.tempo} BPM.\n`;
    }

    // 3. Generate structured JSON output using the recommended Vercel AI SDK generateText API with Output.object
    console.log(`Calling Vercel AI SDK generateText with Output.object for prompt (${count} chords):`, targetPrompt);
    
    try {
      const result = await generateText({
        model: provider,
        system: systemPrompt,
        prompt: targetPrompt,
        output: Output.object({
          schema: chordProgressionSchema,
        }),
      });

      return {
        success: true,
        data: result.output,
      };
    } catch (structuredError: any) {
      console.warn("La generación estructurada nativa (Output.object) falló, activando Fallback de Texto Resiliente:", structuredError);

      // FALLBACK: Generate plain text and parse the JSON manually
      const fallbackPrompt = `Genera una progresión de acordes basada en este prompt: "${targetPrompt}".
IMPORTANTE: Tu respuesta debe ser EXCLUSIVAMENTE un objeto JSON en bruto válido, sin bloques de código markdown ni texto adicional.

ESQUEMA A SEGUIR ESTRICTAMENTE:
{
  "name": "Nombre de la progresión",
  "description": "Descripción de MÁXIMO 8 palabras",
  "key": "Tonalidad (ej: C Minor)",
  "tempo": 80,
  "theoryExplanation": "Explicación teórica de la progresión (máx 60 palabras)",
  "chords": [
    {
      "chord": "Cm9",
      "duration": 4,
      "role": "Tónica",
      "romanNumeral": "i9",
      "suggestedScale": "C Dórica",
      "description": "Descripción de MÁXIMO 5 palabras",
      "voicing": "Drop 2",
      "inversion": "Fundamental",
      "pianoNotes": ["C3", "Eb3", "G3", "Bb3", "D4"]
    }
  ]
}

IMPORTANTE: Todo acorde generado DEBE incluir obligatoriamente la tónica (Root/Fundamental) del acorde dentro del array 'pianoNotes'. Por ejemplo, para Ebm9, 'pianoNotes' DEBE incluir la nota Eb (ej. Eb3 o Eb4). Queda estrictamente prohibido utilizar voicings 'Rootless' (sin tónica).
La nota más grave de 'pianoNotes' debe coincidir exactamente con 'inversion' (Fundamental = Tónica en el bajo, 1ra Inversión = Tercera en el bajo, 2da Inversión = Quinta en el bajo, 3ra Inversión = Séptima en el bajo).

Completa la progresión con EXACTAMENTE ${count} acordes hermosos y coherentes.`;

      let rawText = "";
      try {
        console.log("Activando Fallback de Texto Ultra-Resiliente sin restricciones de API JSON...");
        const textResult = await generateText({
          model: provider,
          system: systemPrompt,
          prompt: fallbackPrompt,
          // Sin parametro 'output': generacion de texto plano 100% universal e infalible
        });

        rawText = textResult.text || "";
        console.log("Texto devuelto por la IA en Fallback Ultra-Resiliente:", rawText);

        if (!rawText.trim()) {
          throw new Error("El modelo retorno una respuesta de texto vacia o nula.");
        }

        // Limpiar bloques de codigo de markdown si existen
        let cleanedJsonText = rawText.trim();
        if (cleanedJsonText.includes("```")) {
          // Extraer lo que hay entre triple comilla si hay bloques de codigo
          const match = cleanedJsonText.match(/```(?:json)?([\s\S]*?)```/);
          if (match && match[1]) {
            cleanedJsonText = match[1].trim();
          }
        }
        
        // Buscar el primer '{' y el ultimo '}' por si el modelo devolvio texto circundante
        const firstBrace = cleanedJsonText.indexOf("{");
        const lastBrace = cleanedJsonText.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanedJsonText = cleanedJsonText.slice(firstBrace, lastBrace + 1);
        } else {
          throw new Error("No se encontraron llaves JSON '{' o '}' en la respuesta del modelo.");
        }

        const parsedJson = JSON.parse(cleanedJsonText);
        
        // Validar el objeto contra el esquema de Zod
        const validatedData = chordProgressionSchema.parse(parsedJson);

        return {
          success: true,
          data: validatedData,
          debugInfo: "Generado exitosamente a traves del motor de Fallback de Texto Ultra-Resiliente.",
        };

      } catch (fallbackError: any) {
        console.error("Error en el fallback de generación estructurada:", fallbackError);
        
        // Escribir un archivo log de depuración local para el desarrollador
        try {
          const fs = require("fs");
          const path = require("path");
          const logPath = path.join(process.cwd(), "src/features/music-studio/chord-generator-debug.log");
          const logContent = `--- DEBUG LOG: ${new Date().toISOString()} ---\n` +
            `Error original: ${structuredError.message || String(structuredError)}\n` +
            `Error fallback: ${fallbackError.message || String(fallbackError)}\n` +
            `Texto crudo del LLM:\n${rawText}\n\n`;
          fs.appendFileSync(logPath, logContent, "utf-8");
        } catch (logWriteError) {
          console.error("No se pudo escribir el archivo debug.log:", logWriteError);
        }

        return {
          success: false,
          error: "No se pudo generar una salida estructurada válida.",
          debugInfo: `Error original: ${structuredError.message || String(structuredError)}\n\nError de fallback: ${fallbackError.message || String(fallbackError)}\n\n--- TEXTO CRUDO DEVUELTO POR LA IA ---\n${rawText || "(Respuesta vacía del LLM)"}`,
        };
      }
    }
  } catch (error: any) {
    console.warn("Error generating chord progression via AI. Activating premium offline fallback...", error);
    
    const lowerPrompt = validated.prompt.toLowerCase();
    let name = "Progresión Pop (Offline)";
    let description = "Secuencia pop-rock de contingencia.";
    let key = validated.key && validated.key !== "Automático" ? validated.key : "C Minor";
    let tempo = validated.tempo && validated.tempo !== "Automático" ? parseInt(validated.tempo, 10) || 80 : 80;
    let theoryExplanation = "Debido a que tus claves de API de Google/OpenAI son inválidas o están fuera de servicio, el motor ha compuesto offline esta progresión perfecta basada en tensiones estándar.";
    let chords = [];

    if (lowerPrompt.includes("triste") || lowerPrompt.includes("melancolic") || lowerPrompt.includes("menor") || key.toLowerCase().includes("minor") || key.toLowerCase().includes("menor")) {
      name = "Balada Neo-Soul Melancólica (Offline)";
      description = "Vibra menor sofisticada.";
      chords = [
        {
          chord: "Cm9",
          duration: 4,
          role: "Tónica",
          romanNumeral: "i9",
          suggestedScale: "C Dórica",
          description: "Establece el tono menor.",
          voicing: "Close",
          inversion: "Fundamental",
          pianoNotes: ["C3", "Eb3", "G3", "Bb3", "D4"]
        },
        {
          chord: "Fm9",
          duration: 4,
          role: "Subdominante",
          romanNumeral: "iv9",
          suggestedScale: "F Dórica",
          description: "Tensión y melancolía.",
          voicing: "Drop 2",
          inversion: "Fundamental",
          pianoNotes: ["F3", "Ab3", "C4", "Eb4", "G4"]
        },
        {
          chord: "Bb13",
          duration: 4,
          role: "Dominante Secundaria",
          romanNumeral: "bVII13",
          suggestedScale: "Bb Mixolidia",
          description: "Brillo intermedio.",
          voicing: "Close",
          inversion: "Fundamental",
          pianoNotes: ["Bb2", "D3", "Ab3", "C4", "G4"]
        },
        {
          chord: "Ebmaj9",
          duration: 4,
          role: "Mediante (Relativo Mayor)",
          romanNumeral: "bIIImaj9",
          suggestedScale: "Eb Jónica",
          description: "Resolución esperanzadora.",
          voicing: "Close",
          inversion: "Fundamental",
          pianoNotes: ["Eb3", "G3", "Bb3", "D4", "F4"]
        }
      ];
    } else if (lowerPrompt.includes("jazz") || lowerPrompt.includes("ii-v-i") || lowerPrompt.includes("sofisticad")) {
      name = "Jazz ii-V-I Standard (Offline)";
      description = "Armonía jazzística de lujo.";
      chords = [
        {
          chord: "Dm9",
          duration: 4,
          role: "Supertónica",
          romanNumeral: "ii9",
          suggestedScale: "D Dórica",
          description: "Inicio del ciclo.",
          voicing: "Close",
          inversion: "Fundamental",
          pianoNotes: ["D3", "F3", "A3", "C4", "E4"]
        },
        {
          chord: "G7(b9)",
          duration: 4,
          role: "Dominante",
          romanNumeral: "V7b9",
          suggestedScale: "G Alterada",
          description: "Tensión máxima.",
          voicing: "Drop 2",
          inversion: "Fundamental",
          pianoNotes: ["G3", "B3", "F4", "Ab4"]
        },
        {
          chord: "Cmaj9",
          duration: 4,
          role: "Tónica",
          romanNumeral: "Imaj9",
          suggestedScale: "C Jónica",
          description: "Resolución placentera.",
          voicing: "Close",
          inversion: "Fundamental",
          pianoNotes: ["C3", "E3", "G3", "B3", "D4"]
        },
        {
          chord: "A7(b9)",
          duration: 4,
          role: "Dominante Secundaria",
          romanNumeral: "VI7b9",
          suggestedScale: "A Alterada",
          description: "Retorno al ciclo.",
          voicing: "Close",
          inversion: "Fundamental",
          pianoNotes: ["A2", "C#3", "G3", "Bb3"]
        }
      ];
    } else {
      name = "Balada Pop Brillante (Offline)";
      description = "Armonía pop dulce.";
      chords = [
        {
          chord: "Cmaj9",
          duration: 4,
          role: "Tónica",
          romanNumeral: "Imaj9",
          suggestedScale: "C Jónica",
          description: "Tónica inicial.",
          voicing: "Close",
          inversion: "Fundamental",
          pianoNotes: ["C3", "E3", "G3", "B3", "D4"]
        },
        {
          chord: "Am9",
          duration: 4,
          role: "Submediante",
          romanNumeral: "vi9",
          suggestedScale: "A Eólica",
          description: "Profundidad menor.",
          voicing: "Close",
          inversion: "Fundamental",
          pianoNotes: ["A2", "C3", "E3", "G3", "B3"]
        },
        {
          chord: "Dm9",
          duration: 4,
          role: "Supertónica",
          romanNumeral: "ii9",
          suggestedScale: "D Dórica",
          description: "Transición a dominante.",
          voicing: "Close",
          inversion: "Fundamental",
          pianoNotes: ["D3", "F3", "A3", "C4", "E4"]
        },
        {
          chord: "G13",
          duration: 4,
          role: "Dominante",
          romanNumeral: "V13",
          suggestedScale: "G Mixolidia",
          description: "Tensión alegre.",
          voicing: "Drop 2",
          inversion: "Fundamental",
          pianoNotes: ["G2", "B3", "F4", "E4"]
        }
      ];
    }

    return {
      success: true,
      data: {
        name,
        description,
        key,
        tempo,
        theoryExplanation,
        chords
      },
      debugInfo: `Generación Offline de Contingencia activa debido a: ${error.message || String(error)}`
    };
  }
}
