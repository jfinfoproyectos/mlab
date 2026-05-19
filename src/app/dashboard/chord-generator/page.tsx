import { getSession } from "@/proxy";
import { ChordGenerator } from "@/features/music-studio";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Generador de Acordes IA - MusicLab",
  description: "Crea y analiza progresiones de acordes estructuradas basadas en inteligencia artificial utilizando Vercel AI SDK.",
};

export default async function AdminChordGeneratorPage() {
  const session = await getSession();
  
  if (!session) {
    redirect("/sign-in");
  }



  return (
    <div className="flex flex-col gap-6 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Generador de Acordes IA</h1>
        <p className="text-muted-foreground text-sm">
          Compón y extrae progresiones de acordes con salida estructurada JSON precisa.
        </p>
      </div>
      
      <ChordGenerator />
    </div>
  );
}
