import { useState, useCallback, useRef } from 'preact/hooks';
import type { ClefMode, NoteDefinition, GamePhase, LessonAttempt } from '../types';
import { getNotesForMode, getRandomNote } from '../lib/notes';
import { vibrateCorrect, vibrateWrong } from '../lib/haptic';

const ATTEMPTS_PER_LESSON = 8;

interface GameState {
  currentNote: NoteDefinition;
  attempt: number;
  score: number;
  phase: GamePhase;
  attempts: LessonAttempt[];
  highlightKey: string | null;
  highlightType: 'correct' | 'wrong' | null;
}

function pickNextNote(notes: NoteDefinition[], lastNote: NoteDefinition | null): NoteDefinition {
  if (notes.length <= 1) return notes[0];
  let next: NoteDefinition;
  do {
    next = getRandomNote(notes);
  } while (lastNote && next.id === lastNote.id);
  return next;
}

export function useGame(clefMode: ClefMode) {
  const notes = getNotesForMode(clefMode);
  const lastNoteRef = useRef<NoteDefinition | null>(null);

  const [state, setState] = useState<GameState>(() => {
    const first = pickNextNote(notes, null);
    lastNoteRef.current = first;
    return {
      currentNote: first,
      attempt: 0,
      score: 0,
      phase: 'playing',
      attempts: [],
      highlightKey: null,
      highlightType: null,
    };
  });

  const checkAnswer = useCallback(
    (noteId: string, pressedAtMs?: number) => {
      if (state.phase !== 'playing') return;

      const isCorrect = noteId === state.currentNote.id;
      if (import.meta.env.DEV) {
        console.debug('[Game] feedback state commit', {
          noteId,
          expectedNoteId: state.currentNote.id,
          isCorrect,
          inputToFeedbackMs:
            typeof pressedAtMs === 'number'
              ? Math.round((performance.now() - pressedAtMs) * 100) / 100
              : null,
        });
      }

      if (isCorrect) {
        vibrateCorrect();
      } else {
        vibrateWrong();
      }

      setState((prev) => ({
        ...prev,
        phase: isCorrect ? 'correct' : 'wrong',
        highlightKey: noteId,
        highlightType: isCorrect ? 'correct' : 'wrong',
      }));

      if (isCorrect) {
        setTimeout(() => {
          setState((prev) => {
            const newAttempts = [...prev.attempts, { noteId: prev.currentNote.id, correct: true }];
            const newAttempt = prev.attempt + 1;
            const newScore = prev.score + 1;

            if (newAttempt >= ATTEMPTS_PER_LESSON) {
              return {
                ...prev,
                attempt: newAttempt,
                score: newScore,
                phase: 'finished',
                attempts: newAttempts,
                highlightKey: null,
                highlightType: null,
              };
            }

            const nextNote = pickNextNote(notes, lastNoteRef.current);
            lastNoteRef.current = nextNote;

            return {
              ...prev,
              currentNote: nextNote,
              attempt: newAttempt,
              score: newScore,
              phase: 'playing',
              attempts: newAttempts,
              highlightKey: null,
              highlightType: null,
            };
          });
        }, 1200);
      } else {
        setTimeout(() => {
          setState((prev) => {
            const newAttempts = [...prev.attempts, { noteId: prev.currentNote.id, correct: false }];
            const newAttempt = prev.attempt + 1;

            if (newAttempt >= ATTEMPTS_PER_LESSON) {
              return {
                ...prev,
                attempt: newAttempt,
                phase: 'finished',
                attempts: newAttempts,
                highlightKey: null,
                highlightType: null,
              };
            }

            const nextNote = pickNextNote(notes, lastNoteRef.current);
            lastNoteRef.current = nextNote;

            return {
              ...prev,
              currentNote: nextNote,
              attempt: newAttempt,
              phase: 'playing',
              attempts: newAttempts,
              highlightKey: null,
              highlightType: null,
            };
          });
        }, 1500);
      }
    },
    [state.phase, state.currentNote.id, notes],
  );

  const reset = useCallback(() => {
    const first = pickNextNote(notes, null);
    lastNoteRef.current = first;
    setState({
      currentNote: first,
      attempt: 0,
      score: 0,
      phase: 'playing',
      attempts: [],
      highlightKey: null,
      highlightType: null,
    });
  }, [notes]);

  return {
    ...state,
    totalAttempts: ATTEMPTS_PER_LESSON,
    checkAnswer,
    reset,
  };
}
