import {useState, useEffect, useCallback, useRef} from 'preact/hooks';
import type {ClefMode, GamePhase, Language} from '../types';
import {useGame} from '../hooks/useGame';
import {Staff} from '../components/Staff/Staff';
import {Piano} from '../components/Piano/Piano';
import {ProgressBar} from '../components/ProgressBar/ProgressBar';
import {MuteToggle} from '../components/MuteToggle/MuteToggle';
import successSvg from '../components/CatMascot/success.svg';
import errorSvg from '../components/CatMascot/error.svg';
import {allPianoKeys, getActiveRange} from '../lib/notes';
import {
  playNote,
  resumeAudioContextFromUserGesture,
  unlockAudioContextInUserGestureSync,
  warmUpPiano,
} from '../lib/audio';
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

type MascotPhase = 'correct' | 'wrong';

interface GameScreenProps {
  lang: Language;
  clefMode: ClefMode;
  onFinish: (score: number, total: number) => void;
  onBack: () => void;
}

const MASCOT_SOURCES: Record<MascotPhase, string> = {
  correct: successSvg,
  wrong: errorSvg,
};

const CAT_PEEK_DURATION_MS = 380;
const CAT_PEEK_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
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
  const lastPhaseRef = useRef<GamePhase | null>(null);
  const phaseEnteredAtRef = useRef(0);
  const phaseSequenceRef = useRef(0);
  const catPeekRef = useRef<HTMLDivElement>(null);
  const catPeekAnimationRef = useRef<Animation | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLSpanElement>(null);

  // Preload acoustic piano samples as soon as the game screen mounts
  useEffect(() => {
    warmUpPiano();
    setAudioAvailability(getAudioAvailability());
  }, []);

  useEffect(() => {
    const mascotCache: Record<MascotPhase, HTMLImageElement> = {
      correct: new Image(),
      wrong: new Image(),
    };

    const decodePromises = Object.entries(MASCOT_SOURCES).map(([phase, src]) => {
      const img = mascotCache[phase as MascotPhase];
      img.loading = 'eager';
      img.decoding = 'async';
      img.src = src;
      if (typeof img.decode === 'function') return img.decode();
      return Promise.resolve();
    });

    void Promise.allSettled(decodePromises).then((results) => {
      if (!import.meta.env.DEV) return;

      const decoded = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.length - decoded;

      console.debug('[GameScreen] cat mascots prefetch status', {
        decoded,
        failed,
        isIOS: isIOSDevice(),
      });
    });

    return () => {
      Object.values(mascotCache).forEach((img) => {
        img.src = '';
      });
    };
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

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const previousPhase = lastPhaseRef.current;
    const now = performance.now();
    if (previousPhase !== game.phase) {
      phaseSequenceRef.current += 1;
      phaseEnteredAtRef.current = now;
      console.debug('[GameScreen] phase transition', {
        sequence: phaseSequenceRef.current,
        from: previousPhase,
        to: game.phase,
        attempt: game.attempt,
        noteId: game.currentNote.id,
        highlightType: game.highlightType,
        isIOS: isIOSDevice(),
      });
    }
    lastPhaseRef.current = game.phase;
  }, [game.phase, game.currentNote.id, game.attempt, game.highlightType]);

  useEffect(() => {
    if (game.phase !== 'correct' && game.phase !== 'wrong') return;
    if (typeof window === 'undefined') return;
    const catPeek = catPeekRef.current;
    if (!catPeek) return;

    const isCompactLandscape = window.matchMedia('(orientation: landscape) and (max-height: 560px)').matches;
    const startOffsetPx = isCompactLandscape
      ? Math.min(56, Math.max(24, window.innerWidth * 0.12))
      : 28;
    const start = {
      opacity: 0,
      transform: `translateY(-50%) translate3d(${startOffsetPx}px, 0, 0)`,
    };
    const end = {
      opacity: 1,
      transform: 'translateY(-50%) translate3d(0, 0, 0)',
    };

    if (catPeekAnimationRef.current) {
      catPeekAnimationRef.current.cancel();
      catPeekAnimationRef.current = null;
    }

    const frameId = window.requestAnimationFrame(() => {
      catPeekAnimationRef.current = catPeek.animate(
        [start, end],
        {
          duration: CAT_PEEK_DURATION_MS,
          easing: CAT_PEEK_EASING,
          fill: 'forwards',
        },
      );

      if (import.meta.env.DEV) {
        const delayFromPhaseChangeMs = performance.now() - phaseEnteredAtRef.current;
        console.debug('[GameScreen] cat face animation start', {
          phase: game.phase,
          delayFromPhaseChangeMs: Number(delayFromPhaseChangeMs.toFixed(2)),
          sequence: phaseSequenceRef.current,
          attempt: game.attempt,
          noteId: game.currentNote.id,
          isIOS: isIOSDevice(),
          startOffsetPx,
        });
      }

      if (!catPeekAnimationRef.current) return;
      void catPeekAnimationRef.current.finished.finally(() => {
        if (!import.meta.env.DEV) return;
        const totalFromPhaseChangeMs = performance.now() - phaseEnteredAtRef.current;
        console.debug('[GameScreen] cat face animation end', {
          phase: game.phase,
          totalFromPhaseChangeMs: Number(totalFromPhaseChangeMs.toFixed(2)),
          sequence: phaseSequenceRef.current,
          attempt: game.attempt,
          noteId: game.currentNote.id,
          isIOS: isIOSDevice(),
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (catPeekAnimationRef.current) {
        catPeekAnimationRef.current.cancel();
      }
    };
  }, [game.phase, game.attempt, game.currentNote.id]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const root = screenRef.current;
    const header = headerRef.current;
    const feedback = feedbackRef.current;
    if (!root || !header || !feedback) return;
    const rootElement = root;
    const headerElement = header;
    const feedbackElement = feedback;

    const buttons = Array.from(headerElement.querySelectorAll('button'));
    const [backButton, muteButton] = buttons;

    function logLayout(tag: string) {
      const feedbackOverflowX = feedbackElement.scrollWidth > feedbackElement.clientWidth;
    const rootRect = rootElement.getBoundingClientRect();
    const rootStyle = window.getComputedStyle(rootElement);
      const headerRect = headerElement.getBoundingClientRect();
      const feedbackRect = feedbackElement.getBoundingClientRect();
      const pianoArea = rootElement.querySelector(`.${styles.pianoArea}`) as HTMLDivElement | null;
      const pianoRect = pianoArea?.getBoundingClientRect() ?? null;
    const supportsSubgrid = CSS.supports('grid-template-columns: subgrid');

      console.debug('[GameScreen] layout diagnostics', {
        tag,
      supportsSubgrid,
        phase: game.phase,
        attempt: game.attempt,
        noteId: game.currentNote.id,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        root: {
          width: Math.round(rootRect.width),
          height: Math.round(rootRect.height),
        computedColumns: rootStyle.gridTemplateColumns,
        columnGap: rootStyle.columnGap,
        },
        header: {
          width: Math.round(headerRect.width),
          height: Math.round(headerRect.height),
          backButton: backButton
            ? {
                width: Math.round(backButton.getBoundingClientRect().width),
                height: Math.round(backButton.getBoundingClientRect().height),
              }
            : null,
          muteButton: muteButton
            ? {
                width: Math.round(muteButton.getBoundingClientRect().width),
                height: Math.round(muteButton.getBoundingClientRect().height),
              }
            : null,
        },
        feedbackText: {
          text: feedbackElement.textContent ?? '',
          width: Math.round(feedbackRect.width),
          height: Math.round(feedbackRect.height),
          scrollWidth: Math.round(feedbackElement.scrollWidth),
          scrollHeight: Math.round(feedbackElement.scrollHeight),
          overflowX: feedbackOverflowX,
          overflowY: feedbackElement.scrollHeight > feedbackElement.clientHeight,
        },
        pianoArea: {
          height: pianoRect ? Math.round(pianoRect.height) : 0,
          width: pianoRect ? Math.round(pianoRect.width) : 0,
        },
      });
    }

    const observer = new ResizeObserver(() => {
      logLayout('resize');
    });

    observer.observe(rootElement);
    observer.observe(headerElement);
    observer.observe(feedbackElement);
    logLayout('mount');

    return () => {
      observer.disconnect();
    };
  }, [game.phase, game.attempt, game.currentNote.id, clefMode, game.highlightType]);

  const handleKeyPress = useCallback(
    async (noteId: string) => {
      if (game.phase !== 'playing' || pendingAnswerRef.current) return;
      const key = keys.find((k) => k.noteId === noteId);
      const pressedAtMs = performance.now();

      unlockAudioContextInUserGestureSync();
      const availability = await resumeAudioContextFromUserGesture();
      setAudioAvailability(availability);
      if (availability === 'unavailable') return;

      if (key) {
        playNote(key.midi);
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

  const handleKeyPointerDownAudioPrime = useCallback(() => {
    unlockAudioContextInUserGestureSync();
    void resumeAudioContextFromUserGesture().then((availability) => {
      setAudioAvailability(availability);
    });
  }, []);

  const handleMuteToggle = useCallback(async () => {
    unlockAudioContextInUserGestureSync();
    const previousAvailability = getAudioAvailability();
    const availability = await ensureAudioAvailable();
    setAudioAvailability(availability);
    if (availability === 'unavailable') return;

    if (availability === 'blocked') {
      setMutedPreference(true);
      setMutedState(true);
      return;
    }

    if (previousAvailability === 'blocked') {
      setMutedState(isMuted());
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
    <div class={styles.container} ref={screenRef}>
      {/* Header */}
      <div class={styles.header} ref={headerRef}>
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
          <span class={styles.feedbackText} ref={feedbackRef}>
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
            <div
              ref={catPeekRef}
              class={styles.catPeek}
              aria-hidden
            >
              <img
                class={styles.catPeekImg}
                src={successSvg}
                alt=""
                decoding="async"
                width="115"
                height="105"
              />
            </div>
          )}
          {game.phase === 'wrong' && (
            <div
              ref={catPeekRef}
              class={styles.catPeek}
              aria-hidden
            >
              <img
                class={styles.catPeekImg}
                src={errorSvg}
                alt=""
                decoding="async"
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
          onKeyPointerDownAudioPrime={handleKeyPointerDownAudioPrime}
          scrollToNote={game.currentNote.id}
          scrollBiasSeed={game.attempt}
          disabled={game.phase !== 'playing'}
          showKeyDebugIds={import.meta.env.DEV}
        />
      </div>
    </div>
  );
}
