import { getSession } from "@/proxy";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, ListMusic, Sliders, Sparkles, Cpu, FolderOpen, Headphones, Zap } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Estudio Creativo - MusicLab",
  description: "Bienvenido a tu estación de control creativo de composición musical asistida por IA.",
};

export default async function AdminPage() {
  const session = await getSession();
  if (!session) return null;

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Premium Creative Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/10 p-8 shadow-sm">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Estudio Creativo Activo
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Hola, {session.user.name} 👋
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              Bienvenido a tu suite de producción y composición asistida por Inteligencia Artificial. Estructura canciones, dibuja progresiones armónicas y sincroniza tus sintetizadores externos en tiempo real.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 bg-card/65 border border-border/60 p-4 rounded-2xl backdrop-blur-sm shadow-inner">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-xl font-black">
              {session.user.name?.[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{session.user.name}</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-wider">
                {session.user.role || "Compositor"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Studio Tools Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tool 1: Organizador de Canciones */}
        <Card className="border border-border/80 shadow-md rounded-3xl bg-card/40 hover:bg-card/75 transition-all duration-300 hover:border-primary/20 group relative overflow-hidden flex flex-col justify-between min-h-[250px]">
          <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
          <CardHeader className="pb-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform group-hover:scale-105 duration-300">
              <ListMusic className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold">Organizador de Canciones</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Estructura piezas musicales completas de forma modular. Genera intros, coros y versos con progresiones de acordes alineadas a tus intenciones emocionales mediante IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <Link href="/dashboard/song-generator" passHref>
              <Button className="w-full rounded-xl gap-2 font-bold shadow-md shadow-primary/15 transition-all hover:scale-[1.01]">
                Abrir Organizador
                <Zap className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Tool 2: Generador Armónico */}
        <Card className="border border-border/80 shadow-md rounded-3xl bg-card/40 hover:bg-card/75 transition-all duration-300 hover:border-primary/20 group relative overflow-hidden flex flex-col justify-between min-h-[250px]">
          <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
          <CardHeader className="pb-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform group-hover:scale-105 duration-300">
              <Music className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold">Generador Armónico Estructurado</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Compón progresiones de acordes únicas y analiza la conducción de voces en el teclado interactivo utilizando la generación estructurada de objetos JSON del Vercel AI SDK.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <Link href="/dashboard/chord-generator" passHref>
              <Button variant="secondary" className="w-full rounded-xl gap-2 font-bold transition-all hover:scale-[1.01] hover:bg-muted/80">
                Componer Acordes
                <Sparkles className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Studio Analytics and IA Settings Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Metric 1: Proyectos */}
        <div className="p-6 rounded-2xl border border-border bg-card/20 backdrop-blur-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Proyectos del Estudio</p>
            <p className="text-xl font-extrabold tracking-tight">Biblioteca Local Activa</p>
          </div>
        </div>

        {/* Metric 2: Sound engine status */}
        <div className="p-6 rounded-2xl border border-border bg-card/20 backdrop-blur-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Motor de Audio</p>
            <p className="text-xl font-extrabold tracking-tight flex items-center gap-1.5">
              Polifónico 4 presets
            </p>
          </div>
        </div>

        {/* Action Card: IA Preferences */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card/45 hover:bg-card/85 transition-all duration-300 hover:border-primary/20 flex flex-col justify-between group gap-4 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Preferencias</p>
              <p className="text-sm font-bold tracking-tight">Motor de Inferencia IA</p>
            </div>
          </div>
          <Link href="/dashboard/settings" passHref className="w-full">
            <Button variant="outline" size="sm" className="w-full rounded-xl gap-1 text-xs">
              <Cpu className="w-3.5 h-3.5" />
              Configurar Proveedor
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
