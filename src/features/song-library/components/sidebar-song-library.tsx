"use client";

import React from "react";
import { FolderOpen, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SongStructure } from '@/features/song-composer/schemas/song-generator.schema';

interface SidebarSongLibraryProps {
  savedSongs: SongStructure[];
  isLoadingSongs: boolean;
  activeSong: SongStructure | null;
  onSelectSong: (song: SongStructure) => void;
  onDeleteSong: (id: string, e: React.MouseEvent) => void;
}

export function SidebarSongLibrary({
  savedSongs,
  isLoadingSongs,
  activeSong,
  onSelectSong,
  onDeleteSong
}: SidebarSongLibraryProps) {
  return (
    <Card className="border-border shadow-sm rounded-2xl bg-card/45 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <FolderOpen className="w-4.5 h-4.5 text-primary" />
          Biblioteca Rápida ({savedSongs.length})
        </CardTitle>
        <CardDescription className="text-[11px]">
          Abre rápidamente tus composiciones más recientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {isLoadingSongs ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
            <span className="w-4.5 h-4.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Cargando biblioteca...
          </div>
        ) : savedSongs.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            No tienes canciones guardadas todavía.
          </div>
        ) : (
          <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto pr-1">
            {savedSongs.slice(0, 5).map((song) => (
              <div
                key={song.id}
                onClick={() => onSelectSong(song)}
                className={`group flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all duration-200 ${
                  activeSong?.id === song.id 
                    ? "bg-primary/10 border-primary/30 text-primary font-semibold" 
                    : "bg-muted/20 border-border/30 hover:bg-muted/50 text-foreground"
                }`}
              >
                <div className="min-w-0 flex-1 pl-1">
                  <p className="truncate text-[11px] font-bold">{song.title}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{song.genre}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => onDeleteSong(song.id!, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive p-1 rounded transition-all duration-200 shrink-0 ml-1.5"
                  title="Eliminar canción"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
