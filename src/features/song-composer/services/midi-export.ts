import { Midi } from '@tonejs/midi';
import { SongStructure, PlayableNote } from '../schemas/song.schema';

/**
 * Convierte una estructura de canción en un archivo MIDI binario y dispara la descarga.
 */
export function exportSongToMidi(song: SongStructure) {
  try {
    const midi = new Midi();
    
    // Add song metadata
    midi.name = song.title || "Canción Generada";
    const bpm = song.tempo || 80;
    
    // Tonejs/midi doesn't have a direct global tempo setter in the top level object easily,
    // we set it in the header track.
    midi.header.setTempo(bpm);
    
    const timeSignatures = midi.header.timeSignatures;
    timeSignatures.push({ ticks: 0, timeSignature: [4, 4], measures: 0 });

    const beatDurationSec = 60 / bpm; // duration of 1 beat (quarter note) in seconds

    // 1. Export Chords (Track 1)
    const chordTrack = midi.addTrack();
    chordTrack.name = "Progresión (Acordes)";
    chordTrack.channel = 0; // MIDI channel 1

    // We need to calculate absolute start times for chords
    let currentChordTimeSec = 0;

    song.sections.forEach((sect) => {
      let sectionStartSec = currentChordTimeSec;
      
      // Export chords for this section
      if (sect.chords && sect.chords.chords) {
        let localBeat = 0;
        sect.chords.chords.forEach((chord) => {
          const durationBeats = chord.duration || 4;
          const durationSec = durationBeats * beatDurationSec;
          
          if (chord.pianoNotes && chord.pianoNotes.length > 0) {
            chord.pianoNotes.forEach(noteName => {
              chordTrack.addNote({
                name: noteName,
                time: sectionStartSec + (localBeat * beatDurationSec),
                duration: durationSec,
                velocity: 0.7 // Default velocity for chords
              });
            });
          }
          localBeat += durationBeats;
        });
        currentChordTimeSec += (localBeat * beatDurationSec);
      }
      
      // 2. Export Generated Tracks (Melody, Bass, etc.)
      if (sect.tracks && sect.tracks.length > 0) {
        sect.tracks.forEach((genTrack) => {
          // Find or create a MIDI track for this generated track based on its name/channel
          let targetTrack = midi.tracks.find(t => t.name === genTrack.name);
          if (!targetTrack) {
            targetTrack = midi.addTrack();
            targetTrack.name = genTrack.name;
            targetTrack.channel = (genTrack.midiChannel || 1) - 1; // 0-indexed
          }

          if (genTrack.notes && genTrack.notes.length > 0) {
            genTrack.notes.forEach((note: PlayableNote) => {
              // Convert beat to absolute seconds
              const noteStartSec = sectionStartSec + (note.startBeat * beatDurationSec);
              const noteDurSec = note.durationBeats * beatDurationSec;
              
              targetTrack!.addNote({
                name: note.note,
                time: noteStartSec,
                duration: noteDurSec,
                velocity: Math.max(0.1, Math.min(1.0, note.velocity || 0.8))
              });
            });
          }
        });
      }
    });

    // Serialize to binary
    const midiArray = midi.toArray();
    const blob = new Blob([midiArray], { type: "audio/midi" });
    
    // Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${song.title ? song.title.replace(/\s+/g, '_') : 'cancion_musiclab'}.mid`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

  } catch (err) {
    console.error("Error al exportar MIDI:", err);
    throw err;
  }
}
