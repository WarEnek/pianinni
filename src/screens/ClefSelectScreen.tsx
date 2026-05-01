import {CatMascot} from '../components/CatMascot/CatMascot';
import type {ClefMode, Language} from '../types';
import {LANGUAGE_OPTIONS, t} from '../lib/i18n';
import styles from './ClefSelectScreen.module.css';

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

  return (
    <div class={styles.container}>
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

      <div class={styles.options}>
        <button class={styles.card} onClick={() => onSelect('bass')}>
          <BassClefIcon />
          <div class={styles.cardContent}>
            <span class={styles.cardLabel}>{t('bass')}</span>
            <span class={styles.cardSub}>{t('leftHand')}</span>
          </div>
        </button>
        <button class={styles.card} onClick={() => onSelect('treble')}>
          <TrebleClefIcon />
          <div class={styles.cardContent}>
            <span class={styles.cardLabel}>{t('treble')}</span>
            <span class={styles.cardSub}>{t('rightHand')}</span>
          </div>
        </button>
        <button class={styles.wideCard} onClick={() => onSelect('mixed')}>
          <span class={styles.cardLabel}>{t('bothClefs')}</span>
          <span class={styles.cardSub}>{t('mixedMode')}</span>
        </button>
      </div>

      <img src="/Pianinni-logo.svg" class="brand" alt="Pianinni" />
    </div>
  );
}
