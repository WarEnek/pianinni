import { useRef, useEffect, useMemo } from 'preact/hooks';
import type { KeyDefinition, Language } from '../../types';
import { getOctaveDisplayName } from '../../lib/notes';
import { useCompactLandscape } from '../../lib/breakpoints';
import { unlockAudioContextInUserGestureSync } from '../../lib/audio';
import styles from './Piano.module.css';

/** Target key center lands between these horizontal ratios of the viewport (0 = left edge). */
const VISION_BIAS_MIN = 0.18;
const VISION_BIAS_MAX = 0.82;
const TAP_MOVE_THRESHOLD_PX = 8;

interface PendingPointerPress {
  pointerId: number;
  noteId: string;
  startX: number;
  startY: number;
  moved: boolean;
}

const octavePalette: Record<number, { backgroundColor: string; color: string }> = {
  0: { backgroundColor: '#FFCDC1', color: '#C78C7E' }, // Sub-octave
  1: { backgroundColor: '#F7D5AE', color: '#C09F7A' }, // Contra octave
  2: { backgroundColor: '#E2DFAE', color: '#ABA879' }, // Great octave
  3: { backgroundColor: '#D1E0B1', color: '#9EAD80' }, // Small octave
  4: { backgroundColor: '#BCE5C2', color: '#8DB493' }, // 1st octave
  5: { backgroundColor: '#A7E6E6', color: '#74B3B3' }, // 2nd octave
  6: { backgroundColor: '#B0DCFC', color: '#82ABCB' }, // 3rd octave
  7: { backgroundColor: '#D5CEFD', color: '#9F99C5' }, // 4th octave
  8: { backgroundColor: '#F2C6E5', color: '#BD94B2' }, // 5th octave
};

function visionBiasFromSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = (h >>> 0) / 0x1_0000_0000;
  return VISION_BIAS_MIN + u * (VISION_BIAS_MAX - VISION_BIAS_MIN);
}

type LapkaTone = 'neutral' | 'correct' | 'wrong';

const LAPKA_TONE_CLASS: Record<LapkaTone, string> = {
  neutral: '',
  correct: styles.middleCLapkaToneCorrect,
  wrong: styles.middleCLapkaToneWrong,
};

function MiddleCLapka({ tone }: { tone: LapkaTone }) {
  return (
    <span class={`${styles.middleCLapka} ${LAPKA_TONE_CLASS[tone]}`} aria-hidden>
      <svg class={styles.middleCLapkaSvg} viewBox="0 0 36 33" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M30.0876 24.0109C30.0876 26.7494 28.2215 28.5848 26.3399 30.3805C24.397 32.2212 21.043 32.9395 18.0776 32.9395C14.8667 32.9395 11.5127 32.064 9.54932 29.9765C7.89275 28.2256 7.08765 26.9045 7.08765 24.368C7.08765 21.3375 8.19197 19.4094 10.5205 17.2252C12.4347 15.4295 12.2369 12.9394 18.0776 12.9395C23.9182 12.9395 30.0876 18.489 30.0876 24.0109Z"
          fill="currentColor"
        />
        <path
          d="M25.2863 5.46087C25.5168 7.53433 24.0229 9.4021 21.9494 9.63266C19.876 9.86322 18.0082 8.36926 17.7776 6.2958C17.3981 2.88278 18.8513 0.648056 20.9247 0.417496C22.9982 0.186937 25.0557 3.38741 25.2863 5.46087Z"
          fill="currentColor"
        />
        <path
          d="M8.08765 6.27279C8.08765 8.29783 9.65465 9.93945 11.5876 9.93945C13.5206 9.93945 15.0876 8.29783 15.0876 6.27279C15.0876 2.93945 13.5206 0.939453 11.5876 0.939453C9.65465 0.939453 8.08765 4.24774 8.08765 6.27279Z"
          fill="currentColor"
        />
        <path
          d="M34.7725 11.6567C34.9465 13.7356 33.4022 15.562 31.3232 15.736C29.2443 15.91 27.4179 14.3657 27.2439 12.2868C26.9575 8.86466 28.471 6.67035 30.55 6.49636C32.6289 6.32237 34.5985 9.57771 34.7725 11.6567Z"
          fill="currentColor"
        />
        <path
          d="M0.315151 15.0908C0.14116 17.1697 1.68545 18.9961 3.76442 19.1701C5.84339 19.3441 7.66977 17.7998 7.84376 15.7208C8.13016 12.2987 6.61667 10.1044 4.5377 9.93044C2.45873 9.75645 0.489143 13.0118 0.315151 15.0908Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

interface PianoProps {
  keys: KeyDefinition[];
  lang: Language;
  activeStartId: string;
  highlightKey: string | null;
  highlightType: 'correct' | 'wrong' | null;
  onKeyPress: (noteId: string) => void;
  scrollToNote?: string;
  /** Varies each new question so the target key sits at a different horizontal spot in the viewport. */
  scrollBiasSeed?: number;
  disabled?: boolean;
  /** When true, renders scientific note id (e.g. A5) on each key for local debugging. */
  showKeyDebugIds?: boolean;
  onKeyPointerDownAudioPrime?: () => void;
}

export function Piano({
  keys,
  lang,
  activeStartId,
  highlightKey,
  highlightType,
  onKeyPress,
  scrollToNote,
  scrollBiasSeed = 0,
  disabled = false,
  showKeyDebugIds = false,
  onKeyPointerDownAudioPrime,
}: PianoProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const pendingPressRef = useRef<PendingPointerPress | null>(null);

  const whiteKeys = useMemo(() => keys.filter((k) => !k.isBlack), [keys]);
  const blackKeys = useMemo(() => keys.filter((k) => k.isBlack), [keys]);
  const compactLandscape = useCompactLandscape();
  /** Narrow landscape: slightly smaller keys; octave strip −35% vs prior landscape strip. */
  const WHITE_KEY_WIDTH = compactLandscape ? 43 : 48;
  const BLACK_KEY_WIDTH = compactLandscape ? 27 : 30;
  const OCTAVE_STRIP_HEIGHT = compactLandscape ? 18 : 34;

  useEffect(() => {
    if (!hasScrolledRef.current && scrollRef.current) {
      const startEl = scrollRef.current.querySelector(`[data-note="${activeStartId}"]`);
      if (startEl) {
        const container = scrollRef.current;
        const keyRect = (startEl as HTMLElement).offsetLeft;
        const padding = 20;
        container.scrollLeft = Math.max(0, keyRect - padding);
        hasScrolledRef.current = true;
      }
    }
  }, [activeStartId]);

  useEffect(() => {
    if (!scrollToNote || !scrollRef.current) return;

    const el = scrollRef.current.querySelector(`[data-note="${scrollToNote}"]`) as HTMLElement | null;
    if (!el) return;

    const container = scrollRef.current;
    const cw = container.clientWidth;
    const maxScroll = Math.max(0, container.scrollWidth - cw);
    if (maxScroll <= 0) return;

    const keyLeft = el.offsetLeft;
    const keyRight = el.offsetLeft + el.offsetWidth;
    const keyCenter = (keyLeft + keyRight) / 2;

    const visionBias = visionBiasFromSeed(`${scrollToNote}:${scrollBiasSeed}`);
    const edgePad = 20;

    let scroll = keyCenter - cw * visionBias;
    scroll = Math.max(0, Math.min(maxScroll, scroll));

    let viewStart = scroll;
    let viewEnd = scroll + cw;
    if (keyLeft < viewStart + edgePad) {
      scroll = keyLeft - edgePad;
    } else if (keyRight > viewEnd - edgePad) {
      scroll = keyRight - cw + edgePad;
    }
    scroll = Math.max(0, Math.min(maxScroll, scroll));

    container.scrollTo({ left: scroll, behavior: 'smooth' });
  }, [scrollToNote, scrollBiasSeed]);

  const totalWidth = whiteKeys.length * WHITE_KEY_WIDTH;

  const octaveBands = useMemo(() => {
    const groupedByOctave = new Map<number, { startWhiteIdx: number; whiteCount: number }>();

    whiteKeys.forEach((key, idx) => {
      const octaveMatch = key.noteId.match(/(\d+)$/);
      if (!octaveMatch) return;
      const octave = Number(octaveMatch[1]);
      const current = groupedByOctave.get(octave);

      if (current) {
        current.whiteCount += 1;
      } else {
        groupedByOctave.set(octave, { startWhiteIdx: idx, whiteCount: 1 });
      }
    });

    return Array.from(groupedByOctave.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([octave, group]) => {
        const leftPx = group.startWhiteIdx * WHITE_KEY_WIDTH;
        const widthPx = group.whiteCount * WHITE_KEY_WIDTH;
        return {
          octave,
          startWhiteIdx: group.startWhiteIdx,
          whiteCount: group.whiteCount,
          leftPx,
          widthPx,
          label: getOctaveDisplayName(octave, lang),
          palette: octavePalette[octave] ?? { backgroundColor: '#EAEAEA', color: '#7A7A7A' },
        };
      });
  }, [whiteKeys, WHITE_KEY_WIDTH, lang]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const hypotheses = [
      'white key grouping mismatch',
      'absolute-position width drift',
      'visible-range boundary mismatch',
      'octave label mapping mismatch',
      'z-index layer overlap',
      'landscape compact-height clipping',
    ];
    const likelySources = ['white key grouping mismatch', 'z-index layer overlap'];
    const octaveMapDiagnostics = octaveBands.map((band) => `${band.octave} -> ${band.label}`);
    const computedBandsWidth = octaveBands.reduce((sum, band) => sum + band.widthPx, 0);

    console.debug('[Piano] octave strip diagnostics', {
      hypotheses,
      likelySources,
      bands: octaveBands.map((band) => ({
        octave: band.octave,
        startWhiteIdx: band.startWhiteIdx,
        whiteCount: band.whiteCount,
        leftPx: band.leftPx,
        widthPx: band.widthPx,
      })),
      octaveMapDiagnostics,
      totalWidth,
      computedBandsWidth,
    });
  }, [octaveBands, totalWidth]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!scrollRef.current) return;

    const container = scrollRef.current;
    const keyboard = container.firstElementChild as HTMLElement | null;
    if (!keyboard) return;

    const keyRows = Array.from(keyboard.querySelectorAll(`button`));
    const firstKey = keyRows[0] as HTMLButtonElement | undefined;
    const lastKey = keyRows[keyRows.length - 1] as HTMLButtonElement | undefined;

    const headerTextWidth = keyRows.reduce((acc, node) => acc + (node as HTMLElement).scrollWidth, 0);
    const compactLabelOverflow = Array.from(keyRows).some((node) => {
      const el = node as HTMLButtonElement;
      return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
    });

    console.debug('[Piano] render size diagnostics', {
      compactLandscape,
      compact: compactLandscape,
      container: {
        width: Math.round(container.clientWidth),
        height: Math.round(container.clientHeight),
        scrollWidth: Math.round(container.scrollWidth),
        scrollHeight: Math.round(container.scrollHeight),
      },
      keyboard: {
        width: Math.round(keyboard.getBoundingClientRect().width),
        height: Math.round(keyboard.getBoundingClientRect().height),
      },
      expectedTotalWidth: Math.round(totalWidth),
      renderedKeyCount: keyRows.length,
      compactLabelOverflow,
      headerTextWidth,
      firstNote: firstKey?.dataset.note ?? null,
      lastNote: lastKey?.dataset.note ?? null,
      widths: {
        white: WHITE_KEY_WIDTH,
        black: BLACK_KEY_WIDTH,
      },
      stripHeight: OCTAVE_STRIP_HEIGHT,
    });
  }, [compactLandscape, totalWidth, activeStartId]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!highlightKey || !highlightType) {
      console.debug('[Piano] highlight state empty', {
        highlightKey,
        highlightType,
      });
      return;
    }

    const targetKey = keys.find((key) => key.noteId === highlightKey);
    if (!targetKey) {
      console.warn('[Piano] highlight key missing in render set', {
        highlightKey,
      });
      return;
    }

    const isBlack = targetKey.isBlack;
    let appliedKeyClass = '';
    if (isBlack) {
      if (highlightType === 'correct') appliedKeyClass = styles.blackKeyCorrect;
      if (highlightType === 'wrong') appliedKeyClass = styles.blackKeyWrong;
    } else {
      if (highlightType === 'correct') appliedKeyClass = styles.keyCorrect;
      if (highlightType === 'wrong') appliedKeyClass = styles.keyWrong;
    }

    let lapkaTone = 'neutral' as LapkaTone;
    if (targetKey.noteId === 'C4') {
      if (highlightType === 'correct') lapkaTone = 'correct';
      if (highlightType === 'wrong') lapkaTone = 'wrong';
    }

    console.debug('[Piano] highlight resolved', {
      noteId: targetKey.noteId,
      keyType: isBlack ? 'black' : 'white',
      highlightType,
      targetMidi: targetKey.midi,
      appliedKeyClass,
      lapkaTone,
      activeStartId,
      totalKeys: keys.length,
    });
  }, [highlightKey, highlightType, keys, activeStartId]);

  function getWhiteKeyIndex(noteId: string): number {
    return whiteKeys.findIndex((k) => k.noteId === noteId);
  }

  function getBlackKeyLeft(bk: KeyDefinition): number | null {
    const leftWhiteMidi = bk.midi - 1;
    const leftWhiteIdx = whiteKeys.findIndex((k) => k.midi === leftWhiteMidi);
    if (leftWhiteIdx < 0) return null;
    return (leftWhiteIdx + 1) * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2;
  }

  function clearPendingPress() {
    pendingPressRef.current = null;
  }

  function handleKeyPointerDown(event: PointerEvent, noteId: string) {
    if (disabled) return;
    unlockAudioContextInUserGestureSync();
    pendingPressRef.current = {
      pointerId: event.pointerId,
      noteId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    if (onKeyPointerDownAudioPrime) {
      onKeyPointerDownAudioPrime();
    }
  }

  function handleKeyPointerMove(event: PointerEvent) {
    const pendingPress = pendingPressRef.current;
    if (!pendingPress || pendingPress.pointerId !== event.pointerId) return;

    const movedX = Math.abs(event.clientX - pendingPress.startX);
    const movedY = Math.abs(event.clientY - pendingPress.startY);
    if (movedX > TAP_MOVE_THRESHOLD_PX || movedY > TAP_MOVE_THRESHOLD_PX) {
      pendingPress.moved = true;
    }
  }

  function handleKeyPointerUp(event: PointerEvent, noteId: string) {
    const pendingPress = pendingPressRef.current;
    if (!pendingPress || pendingPress.pointerId !== event.pointerId) return;

    const shouldPlayNote = !disabled && !pendingPress.moved && pendingPress.noteId === noteId;
    if (import.meta.env.DEV) {
      console.debug('[Piano] pointer gesture resolved', {
        noteId,
        moved: pendingPress.moved,
        played: shouldPlayNote,
      });
    }

    clearPendingPress();
    if (shouldPlayNote) {
      onKeyPress(noteId);
    }
  }

  return (
    <div class={styles.pianoWrapper}>
      <div class={styles.pianoScroll} ref={scrollRef}>
        <div
          class={styles.pianoKeys}
          style={{ width: `${totalWidth}px`, '--octave-strip-height': `${OCTAVE_STRIP_HEIGHT}px` }}
        >
          <div class={styles.octaveStripLayer} aria-hidden="true">
            {octaveBands.map((band) => (
              <div
                key={`octave-${band.octave}`}
                class={styles.octaveStrip}
                style={{
                  left: `${band.leftPx}px`,
                  width: `${band.widthPx}px`,
                  backgroundColor: band.palette.backgroundColor,
                }}
              >
                <span class={styles.octaveStripLabel} style={{ color: band.palette.color }}>
                  {band.label}
                </span>
              </div>
            ))}
          </div>

          {whiteKeys.map((key) => {
            const idx = getWhiteKeyIndex(key.noteId);
            let extraClass = '';
            if (highlightKey === key.noteId && highlightType === 'correct') extraClass = styles.keyCorrect;
            if (highlightKey === key.noteId && highlightType === 'wrong') extraClass = styles.keyWrong;

            const isMiddleC = key.noteId === 'C4';
            let lapkaTone: LapkaTone = 'neutral';
            if (isMiddleC && highlightKey === key.noteId) {
              if (highlightType === 'correct') lapkaTone = 'correct';
              else if (highlightType === 'wrong') lapkaTone = 'wrong';
            }

            return (
              <button
                key={key.noteId}
                data-note={key.noteId}
                class={`${styles.whiteKey} ${extraClass} ${isMiddleC ? styles.middleC : ''}`}
                style={{ left: `${idx * WHITE_KEY_WIDTH}px`, width: `${WHITE_KEY_WIDTH}px` }}
                onPointerDown={(event) => handleKeyPointerDown(event, key.noteId)}
                onPointerMove={handleKeyPointerMove}
                onPointerUp={(event) => handleKeyPointerUp(event, key.noteId)}
                onPointerCancel={clearPendingPress}
              >
                {isMiddleC && <MiddleCLapka tone={lapkaTone} />}
                {showKeyDebugIds && !isMiddleC && <span class={styles.keyLabel}>{key.noteId}</span>}
              </button>
            );
          })}

          {blackKeys.map((key) => {
            const left = getBlackKeyLeft(key);
            if (left === null) return null;

            let extraClass = '';
            if (highlightKey === key.noteId && highlightType === 'correct') extraClass = styles.blackKeyCorrect;
            if (highlightKey === key.noteId && highlightType === 'wrong') extraClass = styles.blackKeyWrong;

            return (
              <button
                key={key.noteId}
                data-note={key.noteId}
                class={`${styles.blackKey} ${extraClass}`}
                style={{ left: `${left}px`, width: `${BLACK_KEY_WIDTH}px` }}
                onPointerDown={(event) => handleKeyPointerDown(event, key.noteId)}
                onPointerMove={handleKeyPointerMove}
                onPointerUp={(event) => handleKeyPointerUp(event, key.noteId)}
                onPointerCancel={clearPendingPress}
              >
                {showKeyDebugIds && <span class={styles.blackKeyDebugLabel}>{key.noteId}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
