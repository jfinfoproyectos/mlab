"use server";

import { revalidatePath } from "next/cache";
import { AiConfigService } from "../services/ai-config.service";
import { aiConfigSchema, AiConfigInput } from "../schemas/ai-config.schema";

export async function saveAiConfigAction(data: AiConfigInput) {
  const validated = aiConfigSchema.parse(data);
  
  try {
    await AiConfigService.saveConfig(validated);
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to save AI config:", error);
    return { success: false, error: "Failed to save configuration" };
  }
}

export async function deleteAiConfigAction(id: string) {
  try {
    await AiConfigService.deleteConfig(id);
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete AI config:", error);
    return { success: false, error: "Failed to delete configuration" };
  }
}
