import { getSession } from "@/proxy";
import { SongGenerator } from "@/features/song-composer";
import { AiConfigService } from "@/features/ai-assistant";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';
export const metadata = {
  title: "Organizador de Canciones Inteligente - MusicLab",
  description: "Estructura canciones completas con progresiones de acordes generadas de forma autónoma por secciones con IA.",
};

export const maxDuration = 60; // Allow enough time for complex AI generations

export default async function AdminSongGeneratorPage() {
  const session = await getSession();
  
  if (!session) {
    redirect("/sign-in");
  }

  const aiConfigs = await AiConfigService.getConfigs();

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300 overflow-hidden h-full">
      <SongGenerator initialConfigs={aiConfigs} />
    </div>
  );
}
