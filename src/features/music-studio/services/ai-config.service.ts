import prisma from "@/lib/prisma";
import { AiConfigInput } from "../schemas/ai-config.schema";

export class AiConfigService {
  static async getConfigs() {
    return await prisma.aiSetting.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  static async getActiveConfig() {
    return await prisma.aiSetting.findFirst({
      where: { isActive: true },
    });
  }

  static async saveConfig(data: AiConfigInput) {
    // If this config is set to active, deactivate others
    if (data.isActive) {
      await prisma.aiSetting.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    // Upsert based on provider
    return await prisma.aiSetting.upsert({
      where: { provider: data.provider },
      update: {
        apiKey: data.apiKey,
        modelId: data.modelId,
        baseUrl: data.baseUrl,
        isActive: data.isActive,
      },
      create: {
        provider: data.provider,
        apiKey: data.apiKey,
        modelId: data.modelId,
        baseUrl: data.baseUrl,
        isActive: data.isActive,
      },
    });
  }

  static async deleteConfig(id: string) {
    return await prisma.aiSetting.delete({
      where: { id },
    });
  }
}
