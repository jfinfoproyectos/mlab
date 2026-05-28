import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMinimax } from "vercel-minimax-ai-provider";
import { AiConfigService } from "./ai-config.service";

function sanitizeModelId(provider: string, modelId: string | null | undefined): string {
  if (!modelId || modelId.trim() === "") {
    if (provider === "google") return "gemini-2.5-flash";
    if (provider === "openai") return "gpt-4o";
    if (provider === "anthropic") return "claude-3-5-sonnet-20240620";
    if (provider === "minimax") return "MiniMax-M2.7";
    return "";
  }
  return modelId.trim();
}

function sanitizeBaseUrl(provider: string, baseUrl: string | null | undefined): string | undefined {
  if (!baseUrl) return undefined;
  const url = baseUrl.trim();
  if (provider === "google" && url.includes("openai.com")) {
    // Ignore OpenAI base URL if used mistakenly under Google provider
    return undefined;
  }
  return url || undefined;
}

export async function getActiveAiProvider() {
  // 1. Try to get the active config from the database
  let config = null;
  try {
    config = await AiConfigService.getActiveConfig();
  } catch (dbError: any) {
    console.warn(
      "Database unavailable, attempting environment variable fallback:",
      dbError?.message
    );
  }

  // 2. If DB config exists, use it
  if (config) {
    const sanitizedModel = sanitizeModelId(config.provider, config.modelId);
    const sanitizedBaseUrl = sanitizeBaseUrl(config.provider, config.baseUrl);

    switch (config.provider) {
      case "openai": {
        const openai = createOpenAI({
          apiKey: config.apiKey,
          baseURL: sanitizedBaseUrl,
        });
        return openai(sanitizedModel);
      }
      case "anthropic": {
        const anthropic = createAnthropic({
          apiKey: config.apiKey,
          baseURL: sanitizedBaseUrl,
        });
        return anthropic(sanitizedModel);
      }
      case "google": {
        const google = createGoogleGenerativeAI({
          apiKey: config.apiKey,
          baseURL: sanitizedBaseUrl,
        });
        return google(sanitizedModel);
      }
      case "minimax": {
        const minimax = createMinimax({
          apiKey: config.apiKey,
          baseURL: sanitizedBaseUrl,
        });
        return minimax(sanitizedModel);
      }
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  // 3. Fallback: use environment variables directly
  //    Supports MINIMAX_API_KEY (MiniMax), AI_GATEWAY_API_KEY (Google), 
  //    GOOGLE_GENERATIVE_AI_API_KEY, OPENAI_API_KEY, and ANTHROPIC_API_KEY
  const minimaxKey = process.env.MINIMAX_API_KEY;
  if (minimaxKey) {
    console.info("Using MiniMax from environment variable (MINIMAX_API_KEY).");
    const minimax = createMinimax({ apiKey: minimaxKey });
    return minimax("MiniMax-M2.7");
  }

  const googleKey =
    process.env.AI_GATEWAY_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (googleKey) {
    console.info("Using Google Gemini from environment variable (AI_GATEWAY_API_KEY).");
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    return google("gemini-2.5-flash");
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    console.info("Using OpenAI from environment variable (OPENAI_API_KEY).");
    const openai = createOpenAI({ apiKey: openaiKey });
    return openai("gpt-4o");
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    console.info("Using Anthropic from environment variable (ANTHROPIC_API_KEY).");
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    return anthropic("claude-3-5-sonnet-20240620");
  }

  throw new Error(
    "No active AI provider configured. Please set up a provider in Settings or add AI_GATEWAY_API_KEY to your .env file."
  );
}
