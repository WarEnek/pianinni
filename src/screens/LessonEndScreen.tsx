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
  return (
    <div class={styles.container}>
      <div class={styles.content}>
        <CatMascot size={140} />
        <h1 class={styles.title}>{t('lessonComplete')}</h1>
        <p class={styles.subtitle}>{t('lessonCompleteSubtitle')}</p>
        <p class={styles.score}>
          {score}/{total}
        </p>
      </div>

      <div class={styles.actions}>
        <button class={styles.primaryBtn} onClick={onRepeat}>
          {t('repeatLesson')}
        </button>
        <button class={styles.secondaryBtn} onClick={onRest}>
          {t('needRest')}
        </button>
        <img src="/Pianinni-logo.svg" class="brand" alt="Pianinni" />
      </div>
    </div>
  );
}
