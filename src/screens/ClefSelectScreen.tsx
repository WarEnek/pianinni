import {useEffect, useRef, useState} from 'preact/hooks';
import {CatMascot} from '../components/CatMascot/CatMascot';
import type {ClefMode, Language} from '../types';
import {LANGUAGE_OPTIONS, t} from '../lib/i18n';
import styles from './ClefSelectScreen.module.css';

const FALL_FLIP_MQ = '(orientation: landscape) and (min-aspect-ratio: 4 / 3) and (max-width: 900px)';
const FALL_FLIP_ANIMATION_PREFIX = 'clefCardFallFlip';
type FallFlipDirection = 'forward' | 'backward';

function isFallFlipDirection(value: string | undefined | null): value is FallFlipDirection {
  return value === 'forward' || value === 'backward';
}

interface ClefSelectScreenProps {
  lang: Language;
  onSelect: (mode: ClefMode) => void;
  onLanguageSelect: (lang: Language) => void;
}

function getNextLanguage(currentLang: Language): Language {
  const currentIndex = LANGUAGE_OPTIONS.findIndex((option) => option.code === currentLang);
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
  const normalizedIndex = nextIndex % LANGUAGE_OPTIONS.length;
  return LANGUAGE_OPTIONS[normalizedIndex].code;
}

function BassClefIcon() {
  return (
    <span class={styles.bassClefIcon}>
      {'\u{1D122}'}
    </span>
  );
}

function TrebleClefIcon() {
  return (
    <span class={styles.trebleClefIcon}>
      {'\u{1D11E}'}
    </span>
  );
}

export function ClefSelectScreen({
  lang,
  onSelect,
  onLanguageSelect,
}: ClefSelectScreenProps) {
  const currentLanguage = LANGUAGE_OPTIONS.find((option) => option.code === lang) ?? LANGUAGE_OPTIONS[0];
  const nextLanguage = getNextLanguage(lang);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const [fallFlipRunId, setFallFlipRunId] = useState(0);
  const [fallFlipDirection, setFallFlipDirection] = useState<FallFlipDirection | null>(null);
  const previousLandscapeRef = useRef(false);
  const activeFallFlipRunRef = useRef(0);
  const activeFallFlipDirectionRef = useRef<FallFlipDirection>('forward');
  const completedFallFlipCardsRef = useRef(0);
  const currentFallFlipRunIdRef = useRef(0);
  const runStartMsRef = useRef(0);

  useEffect(() => {
    currentFallFlipRunIdRef.current = fallFlipRunId;
  }, [fallFlipRunId]);

  function getCardRects() {
    const optionsNode = optionsRef.current;
    if (!optionsNode) return [];

    return Array.from(optionsNode.querySelectorAll(`.${styles.card}, .${styles.wideCard}`)).map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        type: node.classList.contains(styles.wideCard) ? 'wideCard' : 'card',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
      };
    });
  }

  function logFallFlipSnapshot(
    tag: string,
    runId: number,
    extra: Record<string, unknown> = {},
  ): void {
    if (!import.meta.env.DEV) return;

    const optionsNode = optionsRef.current;
    if (!optionsNode) {
      console.debug('[ClefSelect] fall-flip snapshot skipped: options not mounted', {tag, runId, ...extra});
      return;
    }

    const optionsRect = optionsNode.getBoundingClientRect();

    console.debug('[ClefSelect] fall-flip snapshot', {
      tag,
      runId,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        orientation: window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait',
        targetLayoutReady: window.matchMedia(FALL_FLIP_MQ).matches,
      },
      options: {
        width: Math.round(optionsRect.width),
        height: Math.round(optionsRect.height),
      },
      cards: getCardRects(),
      ...extra,
    });
  }

  function handleCardAnimationEnd(event: AnimationEvent): void {
    if (!import.meta.env.DEV) return;
    if (!(event.target instanceof HTMLButtonElement)) return;
    if (!event.animationName.startsWith(FALL_FLIP_ANIMATION_PREFIX)) return;

    const isCard = event.target.classList.contains(styles.card) || event.target.classList.contains(styles.wideCard);
    if (!isCard) return;

    const optionsNode = optionsRef.current;
    const optionsRunId = Number(optionsNode?.dataset.fallFlipRunId ?? 0);
    const optionsDirection = isFallFlipDirection(optionsNode?.dataset.fallFlipDirection)
      ? optionsNode?.dataset.fallFlipDirection
      : null;
    const activeRunId = activeFallFlipRunRef.current;
    const activeDirection = activeFallFlipDirectionRef.current;
    const currentRunId = currentFallFlipRunIdRef.current;
    if (
      optionsRunId === 0 ||
      activeRunId !== optionsRunId ||
      activeRunId !== currentRunId ||
      optionsDirection !== activeDirection
    ) {
      return;
    }

    const finishedCards = completedFallFlipCardsRef.current + 1;
    completedFallFlipCardsRef.current = finishedCards;

    console.debug('[ClefSelect] fall-flip card animation end', {
      runId: activeRunId,
      cardType: event.target.classList.contains(styles.wideCard) ? 'wideCard' : 'card',
      direction: activeDirection,
      cardsDone: finishedCards,
      elapsedMs: Number((performance.now() - runStartMsRef.current).toFixed(2)),
    });

    if (finishedCards >= 3) {
      activeFallFlipRunRef.current = 0;
      completedFallFlipCardsRef.current = 0;
      logFallFlipSnapshot('fall-flip-complete', activeRunId, {
        source: 'animationend',
        elapsedMs: Number((performance.now() - runStartMsRef.current).toFixed(2)),
      });
    }
  }

  function cardStyle(index: number): Record<string, string> {
    return {'--fall-flip-index': String(index)};
  }

  function startFallFlip(direction: FallFlipDirection, transitionLog: Record<string, unknown>, reason: string): void {
    const isReducedMotion = (transitionLog.reducedMotion as boolean) ?? false;
    if (isReducedMotion) {
      if (import.meta.env.DEV) {
        console.debug('[ClefSelect] fall-flip skipped due reduced motion preference', {
          direction,
          runId: currentFallFlipRunIdRef.current,
          reason,
          ...transitionLog,
        });
      }
      setFallFlipDirection(null);
      return;
    }

    runStartMsRef.current = performance.now();
    const nextRunId = currentFallFlipRunIdRef.current + 1;
    currentFallFlipRunIdRef.current = nextRunId;
    completedFallFlipCardsRef.current = 0;
    activeFallFlipDirectionRef.current = direction;
    setFallFlipDirection(direction);
    activeFallFlipRunRef.current = nextRunId;
    logFallFlipSnapshot('fall-flip-start', nextRunId, {
      direction,
      ...transitionLog,
      reason,
      elapsedFromTransitionMs: Number((performance.now() - runStartMsRef.current).toFixed(2)),
    });
    setFallFlipRunId(nextRunId);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const landscapeQuery = window.matchMedia('(orientation: landscape)');
    const triggerQuery = window.matchMedia(FALL_FLIP_MQ);
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    previousLandscapeRef.current = landscapeQuery.matches;

    const handleOrientationChange = (): void => {
      window.requestAnimationFrame(() => {
        const isLandscape = landscapeQuery.matches;
        const targetLayoutReady = triggerQuery.matches;

        const transitionLog = {
          fromLandscape: previousLandscapeRef.current,
          toLandscape: isLandscape,
          targetLayoutReady,
          reducedMotion: reducedMotionQuery.matches,
          currentRunId: currentFallFlipRunIdRef.current,
        };

        if (import.meta.env.DEV) {
          console.debug('[ClefSelect] orientationchange', transitionLog);
        }

        if (!previousLandscapeRef.current && isLandscape && targetLayoutReady) {
          startFallFlip('forward', transitionLog, 'portrait-to-landscape');
        } else if (previousLandscapeRef.current && !isLandscape) {
          startFallFlip('backward', transitionLog, 'landscape-to-portrait');
        }

        previousLandscapeRef.current = isLandscape;
      });
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const logBrandPosition = () => {
      const container = containerRef.current;
      const options = optionsRef.current;
      const logo = container?.querySelector('.brand');
      if (!container || !options || !(logo instanceof HTMLImageElement)) return;

      const logoRect = logo.getBoundingClientRect();
      const optionsRect = options.getBoundingClientRect();
      const lastCardRect = options
        .querySelector<HTMLButtonElement>('.' + styles.card + ':last-of-type')
        ?.getBoundingClientRect();

      console.debug('[Layout][ClefSelect] logo relation', {
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        orientationMatchMedia: window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait',
        fallFlipRunId: currentFallFlipRunIdRef.current,
        fallFlipLayoutReady: window.matchMedia(FALL_FLIP_MQ).matches,
        viewport: {w: window.innerWidth, h: window.innerHeight},
        safeAreaBottom: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)'),
        containerRect: container.getBoundingClientRect(),
        logoTop: logoRect.top,
        logoBottom: logoRect.bottom,
        logoHeight: logoRect.height,
        optionsBottom: optionsRect.bottom,
        distanceLogoToOptionsPx: logoRect.top - optionsRect.bottom,
        lastCardBottom: lastCardRect?.bottom,
      });
    };

    logBrandPosition();
    window.addEventListener('resize', logBrandPosition);
    return () => window.removeEventListener('resize', logBrandPosition);
  }, []);

  return (
    <div class={styles.container} ref={containerRef}>
      <div class={styles.languageSwitch}>
        <button
          type="button"
          class={`${styles.languageButton} ${styles.languageButtonActive}`}
          onClick={() => onLanguageSelect(nextLanguage)}
          aria-label={`Switch language to ${nextLanguage.toUpperCase()}`}>
          <span class={styles.languageFlag}>{currentLanguage.flag}</span>
          <span class={styles.languageCode}>{currentLanguage.shortLabel}</span>
        </button>
      </div>

      <div class={styles.top}>
        <div class={styles.mascot}>
          <CatMascot size={120} />
        </div>
        <h1 class={styles.title}>{t('chooseClef')}</h1>
      </div>

      <div class={styles.optionsAndLogo}>
        <div
          class={styles.options}
          ref={optionsRef}
          data-fall-flip-run-id={fallFlipRunId || undefined}
          data-fall-flip-direction={fallFlipDirection || undefined}
        >
          <button
            class={styles.card}
            style={cardStyle(0) as any}
            data-fall-flip-index={0}
            onAnimationEnd={handleCardAnimationEnd}
            onClick={() => onSelect('bass')}
          >
            <BassClefIcon />
            <div class={styles.cardContent}>
              <span class={styles.cardLabel}>{t('bass')}</span>
              <span class={styles.cardSub}>{t('leftHand')}</span>
            </div>
          </button>
          <button
            class={styles.card}
            style={cardStyle(1) as any}
            data-fall-flip-index={1}
            onAnimationEnd={handleCardAnimationEnd}
            onClick={() => onSelect('treble')}
          >
            <TrebleClefIcon />
            <div class={styles.cardContent}>
              <span class={styles.cardLabel}>{t('treble')}</span>
              <span class={styles.cardSub}>{t('rightHand')}</span>
            </div>
          </button>
          <button
            class={styles.wideCard}
            style={cardStyle(2) as any}
            data-fall-flip-index={2}
            onAnimationEnd={handleCardAnimationEnd}
            onClick={() => onSelect('mixed')}
          >
            <span class={styles.cardLabel}>{t('bothClefs')}</span>
            <span class={styles.cardSub}>{t('mixedMode')}</span>
          </button>
        </div>
        <div class={styles.brandRow}>
          <img
            src="/Pianinni-logo.svg"
            class={`${styles.logoImage} brand`}
            alt="Pianinni"
          />
        </div>
      </div>
    </div>
  );
}
