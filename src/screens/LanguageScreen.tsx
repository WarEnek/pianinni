import {CatMascot} from '../components/CatMascot/CatMascot';
import {startBgm} from '../lib/audio';
import type {Language} from '../types';
import styles from './LanguageScreen.module.css';

interface LanguageScreenProps {
  onSelect: (lang: Language) => void;
}

export function LanguageScreen({onSelect}: LanguageScreenProps) {
  function handleSelect(lang: Language) {
    startBgm();
    onSelect(lang);
  }

  return (
    <div class={styles.container}>
      <div class={styles.top}>
        <CatMascot size={120} />
        <h1 class={styles.title}>{'На каком языке\nбудем учиться?'}</h1>
      </div>

      <div class={styles.cards}>
        <button class={styles.card} onClick={() => handleSelect('ru')}>
          <span class={styles.flag}>🇷🇺</span>
          <span class={styles.label}>Русский</span>
        </button>
        <button class={styles.card} onClick={() => handleSelect('en')}>
          <span class={styles.flag}>🇬🇧</span>
          <span class={styles.label}>English</span>
        </button>
      </div>

      <img src="/Pianinni-logo.svg" class="brand" alt="Pianinni" />
    </div>
  );
}
