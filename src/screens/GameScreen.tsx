import {useState, useEffect, useCallback, useRef} from 'preact/hooks';
import type {ClefMode, Language} from '../types';
import {useGame} from '../hooks/useGame';
import {Staff} from '../components/Staff/Staff';
import {Piano} from '../components/Piano/Piano';
import {ProgressBar} from '../components/ProgressBar/ProgressBar';
import {MuteToggle} from '../components/MuteToggle/MuteToggle';
import successSvg from '../components/CatMascot/success.svg';
import errorSvg from '../components/CatMascot/error.svg';
import {allPianoKeys, getActiveRange} from '../lib/notes';
import {playNote, warmUpPiano} from '../lib/audio';
import {
  ensureAudioAvailable,
  getAudioAvailability,
  isMuted,
  setMuted as setMutedPreference,
  toggleMute,
} from '../lib/audio';
import type {AudioAvailability} from '../lib/audio';
import {t} from '../lib/i18n';
import styles from './GameScreen.module.css';

interface GameScreenProps {
  lang: Language;
  clefMode: ClefMode;
  onFinish: (score: number, total: number) => void;
  onBack: () => void;
}

export function GameScreen({
  lang,
  clefMode,
  onFinish,
  onBack,
}: GameScreenProps) {
  const ANSWER_FEEDBACK_DELAY_MS = 30;
  const game = useGame(clefMode);
  const keys = allPianoKeys;
  const {startNoteId, endNoteId} = getActiveRange(clefMode);
  const [muted, setMutedState] = useState(isMuted());
  const [audioAvailability, setAudioAvailability] = useState<AudioAvailability>(
    getAudioAvailability(),
  );
  const pendingAnswerRef = useRef(false);

  // Preload acoustic piano samples as soon as the game screen mounts
  useEffect(() => {
    warmUpPiano();
    setAudioAvailability(getAudioAvailability());
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const firstKey = keys[0]?.noteId ?? null;
    const lastKey = keys[keys.length - 1]?.noteId ?? null;
    console.debug('[Piano] visible keyboard range', {
      firstKey,
      lastKey,
      totalKeys: keys.length,
      startNoteId,
      endNoteId,
      clefMode,
    });
  }, [keys, startNoteId, endNoteId, clefMode]);

  useEffect(() => {
    if (game.phase === 'finished') {
      onFinish(game.score, game.totalAttempts);
    }
  }, [game.phase, game.score, game.totalAttempts, onFinish]);

  const handleKeyPress = useCallback(
    (noteId: string) => {
      if (game.phase !== 'playing' || pendingAnswerRef.current) return;
      const key = keys.find((k) => k.noteId === noteId);
      const pressedAtMs = performance.now();
      if (key) {
        playNote(key.midi);
        setAudioAvailability(getAudioAvailability());
      }
      if (import.meta.env.DEV) {
        console.debug('[Game] piano key press', {
          pressedNoteId: noteId,
          pressedMidi: key?.midi,
          expectedNoteId: game.currentNote.id,
          expectedMidi: game.currentNote.midi,
          feedbackDelayMs: ANSWER_FEEDBACK_DELAY_MS,
        });
      }
      pendingAnswerRef.current = true;
      window.setTimeout(() => {
        game.checkAnswer(noteId, pressedAtMs);
        pendingAnswerRef.current = false;
      }, ANSWER_FEEDBACK_DELAY_MS);
    },
    [game, keys, ANSWER_FEEDBACK_DELAY_MS],
  );

  const handleMuteToggle = useCallback(async () => {
    const availability = await ensureAudioAvailable();
    setAudioAvailability(availability);
    if (availability === 'unavailable') return;

    if (availability === 'blocked') {
      setMutedPreference(true);
      setMutedState(true);
      return;
    }

    toggleMute();
    setMutedState(isMuted());
  }, []);

  let feedbackState: 'none' | 'correct' | 'wrong' = 'none';
  if (game.phase === 'correct') feedbackState = 'correct';
  if (game.phase === 'wrong') feedbackState = 'wrong';

  const noteName = game.currentNote.name[lang];
  const octaveName = game.currentNote.octave[lang];

  let feedbackText = `${t('playNote')} `;
  if (game.phase === 'correct') {
    feedbackText = t('purrfecto');
  } else if (game.phase === 'wrong') {
    feedbackText = t('tryAgain');
  }

  return (
    <div class={styles.container}>
      {/* Header */}
      <div class={styles.header}>
        <button class={styles.backBtn} onClick={onBack} aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="var(--color-text)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <div class={styles.headerCenter}>
          <span class={styles.feedbackText}>
            {game.phase === 'playing' ? (
              <>
                {t('playNote')}{' '}
                <strong>
                  {noteName}, {octaveName}
                </strong>
                {import.meta.env.DEV && (
                  <span class={styles.debugNoteId}> ({game.currentNote.id})</span>
                )}
              </>
            ) : (
              feedbackText
            )}
          </span>
        </div>

        <MuteToggle
          muted={muted}
          audioAvailability={audioAvailability}
          onToggle={handleMuteToggle}
        />
      </div>

      {/* Progress bar */}
      <div class={styles.progressWrap}>
        <ProgressBar current={game.attempt} total={game.totalAttempts} />
      </div>

      {/* Staff area */}
      <div class={styles.staffArea}>
        <div class={styles.staffStage}>
          <Staff note={game.currentNote} feedback={feedbackState} />

          {game.phase === 'correct' && (
            <div class={styles.catPeek} aria-hidden>
              <img
                class={styles.catPeekImg}
                src={successSvg}
                alt=""
                width="115"
                height="105"
              />
            </div>
          )}
          {game.phase === 'wrong' && (
            <div class={styles.catPeek} aria-hidden>
              <img
                class={styles.catPeekImg}
                src={errorSvg}
                alt=""
                width="127"
                height="81"
              />
            </div>
          )}
        </div>
      </div>

      {/* Piano keyboard */}
      <div class={styles.pianoArea}>
        <Piano
          keys={keys}
          lang={lang}
          activeStartId={startNoteId}
          highlightKey={game.highlightKey}
          highlightType={game.highlightType}
          onKeyPress={handleKeyPress}
          scrollToNote={game.currentNote.id}
          scrollBiasSeed={game.attempt}
          disabled={game.phase !== 'playing'}
          showKeyDebugIds={import.meta.env.DEV}
        />
      </div>
    </div>
  );
}
