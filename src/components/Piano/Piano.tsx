import { useRef, useEffect, useMemo } from 'preact/hooks';
import type { KeyDefinition } from '../../types';
import styles from './Piano.module.css';

interface PianoProps {
  keys: KeyDefinition[];
  activeStartId: string;
  activeEndId: string;
  highlightKey: string | null;
  highlightType: 'correct' | 'wrong' | null;
  onKeyPress: (noteId: string) => void;
  scrollToNote?: string;
  disabled?: boolean;
}

export function Piano({
  keys,
  activeStartId,
  activeEndId,
  highlightKey,
  highlightType,
  onKeyPress,
  scrollToNote,
  disabled = false,
}: PianoProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const whiteKeys = useMemo(() => keys.filter((k) => !k.isBlack), [keys]);
  const blackKeys = useMemo(() => keys.filter((k) => k.isBlack), [keys]);

  const activeMidiRange = useMemo(() => {
    const startKey = keys.find((k) => k.noteId === activeStartId);
    const endKey = keys.find((k) => k.noteId === activeEndId);
    return {
      start: startKey?.midi ?? 0,
      end: endKey?.midi ?? 127,
    };
  }, [keys, activeStartId, activeEndId]);

  function isInActiveRange(midi: number): boolean {
    return midi >= activeMidiRange.start && midi <= activeMidiRange.end;
  }

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
    if (scrollToNote && scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-note="${scrollToNote}"]`);
      if (el) {
        const container = scrollRef.current;
        const elRect = (el as HTMLElement).getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const elLeft = elRect.left - containerRect.left;
        const elWidth = elRect.width;
        const containerWidth = containerRect.width;
        const targetScroll = elLeft - containerWidth / 2 + elWidth / 2;

        console.log('[Piano Scroll Debug]', {
          scrollToNote,
          elLeft,
          elWidth,
          containerWidth,
          targetScroll,
          scrollWidth: container.scrollWidth,
          currentScroll: container.scrollLeft
        });

        container.scrollTo({ left: targetScroll, behavior: 'smooth' });
      }
    }
  }, [scrollToNote]);

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

  function handlePress(noteId: string) {
    if (disabled) return;
    onKeyPress(noteId);
  }

  return (
    <div class={styles.pianoWrapper}>
      <div class={styles.pianoScroll} ref={scrollRef}>
        <div class={styles.pianoKeys} style={{ width: `${totalWidth}px` }}>
          {whiteKeys.map((key) => {
            const idx = getWhiteKeyIndex(key.noteId);
            const active = isInActiveRange(key.midi);
            let extraClass = '';
            if (highlightKey === key.noteId && highlightType === 'correct') extraClass = styles.keyCorrect;
            if (highlightKey === key.noteId && highlightType === 'wrong') extraClass = styles.keyWrong;

            const isMiddleC = key.noteId === 'C4';
            const dimClass = active ? '' : styles.dimKey;

            return (
              <button
                key={key.noteId}
                data-note={key.noteId}
                class={`${styles.whiteKey} ${extraClass} ${dimClass} ${isMiddleC ? styles.middleC : ''}`}
                style={{ left: `${idx * WHITE_KEY_WIDTH}px`, width: `${WHITE_KEY_WIDTH}px` }}
                onPointerDown={() => handlePress(key.noteId)}
              >
                {isMiddleC && <span class={styles.middleCDot} />}
              </button>
            );
          })}

          {blackKeys.map((key) => {
            const left = getBlackKeyLeft(key);
            if (left === null) return null;
            const active = isInActiveRange(key.midi);

            let extraClass = '';
            if (highlightKey === key.noteId && highlightType === 'correct') extraClass = styles.blackKeyCorrect;
            if (highlightKey === key.noteId && highlightType === 'wrong') extraClass = styles.blackKeyWrong;

            const dimClass = active ? '' : styles.dimBlackKey;

            return (
              <button
                key={key.noteId}
                data-note={key.noteId}
                class={`${styles.blackKey} ${extraClass} ${dimClass}`}
                style={{ left: `${left}px`, width: `${BLACK_KEY_WIDTH}px` }}
                onPointerDown={() => handlePress(key.noteId)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
