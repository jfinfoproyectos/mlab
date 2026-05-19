import dotenv from "dotenv";
import path from "path";

// Load environment variables before importing prisma
dotenv.config({ path: path.join(__dirname, "../.env") });

import prisma from "../src/lib/prisma";

async function main() {
  console.log("Conectando a la base de datos...");
  const songs = await prisma.song.findMany({
    orderBy: { updatedAt: "desc" },
    take: 1
  });

  if (songs.length === 0) {
    console.log("No se encontraron canciones en la base de datos.");
    return;
  }

  const song = songs[0];
  console.log(`\nCanción: "${song.title}" (ID: ${song.id})`);
  
  const data = song.data as any;
  if (!data.tracks || data.tracks.length === 0) {
    console.log("Esta canción no tiene pistas instrumentales.");
    return;
  }

  console.log(`\nCantidad de pistas: ${data.tracks.length}`);
  data.tracks.forEach((track: any) => {
    console.log(`\nPista: "${track.name}" (Canal MIDI: ${track.midiChannel})`);
    const sectionIds = Object.keys(track.sectionNotes || {});
    console.log(`Secciones con notas: ${sectionIds.join(", ") || "Ninguna"}`);
    
    sectionIds.forEach(sectId => {
      const notes = track.sectionNotes[sectId] || [];
      console.log(`  Sección "${sectId}": ${notes.length} notas en total.`);
      if (notes.length > 0) {
        console.log("  Primeras 3 notas:");
        notes.slice(0, 3).forEach((n: any, i: number) => {
          console.log(`    [${i}] Nota: ${n.note}, startBeat: ${n.startBeat}, durationBeats: ${n.durationBeats}`);
        });
        if (notes.length > 3) {
          console.log("    ...");
          notes.slice(-3).forEach((n: any, i: number) => {
            console.log(`    [${notes.length - 3 + i}] Nota: ${n.note}, startBeat: ${n.startBeat}, durationBeats: ${n.durationBeats}`);
          });
        }
      }
    });
  });
}

main()
  .catch(e => console.error("Error running script:", e))
  .finally(() => prisma.$disconnect());
