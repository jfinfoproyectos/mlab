import { getSession } from "@/proxy";
import { SongGenerator } from "@/features/music-studio";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Organizador de Canciones Inteligente - MusicLab",
  description: "Estructura canciones completas con progresiones de acordes generadas de forma autónoma por secciones con IA.",
};

export default async function AdminSongGeneratorPage() {
  const session = await getSession();
  
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <SongGenerator />
    </div>
  );
}
