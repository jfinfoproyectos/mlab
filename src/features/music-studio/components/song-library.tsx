"use client";

import { 
  FolderOpen, 
  Sparkles, 
  Trash2, 
  Download, 
  Play 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { SongStructure } from "../schemas/song-generator.schema";

interface SongLibraryProps {
  isLoadingSongs: boolean;
  savedSongs: SongStructure[];
  setActiveTab: (tab: string) => void;
  handleDeleteSong: (id: string, e: React.MouseEvent) => Promise<void> | void;
  onLoadSong: (song: SongStructure) => void;
}

export function SongLibrary({
  isLoadingSongs,
  savedSongs,
  setActiveTab,
  handleDeleteSong,
  onLoadSong
}: SongLibraryProps) {
  return (
    <div className="space-y-6">
      {isLoadingSongs ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <span className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-bold animate-pulse">Cargando biblioteca de MusicLab...</p>
        </div>
      ) : savedSongs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-dashed border-border bg-card/25 backdrop-blur-sm p-8 space-y-4">
          <div className="p-4 bg-primary/10 rounded-full text-primary">
            <FolderOpen className="w-10 h-10 animate-bounce" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-xl font-bold">Sin proyectos guardados</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              No se encontraron canciones guardadas en tu cuenta de MusicLab. Ve a la <strong>Mesa de Composición</strong> para crear tu primera obra de arte armónica.
            </p>
            <Button onClick={() => setActiveTab("estudio")} className="rounded-xl mt-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Empezar a Componer
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {savedSongs.map((song) => {
            const sectionNames = song.sections.map(s => s.type).join(" ➔ ");
            return (
              <Card 
                key={song.id}
                className="group relative border-border bg-card/30 hover:bg-card/50 transition-all duration-300 rounded-3xl flex flex-col justify-between overflow-hidden shadow-md hover:scale-[1.02] hover:border-primary/20 hover:shadow-primary/5 min-h-[260px]"
              >
                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        {song.genre}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Sincronizada
                      </span>
                    </div>
                    <h4 className="text-xl font-black tracking-tight text-foreground truncate pt-1">
                      {song.title}
                    </h4>
                    <p className="text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed italic h-8" title={song.description}>
                      "{song.description}"
                    </p>
                  </div>

                  {/* Music Metadata Badges */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-[10px] font-semibold text-muted-foreground">
                      Tono: {song.key}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-[10px] font-semibold text-muted-foreground">
                      Tempo: {song.tempo} BPM
                    </span>
                  </div>

                  {/* Sections outline */}
                  <div className="space-y-1 pt-1">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      Estructura de Secciones
                    </div>
                    <div className="text-[10px] text-primary/95 font-semibold truncate bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
                      {sectionNames}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="px-5 py-4 border-t border-border/40 bg-muted/20 flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleDeleteSong(song.id!, e)}
                    className="rounded-xl text-xs hover:bg-destructive/10 hover:text-destructive text-muted-foreground h-9 px-3 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(song, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `musiclab_song_${song.title.toLowerCase().replace(/\s+/g, "_")}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                      toast.success("¡JSON de canción exportado!");
                    }}
                    className="rounded-xl text-xs border-border hover:bg-muted h-9 px-3 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    Exportar
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => onLoadSong(song)}
                    className="rounded-xl text-xs font-bold shadow-sm h-9 px-3.5 flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Cargar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
