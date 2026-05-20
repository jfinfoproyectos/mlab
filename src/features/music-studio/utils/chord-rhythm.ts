import { SongStructure, SongTrack, SongSection } from "../schemas/song-generator.schema";

export function generateSectionChordRhythmNotes(
  chords: Array<{ chord: string; pianoNotes: string[] }>,
  pattern: string,
  mode: string,
  customSteps: boolean[][],
  selectedArpeggioPattern: string
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

  chords.forEach((chordObj, chordIdx) => {
    const chordNotes = chordObj.pianoNotes || [];
    if (chordNotes.length === 0) return;

    const baseBeat = chordIdx * 4;
    const isEvenMeasure = chordIdx % 2 === 1;

    const bass = chordNotes[0];
    const voicing = chordNotes.length > 1 ? chordNotes.slice(1) : chordNotes;
    const bassLower = getLowerOctave(bass);

    if (mode === "basic") {
      chordNotes.forEach((n) => {
        notes.push({
          note: n,
          startBeat: baseBeat,
          durationBeats: 4.0,
          velocity: 0.75,
        });
      });
    } else if (mode === "custom-rhythm") {
      let bassAlt = bassLower;
      const matchAlt = bass.match(/^([A-G][#b]?)([0-9])$/i);
      if (matchAlt) {
        const name = matchAlt[1];
        const octave = parseInt(matchAlt[2], 10);
        bassAlt = `${name}${Math.min(1, octave)}`;
      }

      const activeCustomSteps = customSteps;
      const stepBeats = 4 / 16; // 0.25 beats per step

      for (let i = 0; i < 16; i++) {
        const activeRows: number[] = [];
        for (let rowIdx = 0; rowIdx < 5; rowIdx++) {
          if (activeCustomSteps[rowIdx] && activeCustomSteps[rowIdx][i]) {
            activeRows.push(rowIdx);
          }
        }

        if (activeRows.length === 0) continue;

        const currentBass = i % 8 >= 4 ? bassAlt : bassLower;
        activeRows.forEach((rowIdx) => {
          if (rowIdx === 0) {
            notes.push({
              note: currentBass,
              startBeat: baseBeat + i * stepBeats,
              durationBeats: stepBeats * 0.95,
              velocity: 0.8,
            });
          } else {
            const noteIdx = rowIdx - 1;
            if (voicing[noteIdx]) {
              notes.push({
                note: voicing[noteIdx],
                startBeat: baseBeat + i * stepBeats,
                durationBeats: stepBeats * 0.95,
                velocity: 0.7,
              });
            }
          }
        });
      }
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
    const secChords = sect.chords?.chords || [];
    if (secChords.length > 0) {
      updatedSectionNotes[sect.id] = generateSectionChordRhythmNotes(
        secChords,
        pattern,
        mode,
        customSteps,
        selectedArpeggioPattern
      );
    } else {
      updatedSectionNotes[sect.id] = [];
    }
  });

  rhythmTrack.sectionNotes = updatedSectionNotes;

  return {
    ...song,
    tracks,
  };
}
