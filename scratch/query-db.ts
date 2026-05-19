import dotenv from "dotenv";
import path from "path";

// Load environment variables before importing prisma
dotenv.config({ path: path.join(__dirname, "../.env") });

import prisma from "../src/lib/prisma";

async function main() {
  const configs = await prisma.aiSetting.findMany();
  console.log("=== AI SETTINGS IN DB ===");
  configs.forEach((c: any) => {
    console.log({
      id: c.id,
      provider: c.provider,
      apiKeyPrefix: c.apiKey ? c.apiKey.substring(0, 8) + "..." : "none",
      modelId: c.modelId,
      baseUrl: c.baseUrl,
      isActive: c.isActive,
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
