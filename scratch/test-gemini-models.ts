import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

async function testModel(modelName: string) {
  const googleKey = process.env.AI_GATEWAY_API_KEY;
  if (!googleKey) {
    console.error("No API key found!");
    return;
  }

  const google = createGoogleGenerativeAI({ apiKey: googleKey });

  try {
    console.log(`Probando modelo: ${modelName}...`);
    const result = await generateText({
      model: google(modelName),
      prompt: "Di hola en una palabra.",
      timeout: 10000,
    });
    console.log(`✅ ${modelName} funciona! Respuesta:`, result.text.trim());
  } catch (err: any) {
    console.error(`❌ ${modelName} falló:`, err.message);
  }
}

async function main() {
  const models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp"
  ];

  for (const model of models) {
    await testModel(model);
    console.log("-".repeat(40));
  }
}

main().catch(console.error);
