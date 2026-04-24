import {CatMascot} from '../components/CatMascot/CatMascot';
import type {ClefMode, Language} from '../types';
import {t} from '../lib/i18n';
import styles from './ClefSelectScreen.module.css';

interface ClefSelectScreenProps {
  lang: Language;
  onSelect: (mode: ClefMode) => void;
}

const MUSIC_FONT = "'Noto Music', serif";

function BassClefIcon() {
  return (
    <span
      style={{
        fontFamily: MUSIC_FONT,
        fontSize: '50px',
        color: 'var(--color-primary)',
        lineHeight: 'normal',
        height: '86px',
      }}>
      {'\u{1D122}'}
    </span>
  );
}

function TrebleClefIcon() {
  return (
    <span
      style={{
        fontFamily: MUSIC_FONT,
        fontSize: '48px',
        color: 'var(--color-primary)',
        lineHeight: 'normal',
        height: '86px',
        marginBottom: '20px',
      }}>
      {'\u{1D11E}'}
    </span>
  );
}

export function ClefSelectScreen({
  lang: _lang,
  onSelect,
}: ClefSelectScreenProps) {
  return (
    <div class={styles.container}>
      <div class={styles.top}>
        <CatMascot size={120} />
        <h1 class={styles.title}>{t('chooseClef')}</h1>
      </div>

      <div class={styles.options}>
        <div class={styles.row}>
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
        </div>
        <button class={styles.wideCard} onClick={() => onSelect('mixed')}>
          <span class={styles.cardLabel}>{t('bothClefs')}</span>
          <span class={styles.cardSub}>{t('mixedMode')}</span>
        </button>
      </div>

      <img src="/Pianinni-logo.svg" class="brand" alt="Pianinni" />
    </div>
  );
}
