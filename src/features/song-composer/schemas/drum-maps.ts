export interface DrumMapping {
  id: string;
  name: string;
  description: string;
  map: {
    kick: string;
    snare: string;
    closedHihat: string;
    openHihat: string;
    crash: string;
    ride: string;
    lowFloorTom: string;
    lowTom: string;
    hiMidTom: string;
    clap: string;
  };
}

export const DRUM_MAPPINGS: Record<string, DrumMapping> = {
  "gm": {
    id: "gm",
    name: "General MIDI (Estándar)",
    description: "Mapeo estándar de General MIDI (Bombo en C2/36). Compatible con la mayoría de VSTs y sintes.",
    map: {
      kick: "C2", // 36
      snare: "D2", // 38
      closedHihat: "F#2", // 42
      openHihat: "A#2", // 46
      crash: "C#3", // 49
      ride: "D#3", // 51
      lowFloorTom: "F2", // 41
      lowTom: "A2", // 45
      hiMidTom: "C3", // 48
      clap: "D#2", // 39
    }
  },
  "tr808": {
    id: "tr808",
    name: "Roland TR-808",
    description: "Mapeo para emuladores típicos de TR-808 donde las afinaciones pueden variar. (Bombo C1/24)",
    map: {
      kick: "C1", // 24
      snare: "D1",
      closedHihat: "F#1",
      openHihat: "A#1",
      crash: "C#2",
      ride: "D#2",
      lowFloorTom: "F1",
      lowTom: "A1",
      hiMidTom: "C2",
      clap: "D#1",
    }
  },
  "tr707": {
    id: "tr707",
    name: "Roland TR-707",
    description: "Mapeo para caja de ritmos TR-707 (Bombo en B1/35 o C2/36).",
    map: {
      kick: "B1", // 35
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
};
