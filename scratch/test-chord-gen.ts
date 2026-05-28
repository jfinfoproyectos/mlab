import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

import { generateChordProgressionAction } from "../src/features/chord-generator/actions/chord-generator.actions";

async function main() {
  console.log("Generando progresión de acordes...");
  const result = await generateChordProgressionAction({
    prompt: "Textura suspendida y lenta de dos acordes para establecer el tono menor. Sección: Intro de la obra de piano Exploración en Pixeles de Selva",
    key: "E Mixolydian",
    scale: "Mixolydian",
    tempo: "80",
    chordCount: 16
  });

  console.log("Resultado:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
