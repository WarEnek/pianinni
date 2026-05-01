import { useEffect, useState } from 'preact/hooks';

/** Narrow phone landscape — matches Piano compact layout and GameScreen header. */
export const COMPACT_LANDSCAPE_MQ = '(orientation: landscape) and (max-height: 560px)';

export function useCompactLandscape(): boolean {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(COMPACT_LANDSCAPE_MQ).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_LANDSCAPE_MQ);
    const handler = (): void => setCompact(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return (): void => mq.removeEventListener('change', handler);
  }, []);

  return compact;
}
