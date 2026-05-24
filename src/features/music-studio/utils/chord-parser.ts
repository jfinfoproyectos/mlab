export function parseChordToNotes(chordName: string): string[] {
  if (!chordName) return [];

  const match = chordName.match(/^([A-G][#b]?)(.*)$/i);
  if (!match) return [];

  const root = match[1].toUpperCase();
  let quality = match[2].toLowerCase();
  let bassNote = "";

  if (quality.includes('/')) {
    const parts = quality.split('/');
    quality = parts[0];
    bassNote = parts[1];
  }

  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  
  // Normalize flats to sharps for internal logic
  const normalize = (n: string) => {
    const map: Record<string, string> = { "DB": "C#", "EB": "D#", "GB": "F#", "AB": "G#", "BB": "A#" };
    return map[n.toUpperCase()] || n.toUpperCase();
  };

  const rootIndex = notes.indexOf(normalize(root));
  if (rootIndex === -1) return [];

  const getNoteStr = (semitones: number) => {
    let rawIndex = rootIndex + semitones;
    let octaveOffset = Math.floor(rawIndex / 12);
    let noteIndex = rawIndex % 12;
    if (noteIndex < 0) {
      noteIndex += 12;
      octaveOffset -= 1;
    }
    // Base octave is 3
    return `${notes[noteIndex]}${3 + octaveOffset}`;
  };

  // Base intervals
  let third = 4; // Major third
  let fifth = 7; // Perfect fifth
  let seventh = -1; // None
  let ninth = -1; // None

  if (quality.includes("m") && !quality.includes("maj")) {
    third = 3; // Minor third
  }
  if (quality.includes("dim") || quality.includes("o")) {
    third = 3;
    fifth = 6;
  }
  if (quality.includes("aug") || quality.includes("+")) {
    fifth = 8;
  }
  if (quality.includes("sus4")) {
    third = 5;
  }
  if (quality.includes("sus2")) {
    third = 2;
  }

  // Sevenths
  if (quality.includes("7")) {
    seventh = 10; // Minor seventh
    if (quality.includes("maj7") || quality.includes("m7")) {
      seventh = quality.includes("maj7") ? 11 : 10;
    }
  }
  if (quality.includes("dim7")) {
    seventh = 9; // Diminished seventh
  }

  // Ninths
  if (quality.includes("9")) {
    ninth = 14;
    if (seventh === -1) seventh = 10; // Dominant 9 implies minor 7th
    if (quality.includes("maj9")) seventh = 11;
  }

  let semitonesList = [0, third, fifth];
  if (seventh !== -1) semitonesList.push(seventh);
  if (ninth !== -1) semitonesList.push(ninth);

  if (bassNote) {
    const bassIndex = notes.indexOf(normalize(bassNote));
    if (bassIndex !== -1) {
      const bassDistance = (bassIndex - rootIndex + 12) % 12;
      semitonesList = semitonesList.map(st => {
        if ((st % 12) < bassDistance) {
          return st + 12;
        }
        return st;
      });
      // Sort semitones so the notes appear from lowest to highest pitch
      semitonesList.sort((a, b) => a - b);
    }
  }

  return semitonesList.map(st => getNoteStr(st));
}
