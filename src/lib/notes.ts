import type { NoteDefinition, KeyDefinition, ClefMode } from '../types';

const noteNames = {
  C: { ru: 'До', en: 'C' },
  D: { ru: 'Ре', en: 'D' },
  E: { ru: 'Ми', en: 'E' },
  F: { ru: 'Фа', en: 'F' },
  G: { ru: 'Соль', en: 'G' },
  A: { ru: 'Ля', en: 'A' },
  B: { ru: 'Си', en: 'B' },
};

const octaveNames: Record<number, { ru: string; en: string }> = {
  2: { ru: 'большая октава', en: 'great octave' },
  3: { ru: 'малая октава', en: 'small octave' },
  4: { ru: 'первая октава', en: '1st octave' },
  5: { ru: 'вторая октава', en: '2nd octave' },
  6: { ru: 'третья октава', en: '3rd octave' },
};

type NoteLetter = keyof typeof noteNames;
const whiteNoteOrder: NoteLetter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const PIANO_START_NOTE_ID = 'B1';
const PIANO_END_NOTE_ID = 'E6';

function midiNumber(note: NoteLetter, octave: number): number {
  const semitones: Record<NoteLetter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return 12 * (octave + 1) + semitones[note];
}

/**
 * Staff position: number of half-steps from the bottom line of the staff.
 * Treble clef bottom line = E4 (position 0), each line/space goes up by 1.
 * Bass clef bottom line = G2 (position 0), each line/space goes up by 1.
 * The position maps to vertical Y on the staff SVG.
 */
const trebleStaffBase = ['E', 4] as const; // bottom line
const bassStaffBase = ['G', 2] as const;   // bottom line

const diatonicIndex: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

function staffPosition(note: NoteLetter, octave: number, clef: 'treble' | 'bass'): number {
  const [baseName, baseOctave] = clef === 'treble' ? trebleStaffBase : bassStaffBase;
  const baseIdx = diatonicIndex[baseName] + baseOctave * 7;
  const noteIdx = diatonicIndex[note] + octave * 7;
  return noteIdx - baseIdx;
}

function createNote(note: NoteLetter, octave: number, clef: 'treble' | 'bass'): NoteDefinition {
  return {
    id: `${note}${octave}`,
    midi: midiNumber(note, octave),
    staffPosition: staffPosition(note, octave, clef),
    clef,
    name: noteNames[note],
    octave: octaveNames[octave],
    isBlack: false,
  };
}

export const trebleNotes: NoteDefinition[] = (() => {
  const notes: NoteDefinition[] = [];
  for (const n of whiteNoteOrder) notes.push(createNote(n, 4, 'treble')); // 1st octave
  for (const n of whiteNoteOrder) notes.push(createNote(n, 5, 'treble')); // 2nd octave
  return notes.filter((note) => note.midi <= midiNumber('F', 5));
})();

export const bassNotes: NoteDefinition[] = (() => {
  const notes: NoteDefinition[] = [];
  // Great octave starting from E
  for (const n of ['E', 'F', 'G', 'A', 'B'] as NoteLetter[]) notes.push(createNote(n, 2, 'bass'));
  // Small octave full
  for (const n of whiteNoteOrder) notes.push(createNote(n, 3, 'bass'));
  // 1st octave up to E
  for (const n of ['C', 'D', 'E'] as NoteLetter[]) notes.push(createNote(n, 4, 'bass'));
  return notes;
})();

export function getNotesForMode(mode: ClefMode): NoteDefinition[] {
  if (mode === 'treble') return trebleNotes;
  if (mode === 'bass') return bassNotes;
  return [...bassNotes, ...trebleNotes];
}

const sharpNames: Record<string, { ru: string; en: string }> = {
  C: { ru: 'До#', en: 'C#' },
  D: { ru: 'Ре#', en: 'D#' },
  F: { ru: 'Фа#', en: 'F#' },
  G: { ru: 'Соль#', en: 'G#' },
  A: { ru: 'Ля#', en: 'A#' },
};

const blackAfterNotes: NoteLetter[] = ['C', 'D', 'F', 'G', 'A'];

/** Visible keyboard range for game screen: E1 to F5 (inclusive). */
export const allPianoKeys: KeyDefinition[] = (() => {
  const keys: KeyDefinition[] = [];

  // A0, B0
  for (const n of ['A', 'B'] as NoteLetter[]) {
    keys.push({ noteId: `${n}0`, midi: midiNumber(n, 0), isBlack: false, label: noteNames[n] });
  }
  // A#0 (Bb0)
  keys.push({ noteId: 'A#0', midi: midiNumber('A', 0) + 1, isBlack: true, label: sharpNames['A'] });

  // Octaves 1-7: full
  for (let oct = 1; oct <= 7; oct++) {
    for (const n of whiteNoteOrder) {
      keys.push({ noteId: `${n}${oct}`, midi: midiNumber(n, oct), isBlack: false, label: noteNames[n] });
    }
    for (const n of blackAfterNotes) {
      keys.push({ noteId: `${n}#${oct}`, midi: midiNumber(n, oct) + 1, isBlack: true, label: sharpNames[n] });
    }
  }

  // C8
  keys.push({ noteId: 'C8', midi: midiNumber('C', 8), isBlack: false, label: noteNames['C'] });

  keys.sort((a, b) => a.midi - b.midi);
  const startMidi = keys.find((key) => key.noteId === PIANO_START_NOTE_ID)?.midi ?? 0;
  const endMidi = keys.find((key) => key.noteId === PIANO_END_NOTE_ID)?.midi ?? 127;
  return keys.filter((key) => key.midi >= startMidi && key.midi <= endMidi);
})();

export function getActiveRange(mode: ClefMode): { startNoteId: string; endNoteId: string } {
  if (mode === 'treble') return { startNoteId: 'C4', endNoteId: 'F5' };
  if (mode === 'bass') return { startNoteId: 'E2', endNoteId: 'E4' };
  return { startNoteId: 'E2', endNoteId: 'F5' };
}

export function getRandomNote(notes: NoteDefinition[]): NoteDefinition {
  return notes[Math.floor(Math.random() * notes.length)];
}
