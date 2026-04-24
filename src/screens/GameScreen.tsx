import {useState, useEffect, useCallback} from 'preact/hooks';
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
import {isMuted, toggleMute} from '../lib/audio';
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
  const game = useGame(clefMode);
  const keys = allPianoKeys;
  const {startNoteId, endNoteId} = getActiveRange(clefMode);
  const [muted, setMuted] = useState(isMuted());

  // Preload acoustic piano samples as soon as the game screen mounts
  useEffect(() => {
    warmUpPiano();
  }, []);

  useEffect(() => {
    if (game.phase === 'finished') {
      onFinish(game.score, game.totalAttempts);
    }
  }, [game.phase, game.score, game.totalAttempts, onFinish]);

  const handleKeyPress = useCallback(
    (noteId: string) => {
      if (game.phase !== 'playing') return;
      const key = keys.find((k) => k.noteId === noteId);
      if (key) {
        playNote(key.midi);
      }
      game.checkAnswer(noteId);
    },
    [game, keys],
  );

  const handleMuteToggle = useCallback(() => {
    toggleMute();
    setMuted(isMuted());
  }, []);

  let feedbackState: 'none' | 'correct' | 'wrong' = 'none';
  if (game.phase === 'correct') feedbackState = 'correct';
  if (game.phase === 'wrong') feedbackState = 'wrong';

  const noteName = game.currentNote.name[lang];

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
                {t('playNote')} <strong>{noteName}</strong>
              </>
            ) : (
              feedbackText
            )}
          </span>
        </div>

        <MuteToggle muted={muted} onToggle={handleMuteToggle} />
      </div>

      {/* Progress bar */}
      <div class={styles.progressWrap}>
        <ProgressBar current={game.attempt} total={game.totalAttempts} />
      </div>

      {/* Staff area */}
      <div class={styles.staffArea}>
        <Staff note={game.currentNote} feedback={feedbackState} />

        {game.phase === 'correct' && (
          <div class={styles.catPeek}>
            <img src={successSvg} alt="" width="115" height="105" />
          </div>
        )}
        {game.phase === 'wrong' && (
          <div class={styles.catPeek}>
            <img src={errorSvg} alt="" width="127" height="81" />
          </div>
        )}
      </div>

      {/* Piano keyboard */}
      <div class={styles.pianoArea}>
        <Piano
          keys={keys}
          activeStartId={startNoteId}
          activeEndId={endNoteId}
          highlightKey={game.highlightKey}
          highlightType={game.highlightType}
          onKeyPress={handleKeyPress}
          scrollToNote={game.currentNote.id}
          disabled={game.phase !== 'playing'}
        />
      </div>
    </div>
  );
}
