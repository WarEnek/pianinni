import {CatMascot} from '../components/CatMascot/CatMascot';
import type {Language} from '../types';
import {LANGUAGE_OPTIONS, t} from '../lib/i18n';
import styles from './LanguageScreen.module.css';

interface LanguageScreenProps {
  onSelect: (lang: Language) => void;
}

export function LanguageScreen({onSelect}: LanguageScreenProps) {
  function handleSelect(lang: Language) {
    if (import.meta.env.DEV) {
      console.debug('[Audio] menu bgm suppressed on language select', {lang});
    }
    onSelect(lang);
  }

  return (
    <div class={styles.container}>
      <div class={styles.top}>
        <CatMascot size={120} />
        <h1 class={styles.title}>{t('chooseLanguage')}</h1>
      </div>

      <div class={styles.cards}>
        {LANGUAGE_OPTIONS.map((option) => (
          <button class={styles.card} onClick={() => handleSelect(option.code)} key={option.code}>
            <span class={styles.flag}>{option.flag}</span>
            <span class={styles.label}>{option.label}</span>
          </button>
        ))}
      </div>

      <img src="/Pianinni-logo.svg" class="brand" alt="Pianinni" />
    </div>
  );
}
