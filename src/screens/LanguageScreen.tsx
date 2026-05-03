import {useEffect, useRef} from 'preact/hooks';
import {CatMascot} from '../components/CatMascot/CatMascot';
import type {Language} from '../types';
import {LANGUAGE_OPTIONS, t} from '../lib/i18n';
import styles from './LanguageScreen.module.css';

interface LanguageScreenProps {
  onSelect: (lang: Language) => void;
}

export function LanguageScreen({onSelect}: LanguageScreenProps) {
  const cardsRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const logBrandPosition = () => {
      const cards = cardsRef.current;
      const logo = logoRef.current;
      if (!cards || !logo) return;

      const logoRect = logo.getBoundingClientRect();
      const cardsRect = cards.getBoundingClientRect();

      console.debug('[Layout][Language] logo relation', {
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        viewport: {w: window.innerWidth, h: window.innerHeight},
        logoTop: logoRect.top,
        logoBottom: logoRect.bottom,
        cardsBottom: cardsRect.bottom,
        distanceLogoToCardsPx: logoRect.top - cardsRect.bottom,
        logoHeight: logoRect.height,
        cardsHeight: cardsRect.height,
      });
    };

    logBrandPosition();
    window.addEventListener('resize', logBrandPosition);
    return () => window.removeEventListener('resize', logBrandPosition);
  }, []);

  function handleSelect(lang: Language) {
    onSelect(lang);
  }

  return (
    <div class={styles.container}>
      <div class={styles.top}>
        <CatMascot size={120} />
        <h1 class={styles.title}>{t('chooseLanguage')}</h1>
      </div>

      <div class={styles.cards} ref={cardsRef}>
        {LANGUAGE_OPTIONS.map((option) => (
          <button class={styles.card} onClick={() => handleSelect(option.code)} key={option.code}>
            <span class={styles.flag}>{option.flag}</span>
            <span class={styles.label}>{option.label}</span>
          </button>
        ))}
      </div>

      <img src="/Pianinni-logo.svg" class="brand" alt="Pianinni" ref={logoRef} />
    </div>
  );
}
