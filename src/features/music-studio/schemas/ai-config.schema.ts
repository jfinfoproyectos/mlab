import { z } from "zod";

export const aiConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "minimax"]),
  apiKey: z.string().min(1, "API Key is required"),
  modelId: z.string().optional(),
  baseUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  isActive: z.boolean(),
});

export type AiConfigInput = z.infer<typeof aiConfigSchema>;
