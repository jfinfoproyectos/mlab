"use client";


interface PianoKeyboardProps {
  activeNotes: string[];
}

export function PianoKeyboard({ activeNotes }: PianoKeyboardProps) {
  const sortedNotes = [...activeNotes].sort((a, b) => {
    const semitones: Record<string, number> = {
      'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 'E': 4,
      'F': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8, 'A': 9,
      'A#': 10, 'BB': 10, 'B': 11
    };

    const getPitchValue = (noteStr: string): number => {
      const match = noteStr.toUpperCase().trim().match(/^([A-G][#B]?)([0-9])$/);
      if (!match) return 0;
      const name = match[1];
      const octave = parseInt(match[2], 10);
      const semitone = semitones[name] ?? 0;
      return octave * 12 + semitone;
    };

    return getPitchValue(a) - getPitchValue(b);
  });

  const whiteKeys = [
    { note: 'C3', label: 'C' }, { note: 'D3', label: 'D' }, { note: 'E3', label: 'E' },
    { note: 'F3', label: 'F' }, { note: 'G3', label: 'G' }, { note: 'A3', label: 'A' }, { note: 'B3', label: 'B' },
    { note: 'C4', label: 'C' }, { note: 'D4', label: 'D' }, { note: 'E4', label: 'E' },
    { note: 'F4', label: 'F' }, { note: 'G4', label: 'G' }, { note: 'A4', label: 'A' }, { note: 'B4', label: 'B' }
  ];

  const blackKeys = [
    { note: 'C#3', left: '5%' },
    { note: 'D#3', left: '12.2%' },
    { note: 'F#3', left: '26.4%' },
    { note: 'G#3', left: '33.6%' },
    { note: 'A#3', left: '40.8%' },
    { note: 'C#4', left: '55%' },
    { note: 'D#4', left: '62.2%' },
    { note: 'F#4', left: '76.4%' },
    { note: 'G#4', left: '83.6%' },
    { note: 'A#4', left: '90.8%' }
  ];

  const isNoteActive = (noteName: string) => {
    const norm = (n: string) => n.toUpperCase()
      .trim()
      .replace('DB', 'C#')
      .replace('EB', 'D#')
      .replace('GB', 'F#')
      .replace('AB', 'G#')
      .replace('BB', 'A#')
      .replace('C♭', 'B')
      .replace('E♯', 'F')
      .replace('B♯', 'C');

    const normalizedTarget = norm(noteName);
    return sortedNotes.some(active => norm(active) === normalizedTarget);
  };

  return (
    <div className="w-full">
      <div className="relative w-full h-20 bg-zinc-950 dark:bg-black border border-zinc-850 dark:border-zinc-900 rounded-2xl overflow-hidden shadow-inner flex">
        {whiteKeys.map((key) => {
          const active = isNoteActive(key.note);
          return (
            <div
              key={key.note}
              className={`flex-1 border-r border-zinc-800/60 last:border-r-0 h-full rounded-b-xl transition-all duration-100 relative ${
                active 
                  ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[inset_0_-6px_0_rgba(0,0,0,0.2),0_4px_12px_rgba(16,185,129,0.35)] text-zinc-950' 
                  : 'bg-zinc-100 dark:bg-zinc-150 hover:bg-white dark:hover:bg-zinc-50 shadow-[inset_0_-5px_0_rgba(0,0,0,0.12)]'
              }`}
            >
              {key.label === 'C' && (
                <span className={`absolute bottom-1 left-1.5 text-[8px] font-black tracking-tight ${
                  active ? 'text-zinc-950/70' : 'text-zinc-500/50 dark:text-zinc-500/50'
                }`}>
                  {key.note}
                </span>
              )}
            </div>
          );
        })}

        {blackKeys.map((key) => {
          const active = isNoteActive(key.note);
          return (
            <div
              key={key.note}
              style={{ left: key.left }}
              className={`absolute top-0 w-[4.8%] h-[58%] border border-zinc-950 rounded-b-md transition-all duration-100 z-10 ${
                active 
                  ? 'bg-gradient-to-b from-emerald-300 to-emerald-500 shadow-[0_4px_10px_rgba(52,211,153,0.45)]' 
                  : 'bg-zinc-900 hover:bg-zinc-800 shadow-[inset_0_-2px_0_rgba(255,255,255,0.08)]'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
