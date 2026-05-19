import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ArrowRightIcon, 
  MusicIcon, 
  SparklesIcon, 
  ZapIcon,
  DiscIcon
} from "lucide-react";

export const metadata = {
  title: "MusicLab - Composición y Secuenciación Inteligente Asistida por IA",
  description: "Estudio de producción musical asistido por Inteligencia Artificial. Estructura canciones, crea acordes con Vercel AI SDK y sincroniza hardware vía MIDI.",
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md supports-[backdrop-filter]:bg-zinc-950/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Image 
                src="/logo.png" 
                alt="MusicLab Logo" 
                width={24} 
                height={24} 
                className="object-contain rounded-sm"
              />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              MusicLab
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-900">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="rounded-full px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/15 transition-all hover:scale-105 active:scale-95">
                Comenzar Gratis
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32 lg:py-40">
          <div className="container relative z-10 px-4 md:px-8 text-center max-w-4xl mx-auto space-y-8 animate-in fade-in duration-1000">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4.5 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-400">
              <SparklesIcon className="size-3.5" />
              Estación de Trabajo Musical Asistida por IA
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-[1.1]">
              Compón música con el <br /> poder de la Inteligencia Artificial.
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-400 leading-relaxed max-w-2xl mx-auto">
              MusicLab es el estudio definitivo de composición asistida por IA. Estructura canciones de forma modular, genera progresiones de acordes perfectas con Vercel AI SDK y sincroniza tus sintetizadores externos vía MIDI.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/sign-in">
                <Button size="lg" className="h-14 px-8 rounded-2xl text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl shadow-emerald-500/20 hover:scale-105 transition-all group">
                  Entrar al Estudio Creativo
                  <ArrowRightIcon className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg" className="h-14 px-8 rounded-2xl text-lg font-bold border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900 transition-colors">
                  Ver Demostración
                </Button>
              </Link>
            </div>
          </div>

          {/* Glowing Ambient Background Orbs */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-full h-full pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-[140px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 border-t border-zinc-900 bg-zinc-950/50">
          <div className="container px-4 md:px-8 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-8 rounded-3xl bg-zinc-900/40 border border-zinc-900 shadow-lg space-y-4 hover:border-emerald-500/20 hover:bg-zinc-900/60 transition-all group">
                <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <MusicIcon className="size-6" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">Estructurador Armónico</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Crea progresiones armónicas ricas y expresivas para tu intro, coros y puentes musicales basándote en intenciones emocionales con inferencia IA estructurada.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-3xl bg-zinc-900/40 border border-zinc-900 shadow-lg space-y-4 hover:border-emerald-500/20 hover:bg-zinc-900/60 transition-all group">
                <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <DiscIcon className="size-6" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">Secuenciador y Piano Roll</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Dibuja y programa secuencias rítmicas personalizadas utilizando un piano roll interactivo polifónico o genera patrones mediante IA de última generación.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-3xl bg-zinc-900/40 border border-zinc-900 shadow-lg space-y-4 hover:border-emerald-500/20 hover:bg-zinc-900/60 transition-all group">
                <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <ZapIcon className="size-6" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">Sincronización Web MIDI</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Conecta y envía notas o acordes en tiempo real a sintetizadores físicos externos, teclados o DAWs directamente desde tu navegador en un clic.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-900 py-12 bg-zinc-950">
        <div className="container px-4 md:px-8 max-w-7xl mx-auto text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Image src="/logo.png" alt="MusicLab" width={20} height={20} className="rounded-sm" />
            <span className="font-bold text-zinc-300">MusicLab Studio</span>
          </div>
          <p className="text-xs text-zinc-500">© 2026 MusicLab Inc. Todos los derechos reservados. Composición y secuenciación inteligente polifónica.</p>
        </div>
      </footer>
    </div>
  );
}
