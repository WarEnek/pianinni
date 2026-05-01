export type Language = 'ru' | 'en' | 'ja';
export type ClefMode = 'treble' | 'bass' | 'mixed';

export interface NoteDefinition {
  id: string;
  midi: number;
  staffPosition: number;
  clef: 'treble' | 'bass';
  name: Record<Language, string>;
  octave: Record<Language, string>;
  isBlack: boolean;
}

export interface KeyDefinition {
  noteId: string;
  midi: number;
  isBlack: boolean;
  label: Record<Language, string>;
}

export interface LessonAttempt {
  noteId: string;
  correct: boolean;
}

export interface LessonResult {
  clefMode: ClefMode;
  score: number;
  total: number;
  attempts: LessonAttempt[];
  playedAt: string;
}

export interface UserProgress {
  totalLessons: number;
  totalCorrect: number;
  totalWrong: number;
  lastPlayedAt: string | null;
}

export type GamePhase = 'playing' | 'correct' | 'wrong' | 'finished';
