import { generateDrumTrackAction } from "./src/features/song-composer/actions/drum-generator.actions";
import fs from 'fs';

async function test() {
  const envFile = fs.readFileSync('./.env', 'utf-8');
  envFile.split('\n').forEach(line => {
    if (line.includes('=')) {
      const [k, v] = line.split('=');
      process.env[k.trim()] = v.trim();
    }
  });

  console.log("Testing drum generation...");
  const res = await generateDrumTrackAction({
    songTitle: "Test Song",
    sectionType: "Intro",
    totalBeats: 16,
    userPrompt: "Rock beat",
    tempo: 120,
    drumMapping: {
      id: "gm",
      name: "General MIDI (Estándar)",
      description: "",
      map: {
        kick: "C2",
        snare: "D2",
        closedHihat: "F#2",
        openHihat: "A#2",
        crash: "C#3",
        ride: "D#3",
        lowFloorTom: "F2",
        lowTom: "A2",
        hiMidTom: "C3",
        clap: "D#2",
      }
    }
  });
  console.log(JSON.stringify(res, null, 2));
}

test().catch(console.error);
