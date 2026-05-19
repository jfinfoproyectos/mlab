"use server";

import { generateText, generateObject } from "ai";
import { getActiveAiProvider } from "../services/ai-provider.service";
import { z } from "zod";

const rhythmPatternSchema = z.object({
  name: z.string().describe("Nombre creativo del patrón"),
  steps: z.array(z.array(z.boolean())).describe("Una matriz de 5 filas y 16 pasos booleanos"),
});

export interface GenerateRhythmResult {
  success: boolean;
  name?: string;
  steps?: boolean[][];
  error?: string;
}

export async function generateRhythmPatternAction(prompt: string): Promise<GenerateRhythmResult> {
  if (!prompt || prompt.trim() === "") {
    return { success: false, error: "El prompt es obligatorio." };
  }

  try {
    const provider = await getActiveAiProvider();

    const systemPrompt = `Eres un percusionista y programador de ritmos MIDI de clase mundial.
Tu tarea es programar un patrón rítmico profesional y con groove en una cuadrícula de 5 filas y 16 pasos (compás de 4/4 dividido en semicorcheas, de paso 0 a 15).
Las 5 filas representan los siguientes registros musicales (de abajo hacia arriba, índice 0 a 4):
- Fila 0 (Bajo / Grave): Línea de bajo y acentos rítmicos graves.
- Fila 1 (Tenor): Notas de compresión media baja.
- Fila 2 (Voz Media): Relleno armónico intermedio.
- Fila 3 (Tercera): Notas de armonía y contrapuntos.
- Fila 4 (Melodía / Agudo): Acentos agudos y melodías sincopadas.

Debes devolver un objeto JSON con:
1. 'name': Un nombre creativo y descriptivo para el patrón.
2. 'steps': Una matriz de 5 filas, donde cada fila tiene EXACTAMENTE 16 valores booleanos (true para nota activa, false para silencio).

REGLAS DE GROOVE PROFESIONAL:
- Si el usuario pide un género como 'Reggaeton' o 'Dembow': La Fila 0 (Bajo) debe tener golpes sincopados clásicos del Dembow (ej: pasos 0, 3, 8, 11) y la Fila 4 (Agudo) debe complementar con contratiempos.
- Si el usuario pide 'Funk': Debe ser un patrón sincopado muy activo, con notas en la Fila 0 (Bajo) y adornos rápidos en la Fila 4 (Agudo).
- Si el usuario pide 'House' o 'EDM': Fila 0 debe ser golpes constantes 4-on-the-floor (pasos 0, 4, 8, 12) y las otras filas rellenar rítmicamente.
- Si el usuario pide 'Cumbia': Debe tener el contratiempo clásico cumbiero.
- ASEGÚRATE de que cada una de las 5 filas tenga EXACTAMENTE 16 booleanos. No agregues más de 16 pasos por fila ni menos de 16.`;

    const userPrompt = `Genera un patrón rítmico creativo y profesional de 16 pasos basado en la siguiente instrucción de estilo: "${prompt}"`;

    try {
      const result = await generateObject({
        model: provider,
        schema: rhythmPatternSchema,
        system: systemPrompt,
        prompt: userPrompt,
      });

      const steps = result.object.steps;
      if (!steps || steps.length !== 5 || steps.some(row => row.length !== 16)) {
        throw new Error("La cuadrícula generada no tiene las dimensiones correctas (5x16).");
      }

      return {
        success: true,
        name: result.object.name,
        steps: steps,
      };
    } catch (err: any) {
      console.warn("Rhythm generation structured output failed, running fallback parser:", err);
      
      const fallbackPrompt = `${userPrompt}
IMPORTANTE: Tu respuesta debe ser EXCLUSIVAMENTE un objeto JSON en bruto válido, sin bloques de código markdown ni texto adicional.
Esquema:
{
  "name": "Nombre",
  "steps": [
    [true, false, ...], // Fila 0 (16 booleanos)
    [true, false, ...], // Fila 1 (16 booleanos)
    [true, false, ...], // Fila 2 (16 booleanos)
    [true, false, ...], // Fila 3 (16 booleanos)
    [true, false, ...]  // Fila 4 (16 booleanos)
  ]
}`;

      const textResult = await generateText({
        model: provider,
        system: systemPrompt,
        prompt: fallbackPrompt,
      });

      const cleanJson = textResult.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      
      if (!parsed.steps || parsed.steps.length !== 5 || parsed.steps.some((row: any) => row.length !== 16)) {
        throw new Error("El fallback JSON no tiene las dimensiones 5x16.");
      }

      return {
        success: true,
        name: parsed.name || "Patrón Personalizado IA",
        steps: parsed.steps,
      };
    }

  } catch (error: any) {
    console.warn("Error generating rhythm pattern via AI. Activating premium dynamic offline composer...", error);
    
    const lowerPrompt = prompt.toLowerCase();
    let name = "Groove Pop/Rock (Offline)";
    let steps = Array(5).fill(null).map(() => Array(16).fill(false));

    // A simple deterministic hash function from the prompt string
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      hash = prompt.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Helper to check if a step should be active based on hash, instrument probability, and beat structure
    const getStepVal = (instrumentIdx: number, stepIdx: number, density: number) => {
      // Keep a strong musical structure: beats 1 and 3 are stronger
      const isBeat1Or3 = stepIdx === 0 || stepIdx === 8;
      const isBeat2Or4 = stepIdx === 4 || stepIdx === 12;

      // Modify density based on instrument
      let prob = density;
      if (instrumentIdx === 0) { // Bass/Kick
        if (isBeat1Or3) return true; // Keep downbeats solid
        if (isBeat2Or4) prob = 0.1;
        else prob = 0.25;
      } else if (instrumentIdx === 1) { // Tenor (Snare/Clap)
        if (isBeat2Or4) return true; // Standard backbeat
        prob = 0.08;
      } else if (instrumentIdx === 4) { // Agudo (Hat)
        if (stepIdx % 2 === 0) return true; // Standard 8th notes
        prob = 0.45;
      } else { // Mid voices
        prob = 0.2;
      }

      // Deterministic pseudo-random check based on hash and step coordinates
      const val = Math.abs(Math.sin(hash + instrumentIdx * 43 + stepIdx * 17));
      return val < prob;
    };

    if (lowerPrompt.includes("dembow") || lowerPrompt.includes("reggaeton") || lowerPrompt.includes("urbano")) {
      name = "Dembow Sincopado (Offline)";
      // Kick/Bass
      steps[0] = [true, false, false, true, false, false, true, false, true, false, false, true, false, false, true, false];
      // Tenor (Snare/Clap)
      steps[1] = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
      // Voice
      steps[2] = [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
      // Agudo
      steps[4] = [false, false, true, false, false, true, false, true, false, false, true, false, false, true, false, true];

      // Add small hash-based fills
      for (let c = 0; c < 16; c++) {
        if (c % 4 !== 0 && c % 3 !== 0) {
          const val = Math.abs(Math.sin(hash + c * 29));
          if (val < 0.25) steps[3][c] = true; // add some high harmony accents
        }
      }
    } else if (lowerPrompt.includes("house") || lowerPrompt.includes("edm") || lowerPrompt.includes("techno") || lowerPrompt.includes("dance")) {
      name = "House 4-on-the-Floor (Offline)";
      // Kick/Bass
      steps[0] = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
      // Tenor (Hat)
      steps[1] = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
      // Voice
      steps[2] = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
      // Agudo
      steps[4] = [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false];

      // Add dynamic hi-hat accents based on hash
      for (let c = 0; c < 16; c++) {
        if (c % 2 !== 0) {
          const val = Math.abs(Math.sin(hash + c * 31));
          if (val < 0.35) steps[4][c] = true;
        }
      }
    } else if (lowerPrompt.includes("rock") || lowerPrompt.includes("metal") || lowerPrompt.includes("pesado") || lowerPrompt.includes("heavy")) {
      name = `Heavy Rock Groove (Offline)`;
      // Punchy rock beat
      steps[0] = [true, false, false, false, false, false, false, true, true, false, false, false, false, false, true, false]; // Double kick
      steps[1] = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false]; // Snare on 2 and 4
      steps[4] = [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false]; // Constant hats
      
      // Add custom variations based on hash (Kick double bass drum action or snare ghost notes!)
      for (let c = 0; c < 16; c++) {
        const kickVal = Math.abs(Math.sin(hash + c * 13));
        const snareVal = Math.abs(Math.sin(hash + c * 19));
        const tomVal = Math.abs(Math.sin(hash + c * 37));

        if (c % 4 !== 0 && c % 4 !== 2) {
          if (kickVal < 0.28) steps[0][c] = true; // extra kick accents!
          if (snareVal < 0.15) steps[1][c] = true; // ghost snares!
        }
        if (tomVal < 0.22) steps[2][c] = true; // tom accents!
        if (tomVal > 0.8) steps[3][c] = true; // cymbal accents!
      }
    } else if (lowerPrompt.includes("funk") || lowerPrompt.includes("groove") || lowerPrompt.includes("disco")) {
      name = `Funk Sincopado (Offline)`;
      steps[0] = [true, false, false, false, false, false, true, false, false, true, false, false, false, false, true, false];
      steps[1] = [false, false, true, false, true, false, false, false, false, false, true, false, true, false, false, false];
      steps[2] = [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
      steps[3] = [false, false, false, true, false, false, false, false, false, false, false, true, false, false, false, false];
      steps[4] = [true, false, true, false, false, true, false, true, true, false, true, false, false, true, false, true];

      // Dynamic funk additions
      for (let c = 0; c < 16; c++) {
        const val = Math.abs(Math.sin(hash + c * 47));
        if (val < 0.25) steps[4][c] = true; // extra hats
        if (val > 0.85) steps[2][c] = true; // extra ghost fills
      }
    } else if (lowerPrompt.includes("cumbia") || lowerPrompt.includes("tropical") || lowerPrompt.includes("salsa")) {
      name = "Ritmo Tropical/Cumbia (Offline)";
      steps[0] = [true, false, false, false, false, false, true, false, true, false, false, false, false, false, true, false];
      steps[1] = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
      steps[2] = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
      steps[4] = [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true];

      for (let c = 0; c < 16; c++) {
        const val = Math.abs(Math.sin(hash + c * 23));
        if (val < 0.25) steps[3][c] = true; // conga accents!
      }
    } else if (lowerPrompt.includes("rap") || lowerPrompt.includes("hiphop") || lowerPrompt.includes("lofi") || lowerPrompt.includes("trap")) {
      name = `Hip-Hop Beat (Offline)`;
      steps[0] = [true, false, false, false, false, false, false, true, false, true, false, false, false, false, false, false];
      steps[1] = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
      steps[4] = [true, false, true, true, true, false, true, false, true, false, true, true, true, false, true, false];
      
      // Add trap hats or boom bap ghost hits based on prompt
      const isTrap = lowerPrompt.includes("trap");
      for (let c = 0; c < 16; c++) {
        const val = Math.abs(Math.sin(hash + c * 59));
        if (isTrap) {
          if (val < 0.6) steps[4][c] = true; // rapid hihat roll!
        } else {
          if (val < 0.15) steps[2][c] = true; // swingy lazy fills
        }
      }
    } else {
      // General custom prompt generator
      name = `Groove Personalizado (Offline)`;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 16; c++) {
          steps[r][c] = getStepVal(r, c, 0.28);
        }
      }
    }

    return {
      success: true,
      name: `${name}`,
      steps: steps,
    };
  }
}
