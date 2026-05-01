import {useEffect, useRef} from 'preact/hooks';
import {CatMascot} from '../components/CatMascot/CatMascot';
import type {Language} from '../types';
import {t} from '../lib/i18n';
import styles from './LessonEndScreen.module.css';

interface LessonEndScreenProps {
  lang: Language;
  score: number;
  total: number;
  onRepeat: () => void;
  onRest: () => void;
}

export function LessonEndScreen({
  lang: _lang,
  score,
  total,
  onRepeat,
  onRest,
}: LessonEndScreenProps) {
  const actionsRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const logBrandPosition = () => {
      const actions = actionsRef.current;
      const logo = logoRef.current;
      if (!actions || !logo) return;

      const logoRect = logo.getBoundingClientRect();
      const actionsRect = actions.getBoundingClientRect();
      const buttons = actions.querySelectorAll('button');
      const lastButtonRect = buttons.length ? buttons[buttons.length - 1].getBoundingClientRect() : null;

      console.debug('[Layout][LessonEnd] logo relation', {
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        viewport: {w: window.innerWidth, h: window.innerHeight},
        logoTop: logoRect.top,
        logoBottom: logoRect.bottom,
        actionsTop: actionsRect.top,
        actionsBottom: actionsRect.bottom,
        lastButtonBottom: lastButtonRect?.bottom,
        distanceLogoToLastButtonPx: lastButtonRect ? logoRect.top - lastButtonRect.bottom : null,
        logoHeight: logoRect.height,
      });
    };

    logBrandPosition();
    window.addEventListener('resize', logBrandPosition);
    return () => window.removeEventListener('resize', logBrandPosition);
  }, []);

  return (
    <div class={styles.container}>
      <div class={styles.content}>
        <div class={styles.mascot}>
          <CatMascot size={140} />
        </div>
        <h1 class={styles.title}>{t('lessonComplete')}</h1>
        <p class={styles.subtitle}>{t('lessonCompleteSubtitle')}</p>
        <p class={styles.score}>
          {score}/{total}
        </p>
      </div>

      <div class={styles.actions} ref={actionsRef}>
        <button class={styles.primaryBtn} onClick={onRepeat}>
          {t('repeatLesson')}
        </button>
        <button class={styles.secondaryBtn} onClick={onRest}>
          {t('needRest')}
        </button>
        <img src="/Pianinni-logo.svg" class="brand" alt="Pianinni" ref={logoRef} />
      </div>
    </div>
  );
}
