import { config } from 'dotenv';
config({ path: '.env.local' });
import prisma from './src/lib/prisma';
import fs from 'fs';

async function test() {
  try {
    const songs = await prisma.song.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20
    });
    
    let out = "Last 20 songs in DB (all users):\n";
    songs.forEach(s => {
        out += `ID: ${s.id} | Title: ${s.title} | UserID: ${s.userId} | UpdatedAt: ${s.updatedAt}\n`;
    });
    
    fs.writeFileSync('db_songs.log', out);
    console.log("Done printing all songs.");
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
