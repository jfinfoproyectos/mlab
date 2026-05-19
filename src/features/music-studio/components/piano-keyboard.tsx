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
    <div className="w-full space-y-1.5 pt-3 border-t border-border/50">
      <div className="flex justify-between items-center text-[9px] text-muted-foreground font-semibold px-0.5">
        <span>Disposición en Piano</span>
        <span className="font-mono text-[8px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 select-all">
          {sortedNotes.join(' ')}
        </span>
      </div>
      
      <div className="relative w-full h-11 bg-background border border-border rounded-lg overflow-hidden shadow-inner flex">
        {whiteKeys.map((key) => {
          const active = isNoteActive(key.note);
          return (
            <div
              key={key.note}
              className={`flex-1 border-r border-muted-foreground/15 last:border-r-0 h-full rounded-b transition-colors duration-75 relative ${
                active 
                  ? 'bg-primary text-primary-foreground shadow-none' 
                  : 'bg-background hover:bg-muted/50'
              }`}
            >
              {key.label === 'C' && (
                <span className={`absolute bottom-0.5 left-0.5 text-[7px] font-black tracking-tighter ${
                  active ? 'text-primary-foreground/75' : 'text-muted-foreground/30'
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
              className={`absolute top-0 w-[4.8%] h-[58%] border border-black/35 rounded-b transition-colors duration-75 z-10 ${
                active 
                  ? 'bg-primary shadow-none' 
                  : 'bg-zinc-950 dark:bg-zinc-900 border-zinc-900'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
