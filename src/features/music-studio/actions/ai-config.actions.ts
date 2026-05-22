"use server";

import { revalidatePath } from "next/cache";
import { AiConfigService } from "../services/ai-config.service";
import { aiConfigSchema, AiConfigInput } from "../schemas/ai-config.schema";

export async function saveAiConfigAction(data: AiConfigInput) {
  const validated = aiConfigSchema.parse(data);
  
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout: La base de datos tardó demasiado en responder.")), 15000)
    );
    
    await Promise.race([
      AiConfigService.saveConfig(validated),
      timeoutPromise
    ]);

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save AI config:", error);
    return { success: false, error: error.message || "Failed to save configuration" };
  }
}

export async function deleteAiConfigAction(id: string) {
  try {
    await AiConfigService.deleteConfig(id);
    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete AI config:", error);
    return { success: false, error: "Failed to delete configuration" };
  }
}
