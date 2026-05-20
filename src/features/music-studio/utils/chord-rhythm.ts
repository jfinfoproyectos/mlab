import { SongStructure, SongTrack, SongSection } from "../schemas/song-generator.schema";

export function generateSectionChordRhythmNotes(
  chords: Array<{ chord: string; pianoNotes: string[] }>,
  pattern: string,
  mode: string,
  customSteps: boolean[][],
  selectedArpeggioPattern: string,
  isOutro: boolean = false
): Array<{ note: string; startBeat: number; durationBeats: number; velocity: number }> {
  const notes: Array<{ note: string; startBeat: number; durationBeats: number; velocity: number }> = [];

  const getLowerOctave = (noteName: string): string => {
    const matchNote = noteName.match(/^([A-G][#b]?)([0-9])$/i);
    if (matchNote) {
      const name = matchNote[1];
      const octave = parseInt(matchNote[2], 10);
      return `${name}${Math.max(1, octave - 1)}`;
    }
    return noteName;
  };

  const getNoteWithOctaveShift = (noteStr: string, shift: number): string => {
    const matchNote = noteStr.match(/^([A-G][#b]?)([0-9])$/i);
    if (matchNote) {
      const name = matchNote[1];
      const octave = parseInt(matchNote[2], 10);
      return `${name}${Math.max(1, Math.min(8, octave + shift))}`;
    }
    return noteStr;
  };

  const shiftNoteSemitones = (noteStr: string, semitones: number): string => {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const matchNote = noteStr.match(/^([A-G][#b]?)([0-9])$/i);
    if (matchNote) {
      let name = matchNote[1];
      if (name === "Db") name = "C#";
      if (name === "Eb") name = "D#";
      if (name === "Gb") name = "F#";
      if (name === "Ab") name = "G#";
      if (name === "Bb") name = "A#";
      
      const octave = parseInt(matchNote[2], 10);
      const noteIdx = noteNames.indexOf(name);
      if (noteIdx !== -1) {
        const totalSemitones = octave * 12 + noteIdx + semitones;
        const newOctave = Math.floor(totalSemitones / 12);
        const newNoteName = noteNames[totalSemitones % 12];
        return `${newNoteName}${Math.max(1, Math.min(8, newOctave))}`;
      }
    }
    return noteStr;
  };

  chords.forEach((chordObj, chordIdx) => {
    const chordNotes = chordObj.pianoNotes || [];
    if (chordNotes.length === 0) return;

    const baseBeat = chordIdx * 4;
    const isEvenMeasure = chordIdx % 2 === 1;

    const bass = chordNotes[0];
    const voicing = chordNotes.length > 1 ? chordNotes.slice(1) : chordNotes;
    const bassLower = getLowerOctave(bass);

    const isLastChordOfOutro = isOutro && (chordIdx === chords.length - 1);

    if (isLastChordOfOutro) {
      // Sustained block chord ending resolution for Outro final beat
      // Bass note
      notes.push({
        note: bassLower,
        startBeat: baseBeat,
        durationBeats: 6.0,
        velocity: 0.9,
      });
      // Voicing notes
      voicing.forEach((n) => {
        notes.push({
          note: n,
          startBeat: baseBeat,
          durationBeats: 6.0,
          velocity: 0.8,
        });
      });
      return;
    }

    if (mode === "basic") {
      chordNotes.forEach((n) => {
        notes.push({
          note: n,
          startBeat: baseBeat,
          durationBeats: 4.0,
          velocity: 0.75,
        });
      });
    } else if (mode === "arpeggio") {
      // Add bass note at start
      notes.push({
        note: bassLower,
        startBeat: baseBeat,
        durationBeats: 3.8,
        velocity: 0.8,
      });

      const len = voicing.length;

      if (selectedArpeggioPattern === "cascade") {
        const fastStepBeats = 4 / 16; // 0.25 beats per step
        const cascadeSequence: string[] = [];

        for (let i = 0; i < 4; i++) {
          cascadeSequence.push(voicing[i % len]);
        }
        for (let i = 0; i < 4; i++) {
          cascadeSequence.push(getNoteWithOctaveShift(voicing[i % len], 1));
        }
        for (let i = 0; i < 4; i++) {
          cascadeSequence.push(getNoteWithOctaveShift(voicing[(len - 1 - i) % len] || voicing[0], 1));
        }
        for (let i = 0; i < 4; i++) {
          cascadeSequence.push(voicing[(len - 1 - i) % len] || voicing[0]);
        }

        cascadeSequence.forEach((noteName, i) => {
          notes.push({
            note: noteName,
            startBeat: baseBeat + i * fastStepBeats,
            durationBeats: fastStepBeats * 1.15,
            velocity: 0.7,
          });
        });
      } else {
        const arpeggioSequence: string[][] = [];

        if (selectedArpeggioPattern === "up") {
          for (let i = 0; i < 8; i++) {
            arpeggioSequence.push([voicing[i % len]]);
          }
        } else if (selectedArpeggioPattern === "down") {
          for (let i = 0; i < 8; i++) {
            arpeggioSequence.push([voicing[(len - 1 - i) % len] || voicing[0]]);
          }
        } else if (selectedArpeggioPattern === "down-up") {
          let dir = -1;
          let idx = len - 1;
          for (let i = 0; i < 8; i++) {
            arpeggioSequence.push([voicing[idx]]);
            idx += dir;
            if (idx === 0) {
              dir = 1;
            } else if (idx === len - 1) {
              dir = -1;
            }
          }
        } else if (selectedArpeggioPattern === "cross") {
          for (let i = 0; i < 8; i++) {
            const step = i % 4;
            if (step === 0) arpeggioSequence.push([voicing[0]]);
            else if (step === 1) arpeggioSequence.push([voicing[len - 1]]);
            else if (step === 2) arpeggioSequence.push([voicing[Math.max(0, Math.min(len - 1, 1))]]);
            else arpeggioSequence.push([voicing[Math.max(0, Math.min(len - 1, len - 2))]]);
          }
        } else if (selectedArpeggioPattern === "double-strike") {
          for (let i = 0; i < 8; i++) {
            const idx1 = i % len;
            const idx2 = (i + 1) % len;
            arpeggioSequence.push([voicing[idx1], voicing[idx2]]);
          }
        } else if (selectedArpeggioPattern === "random") {
          for (let i = 0; i < 8; i++) {
            const rIndex = Math.floor(Math.random() * len);
            arpeggioSequence.push([voicing[rIndex]]);
          }
        } else {
          // up-down
          let dir = 1;
          let idx = 0;
          for (let i = 0; i < 8; i++) {
            arpeggioSequence.push([voicing[idx]]);
            idx += dir;
            if (idx === len - 1) {
              dir = -1;
            } else if (idx === 0) {
              dir = 1;
            }
          }
        }

        const stepBeats = 4 / 8; // 0.5 beats per step
        arpeggioSequence.forEach((stepNotes, i) => {
          stepNotes.forEach((noteName) => {
            notes.push({
              note: noteName,
              startBeat: baseBeat + i * stepBeats,
              durationBeats: stepBeats * 1.15,
              velocity: 0.7,
            });
          });
        });
      }
    } else if (mode === "rhythm") {
      const beatMs = 1.0; // 1 beat

      if (pattern === "pop-ballad") {
        if (!isEvenMeasure) {
          // Beat 0
          notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 3.8, velocity: 0.8 });
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat, durationBeats: 0.9, velocity: 0.7 }));
          // Beat 1.0
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 1.0, durationBeats: 0.8, velocity: 0.6 }));
          // Beat 1.5
          notes.push({ note: voicing[0], startBeat: baseBeat + 1.5, durationBeats: 0.5, velocity: 0.6 });
          // Beat 2.0
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 2.0, durationBeats: 0.9, velocity: 0.7 }));
          // Beat 2.5
          const n25 = voicing[1] || voicing[0];
          notes.push({ note: n25, startBeat: baseBeat + 2.5, durationBeats: 0.5, velocity: 0.65 });
          // Beat 3.0
          const n30 = voicing[voicing.length - 1];
          notes.push({ note: n30, startBeat: baseBeat + 3.0, durationBeats: 0.5, velocity: 0.65 });
          // Beat 3.5
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 3.5, durationBeats: 0.4, velocity: 0.6 }));
        } else {
          // Beat 0
          notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 3.8, velocity: 0.8 });
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat, durationBeats: 0.9, velocity: 0.75 }));
          // Beat 1.0
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 1.0, durationBeats: 0.8, velocity: 0.65 }));
          // Beat 2.0
          notes.push({ note: voicing[0], startBeat: baseBeat + 2.0, durationBeats: 0.4, velocity: 0.65 });
          // Beat 2.33
          const n233 = voicing[1] || voicing[0];
          notes.push({ note: n233, startBeat: baseBeat + 2.33, durationBeats: 0.4, velocity: 0.65 });
          // Beat 2.66
          const n266 = voicing[2] || voicing[voicing.length - 1];
          notes.push({ note: n266, startBeat: baseBeat + 2.66, durationBeats: 0.4, velocity: 0.7 });
          // Beat 3.0
          const n30 = voicing[voicing.length - 1];
          notes.push({ note: n30, startBeat: baseBeat + 3.0, durationBeats: 0.5, velocity: 0.75 });
          // Beat 3.5
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 3.5, durationBeats: 0.4, velocity: 0.7 }));
        }
      } else if (pattern === "classical-alberti") {
        const step = 0.5;
        const lowNote = bassLower;
        const highNote = voicing[voicing.length - 1];
        const midNote = voicing[Math.floor(voicing.length / 2)] || lowNote;

        if (!isEvenMeasure) {
          const sequence = [lowNote, highNote, midNote, highNote, lowNote, highNote, midNote, highNote];
          sequence.forEach((noteName, i) => {
            notes.push({
              note: noteName,
              startBeat: baseBeat + i * step,
              durationBeats: step * 0.95,
              velocity: 0.7,
            });
          });
        } else {
          const sequence = [lowNote, midNote, highNote, midNote, lowNote, midNote, highNote, highNote];
          sequence.forEach((noteName, i) => {
            const vel = i === 7 ? 0.8 : 0.65;
            const dur = i === 7 ? step * 1.4 : step * 0.95;
            notes.push({
              note: noteName,
              startBeat: baseBeat + i * step,
              durationBeats: dur,
              velocity: vel,
            });
          });
        }
      } else if (pattern === "neo-soul-arpeggio") {
        const step = 0.5;
        if (!isEvenMeasure) {
          notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 1.8, velocity: 0.8 });
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat, durationBeats: 1.4, velocity: 0.7 }));
          notes.push({ note: voicing[Math.floor(voicing.length / 2)] || voicing[0], startBeat: baseBeat + 1.0, durationBeats: 0.75, velocity: 0.65 });
          notes.push({ note: voicing[voicing.length - 1], startBeat: baseBeat + 1.5, durationBeats: 0.75, velocity: 0.65 });
          notes.push({ note: bassLower, startBeat: baseBeat + 2.0, durationBeats: 1.8, velocity: 0.75 });
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 2.0, durationBeats: 1.4, velocity: 0.65 }));
          notes.push({ note: voicing[voicing.length - 1], startBeat: baseBeat + 3.0, durationBeats: 0.6, velocity: 0.6 });
          notes.push({ note: voicing[Math.floor(voicing.length / 2)] || voicing[0], startBeat: baseBeat + 3.5, durationBeats: 0.6, velocity: 0.6 });
        } else {
          notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 1.8, velocity: 0.8 });
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat, durationBeats: 1.4, velocity: 0.7 }));
          notes.push({ note: voicing[0], startBeat: baseBeat + 1.0, durationBeats: 0.25, velocity: 0.6 });
          notes.push({ note: voicing[1] || voicing[0], startBeat: baseBeat + 1.05, durationBeats: 0.55, velocity: 0.65 });
          notes.push({ note: voicing[voicing.length - 1], startBeat: baseBeat + 1.5, durationBeats: 0.75, velocity: 0.65 });
          notes.push({ note: bassLower, startBeat: baseBeat + 2.0, durationBeats: 1.8, velocity: 0.75 });
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 2.0, durationBeats: 1.4, velocity: 0.65 }));
          notes.push({ note: voicing[voicing.length - 1], startBeat: baseBeat + 3.0, durationBeats: 0.6, velocity: 0.65 });
          notes.push({ note: voicing[Math.floor(voicing.length / 2)] || voicing[0], startBeat: baseBeat + 3.5, durationBeats: 0.6, velocity: 0.65 });
        }
      } else if (pattern === "bossa-nova") {
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.max(1, octave)}`;
        }
        if (!isEvenMeasure) {
          notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 1.2, velocity: 0.8 });
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 0.5, durationBeats: 0.8, velocity: 0.7 }));
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 1.5, durationBeats: 0.7, velocity: 0.65 }));
          notes.push({ note: bassAlt, startBeat: baseBeat + 2.0, durationBeats: 1.2, velocity: 0.75 });
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 2.5, durationBeats: 0.8, velocity: 0.7 }));
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 3.5, durationBeats: 0.4, velocity: 0.6 }));
        } else {
          notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 1.2, velocity: 0.8 });
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 0.5, durationBeats: 0.8, velocity: 0.7 }));
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 1.0, durationBeats: 0.8, velocity: 0.65 }));
          notes.push({ note: bassAlt, startBeat: baseBeat + 2.0, durationBeats: 1.2, velocity: 0.75 });
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 2.5, durationBeats: 0.5, velocity: 0.7 }));
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 3.0, durationBeats: 0.5, velocity: 0.7 }));
          voicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 3.5, durationBeats: 0.4, velocity: 0.65 }));
        }
      } else if (pattern === "lofi-chill") {
        if (!isEvenMeasure) {
          notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 3.9, velocity: 0.75 });
          voicing.forEach((n, idx) => {
            notes.push({ note: n, startBeat: baseBeat + 0.25 + idx * 0.05, durationBeats: 2.5, velocity: 0.65 });
          });
          const topNote = voicing[voicing.length - 1];
          notes.push({ note: topNote, startBeat: baseBeat + 2.5, durationBeats: 1.0, velocity: 0.4 });
        } else {
          notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 3.9, velocity: 0.75 });
          const reversedVoicing = [...voicing].reverse();
          reversedVoicing.forEach((n, idx) => {
            notes.push({ note: n, startBeat: baseBeat + 0.25 + idx * 0.05, durationBeats: 2.5, velocity: 0.65 });
          });
          const topNote = voicing[voicing.length - 1];
          const extensionNote = voicing[voicing.length - 2] || voicing[0];
          notes.push({ note: topNote, startBeat: baseBeat + 2.5, durationBeats: 1.0, velocity: 0.4 });
          notes.push({ note: extensionNote, startBeat: baseBeat + 2.5, durationBeats: 1.0, velocity: 0.35 });
        }
      } else if (pattern === "salsa-tumbao") {
        const highNote = voicing[voicing.length - 1];
        const innerVoicing = voicing.length > 1 ? voicing.slice(0, voicing.length - 1) : voicing;
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.max(1, octave)}`;
        }

        if (!isEvenMeasure) {
          notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 1.2, velocity: 0.8 });
          notes.push({ note: highNote, startBeat: baseBeat + 0.5, durationBeats: 0.4, velocity: 0.75 });
          innerVoicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 1.0, durationBeats: 0.4, velocity: 0.7 }));
          notes.push({ note: highNote, startBeat: baseBeat + 1.5, durationBeats: 0.4, velocity: 0.75 });
          notes.push({ note: bassAlt, startBeat: baseBeat + 2.0, durationBeats: 1.2, velocity: 0.8 });
          notes.push({ note: highNote, startBeat: baseBeat + 2.5, durationBeats: 0.4, velocity: 0.75 });
          innerVoicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 3.0, durationBeats: 0.4, velocity: 0.7 }));
          notes.push({ note: highNote, startBeat: baseBeat + 3.5, durationBeats: 0.4, velocity: 0.75 });
        } else {
          notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 1.2, velocity: 0.8 });
          notes.push({ note: highNote, startBeat: baseBeat + 0.5, durationBeats: 0.45, velocity: 0.75 });
          notes.push({ note: voicing[0], startBeat: baseBeat + 0.5, durationBeats: 0.45, velocity: 0.7 });
          innerVoicing.forEach(n => notes.push({ note: n, startBeat: baseBeat + 1.0, durationBeats: 0.4, velocity: 0.7 }));
          notes.push({ note: highNote, startBeat: baseBeat + 1.5, durationBeats: 0.4, velocity: 0.75 });
          notes.push({ note: bassAlt, startBeat: baseBeat + 2.0, durationBeats: 0.6, velocity: 0.75 });
          notes.push({ note: bassLower, startBeat: baseBeat + 2.5, durationBeats: 0.6, velocity: 0.7 });
          notes.push({ note: highNote, startBeat: baseBeat + 2.5, durationBeats: 0.45, velocity: 0.75 });
          notes.push({ note: voicing[0], startBeat: baseBeat + 2.5, durationBeats: 0.45, velocity: 0.7 });
          const mid = voicing[Math.floor(voicing.length / 2)] || voicing[0];
          notes.push({ note: mid, startBeat: baseBeat + 3.0, durationBeats: 0.4, velocity: 0.65 });
          notes.push({ note: voicing[0], startBeat: baseBeat + 3.5, durationBeats: 0.4, velocity: 0.7 });
        }
      } else if (pattern === "bachata-bolero") {
        const step = 0.5;
        let bassAlt = bassLower;
        const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
        if (matchAlt) {
          const name = matchAlt[1];
          const octave = parseInt(matchAlt[2], 10);
          bassAlt = `${name}${Math.max(1, octave)}`;
        }

        if (!isEvenMeasure) {
          notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 0.9, velocity: 0.8 });
          const arpeggioFlow = [voicing[0], voicing[1] || voicing[0], voicing[voicing.length - 1], voicing[0], voicing[1] || voicing[0]];
          notes.push({ note: arpeggioFlow[0], startBeat: baseBeat + 0.5, durationBeats: 0.4, velocity: 0.7 });
          notes.push({ note: arpeggioFlow[1], startBeat: baseBeat + 1.0, durationBeats: 0.4, velocity: 0.65 });
          notes.push({ note: arpeggioFlow[2], startBeat: baseBeat + 1.5, durationBeats: 0.4, velocity: 0.7 });
          notes.push({ note: bassAlt, startBeat: baseBeat + 2.0, durationBeats: 0.9, velocity: 0.75 });
          notes.push({ note: arpeggioFlow[3], startBeat: baseBeat + 2.5, durationBeats: 0.4, velocity: 0.65 });
          notes.push({ note: arpeggioFlow[4], startBeat: baseBeat + 3.0, durationBeats: 0.4, velocity: 0.7 });
          notes.push({ note: voicing[0], startBeat: baseBeat + 3.5, durationBeats: 0.4, velocity: 0.65 });
        } else {
          notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 0.9, velocity: 0.8 });
          notes.push({ note: voicing[0], startBeat: baseBeat + 0.5, durationBeats: 0.3, velocity: 0.7 });
          notes.push({ note: voicing[voicing.length - 1], startBeat: baseBeat + 0.5, durationBeats: 0.3, velocity: 0.7 });
          notes.push({ note: voicing[0], startBeat: baseBeat + 1.0, durationBeats: 0.3, velocity: 0.65 });
          notes.push({ note: voicing[voicing.length - 2] || voicing[0], startBeat: baseBeat + 1.0, durationBeats: 0.3, velocity: 0.65 });
          notes.push({ note: bassAlt, startBeat: baseBeat + 1.5, durationBeats: 0.9, velocity: 0.75 });
          notes.push({ note: voicing[0], startBeat: baseBeat + 2.0, durationBeats: 0.3, velocity: 0.7 });
          notes.push({ note: voicing[voicing.length - 1], startBeat: baseBeat + 2.0, durationBeats: 0.3, velocity: 0.7 });
          notes.push({ note: voicing[0], startBeat: baseBeat + 2.5, durationBeats: 0.3, velocity: 0.65 });
          notes.push({ note: voicing[voicing.length - 2] || voicing[0], startBeat: baseBeat + 2.5, durationBeats: 0.3, velocity: 0.65 });
          notes.push({ note: bassLower, startBeat: baseBeat + 3.0, durationBeats: 0.9, velocity: 0.8 });
          notes.push({ note: voicing[0], startBeat: baseBeat + 3.5, durationBeats: 0.3, velocity: 0.7 });
          notes.push({ note: voicing[voicing.length - 1], startBeat: baseBeat + 3.5, durationBeats: 0.3, velocity: 0.7 });
        }
      } else if (pattern === "reggaeton-dembow") {
        const stepDuration = 0.45;
        notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 1.2, velocity: 0.85 });
        notes.push({ note: bassLower, startBeat: baseBeat + 2.0, durationBeats: 1.2, velocity: 0.85 });

        const hits = [0.0, 1.5, 2.0, 3.5];
        hits.forEach((hitOffset) => {
          voicing.forEach((n) => {
            notes.push({
              note: n,
              startBeat: baseBeat + hitOffset,
              durationBeats: stepDuration,
              velocity: 0.75,
            });
          });
        });
      } else if (pattern === "bolero-romantico") {
        notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 1.4, velocity: 0.8 });
        notes.push({ note: bassLower, startBeat: baseBeat + 1.5, durationBeats: 0.4, velocity: 0.7 });
        notes.push({ note: bassLower, startBeat: baseBeat + 2.0, durationBeats: 0.8, velocity: 0.75 });
        notes.push({ note: bassLower, startBeat: baseBeat + 3.0, durationBeats: 0.8, velocity: 0.75 });

        const chordBeats = [0.5, 1.0, 2.0, 3.0];
        chordBeats.forEach((hb) => {
          const dur = (hb === 2.0 || hb === 3.0) ? 0.8 : 0.45;
          const vel = (hb === 2.0 || hb === 3.0) ? 0.7 : 0.65;
          voicing.forEach((n) => {
            notes.push({
              note: n,
              startBeat: baseBeat + hb,
              durationBeats: dur,
              velocity: vel,
            });
          });
        });
      } else if (pattern === "jazz-swing") {
        notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 0.9, velocity: 0.8 });
        notes.push({ note: shiftNoteSemitones(bassLower, 4), startBeat: baseBeat + 1.0, durationBeats: 0.9, velocity: 0.7 });
        notes.push({ note: shiftNoteSemitones(bassLower, 7), startBeat: baseBeat + 2.0, durationBeats: 0.9, velocity: 0.75 });
        notes.push({ note: shiftNoteSemitones(bassLower, 5), startBeat: baseBeat + 3.0, durationBeats: 0.9, velocity: 0.7 });

        const chordBeats = !isEvenMeasure ? [0.0, 1.5] : [1.0, 2.5];
        chordBeats.forEach((hb) => {
          voicing.forEach((n) => {
            notes.push({
              note: n,
              startBeat: baseBeat + hb,
              durationBeats: 0.35,
              velocity: 0.7,
            });
          });
        });
      } else if (pattern === "boogie-woogie") {
        const bassIntervals = [0, 4, 7, 9, 10, 9, 7, 4];
        bassIntervals.forEach((interval, i) => {
          notes.push({
            note: shiftNoteSemitones(bassLower, interval),
            startBeat: baseBeat + i * 0.5,
            durationBeats: 0.45,
            velocity: 0.75,
          });
        });

        const chordBeats = [0.0, 1.0, 2.0, 3.0];
        chordBeats.forEach((hb) => {
          voicing.forEach((n) => {
            notes.push({
              note: n,
              startBeat: baseBeat + hb,
              durationBeats: 0.25,
              velocity: 0.65,
            });
          });
        });
      } else if (pattern === "funk-clav") {
        notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 0.45, velocity: 0.85 });
        notes.push({ note: bassLower, startBeat: baseBeat + 2.0, durationBeats: 0.45, velocity: 0.8 });
        notes.push({ note: bassLower, startBeat: baseBeat + 2.75, durationBeats: 0.3, velocity: 0.75 });

        const chordBeats = [0.25, 0.75, 1.5, 2.25, 3.0, 3.5];
        chordBeats.forEach((hb) => {
          voicing.forEach((n) => {
            notes.push({
              note: n,
              startBeat: baseBeat + hb,
              durationBeats: 0.2,
              velocity: 0.7,
            });
          });
        });
      } else if (pattern === "ambient-drone") {
        chordNotes.forEach((n) => {
          notes.push({
            note: n,
            startBeat: baseBeat,
            durationBeats: 4.25,
            velocity: 0.5,
          });
        });
      } else if (pattern === "cumbia-colombiana") {
        const bassPattern = [
          { time: 0.0, dur: 0.3, vel: 0.65 },
          { time: 0.5, dur: 0.8, vel: 0.8 },
          { time: 1.5, dur: 0.3, vel: 0.65 },
          { time: 2.0, dur: 0.3, vel: 0.65 },
          { time: 2.5, dur: 0.8, vel: 0.8 },
          { time: 3.5, dur: 0.3, vel: 0.65 }
        ];
        bassPattern.forEach((bp) => {
          notes.push({ note: bassLower, startBeat: baseBeat + bp.time, durationBeats: bp.dur, velocity: bp.vel });
        });

        const chordBeats = [0.5, 1.5, 2.5, 3.5];
        chordBeats.forEach((hb) => {
          voicing.forEach((n) => {
            notes.push({
              note: n,
              startBeat: baseBeat + hb,
              durationBeats: 0.4,
              velocity: 0.75,
            });
          });
        });
      } else if (pattern === "edm-house") {
        const chordBeats = [0.0, 1.0, 2.0, 3.0];
        chordBeats.forEach((hb) => {
          voicing.forEach((n) => {
            notes.push({
              note: n,
              startBeat: baseBeat + hb,
              durationBeats: 0.45,
              velocity: 0.8,
            });
          });
        });

        const bassBeats = [0.5, 1.5, 2.5, 3.5];
        bassBeats.forEach((bb) => {
          notes.push({
            note: bassLower,
            startBeat: baseBeat + bb,
            durationBeats: 0.4,
            velocity: 0.85,
          });
        });
      } else if (pattern === "rb-trap-soul") {
        notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 1.8, velocity: 0.8 });
        notes.push({ note: bassLower, startBeat: baseBeat + 2.0, durationBeats: 1.5, velocity: 0.75 });

        const chordBeats = [0.25, 2.25];
        chordBeats.forEach((hb) => {
          voicing.forEach((n) => {
            notes.push({
              note: n,
              startBeat: baseBeat + hb,
              durationBeats: 1.5,
              velocity: 0.65,
            });
          });
        });

        const topNote = voicing[voicing.length - 1];
        notes.push({ note: topNote, startBeat: baseBeat + 3.5, durationBeats: 0.25, velocity: 0.6 });
        notes.push({ note: shiftNoteSemitones(topNote, 12), startBeat: baseBeat + 3.75, durationBeats: 0.25, velocity: 0.55 });
      } else if (pattern === "flamenco-rumba") {
        notes.push({ note: bassLower, startBeat: baseBeat, durationBeats: 0.4, velocity: 0.85 });
        notes.push({ note: bassLower, startBeat: baseBeat + 1.5, durationBeats: 0.4, velocity: 0.8 });
        notes.push({ note: bassLower, startBeat: baseBeat + 2.5, durationBeats: 0.4, velocity: 0.8 });

        const strumBeats = [0.5, 0.75, 1.0, 2.0, 2.75, 3.0, 3.5];
        strumBeats.forEach((hb) => {
          const isOff = hb === 0.75 || hb === 2.75;
          const dur = isOff ? 0.2 : 0.35;
          const vel = isOff ? 0.6 : 0.75;
          voicing.forEach((n) => {
            notes.push({
              note: n,
              startBeat: baseBeat + hb,
              durationBeats: dur,
              velocity: vel,
            });
          });
        });
      } else {
        // basic rhythm/fallback
        chordNotes.forEach((n) => {
          notes.push({
            note: n,
            startBeat: baseBeat,
            durationBeats: 4.0,
            velocity: 0.75,
          });
        });
      }
    }
  });

  return notes;
}

export function syncChordRhythmTrackNotes(
  song: SongStructure,
  pattern: string,
  mode: string,
  customSteps: boolean[][],
  selectedArpeggioPattern: string
): SongStructure {
  let tracks = [...(song.tracks || [])];
  
  // Find or create the progression rhythm track
  let rhythmTrackIndex = tracks.findIndex(
    (t) => t.isProgressionRhythm === true || t.name === "Ritmo de Progresión" || t.midiChannel === 1
  );

  let rhythmTrack: SongTrack;

  if (rhythmTrackIndex === -1) {
    rhythmTrack = {
      id: `track-rhythm-progression-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "Ritmo de Progresión",
      midiChannel: 1,
      instrumentPreset: "grand-piano",
      volume: 0.75,
      prompts: {},
      sectionNotes: {},
      isProgressionRhythm: true,
    };
    tracks.unshift(rhythmTrack); // Put it at the top
  } else {
    // Clone and update the existing track to keep options like volume, muted, soloed, etc.
    rhythmTrack = {
      ...tracks[rhythmTrackIndex],
      name: "Ritmo de Progresión",
      midiChannel: 1,
      isProgressionRhythm: true,
    };
    tracks[rhythmTrackIndex] = rhythmTrack;
  }

  // Update sectionNotes for each section in the song
  const updatedSectionNotes: Record<string, Array<{ note: string; startBeat: number; durationBeats: number; velocity: number }>> = {};

  song.sections.forEach((sect) => {
    // Check if this section notes on the rhythm track were generated by AI
    const hasAiNotes = rhythmTrack.aiSections?.[sect.id] === true;
    if (hasAiNotes) {
      // Keep existing notes for this section
      updatedSectionNotes[sect.id] = rhythmTrack.sectionNotes?.[sect.id] || [];
    } else {
      const secChords = sect.chords?.chords || [];
      if (secChords.length > 0) {
        updatedSectionNotes[sect.id] = generateSectionChordRhythmNotes(
          secChords,
          pattern,
          mode,
          customSteps,
          selectedArpeggioPattern,
          sect.type.toLowerCase() === "outro"
        );
      } else {
        updatedSectionNotes[sect.id] = [];
      }
    }
  });

  rhythmTrack.sectionNotes = updatedSectionNotes;

  return {
    ...song,
    tracks,
  };
}
