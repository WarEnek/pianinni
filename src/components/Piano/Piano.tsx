import { useRef, useEffect, useMemo } from 'preact/hooks';
import type { KeyDefinition } from '../../types';
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

function visionBiasFromSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = (h >>> 0) / 0x1_0000_0000;
  return VISION_BIAS_MIN + u * (VISION_BIAS_MAX - VISION_BIAS_MIN);
}

interface PianoProps {
  keys: KeyDefinition[];
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
}

export function Piano({
  keys,
  activeStartId,
  highlightKey,
  highlightType,
  onKeyPress,
  scrollToNote,
  scrollBiasSeed = 0,
  disabled = false,
  showKeyDebugIds = false,
}: PianoProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const pendingPressRef = useRef<PendingPointerPress | null>(null);

  const whiteKeys = useMemo(() => keys.filter((k) => !k.isBlack), [keys]);
  const blackKeys = useMemo(() => keys.filter((k) => k.isBlack), [keys]);

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

  const WHITE_KEY_WIDTH = 48;
  const BLACK_KEY_WIDTH = 30;
  const totalWidth = whiteKeys.length * WHITE_KEY_WIDTH;

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
    pendingPressRef.current = {
      pointerId: event.pointerId,
      noteId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
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
        <div class={styles.pianoKeys} style={{ width: `${totalWidth}px` }}>
          {whiteKeys.map((key) => {
            const idx = getWhiteKeyIndex(key.noteId);
            let extraClass = '';
            if (highlightKey === key.noteId && highlightType === 'correct') extraClass = styles.keyCorrect;
            if (highlightKey === key.noteId && highlightType === 'wrong') extraClass = styles.keyWrong;

            const isMiddleC = key.noteId === 'C4';

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
                {isMiddleC && <span class={styles.middleCDot} />}
                {showKeyDebugIds && <span class={styles.keyLabel}>{key.noteId}</span>}
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
