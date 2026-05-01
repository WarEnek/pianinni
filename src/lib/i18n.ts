import type { Language } from '../types';

export interface LanguageOption {
  code: Language;
  label: string;
  shortLabel: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'ru', label: 'Русский', shortLabel: 'RU', flag: '🇷🇺' },
  { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧' },
  { code: 'ja', label: '日本語', shortLabel: 'JA', flag: '🇯🇵' },
];

const translations = {
  ru: {
    chooseLanguage: 'На каком языке\nбудем учиться?',
    russian: 'Русский',
    english: 'English',
    japanese: '日本語',
    chooseClef: 'Какой ключ\nбудем учить?',
    bass: 'Басовый',
    treble: 'Скрипичный',
    bothClefs: 'Оба ключа',
    leftHand: 'ЛЕВАЯ РУКА',
    rightHand: 'ПРАВАЯ РУКА',
    mixedMode: 'СМЕШАНЫЙ РЕЖИМ',
    playNote: 'Сыграй ноту',
    purrfecto: 'Замурчательно!',
    tryAgain: 'Попробуй еще раз',
    lessonComplete: 'Замурчательно!',
    lessonCompleteSubtitle: 'Вы отлично справились',
    repeatLesson: 'ПОВТОРИТЬ УРОК',
    needRest: 'НАДО ОТДОХНУТЬ',
  },
  en: {
    chooseLanguage: 'Choose your\nlanguage',
    russian: 'Русский',
    english: 'English',
    japanese: '日本語',
    chooseClef: 'Which clef\nto learn?',
    bass: 'Bass',
    treble: 'Treble',
    bothClefs: 'Both clefs',
    leftHand: 'LEFT HAND',
    rightHand: 'RIGHT HAND',
    mixedMode: 'MIXED MODE',
    playNote: 'Play note',
    purrfecto: 'Purrfecto!',
    tryAgain: 'Try again',
    lessonComplete: 'Purrfecto!',
    lessonCompleteSubtitle: 'You did great',
    repeatLesson: 'REPEAT LESSON',
    needRest: 'NEED A REST',
  },
  ja: {
    chooseLanguage: '言語を\n選んでください',
    russian: 'Русский',
    english: 'English',
    japanese: '日本語',
    chooseClef: 'どの音部記号を\n学びますか？',
    bass: 'ヘ音記号',
    treble: 'ト音記号',
    bothClefs: '両方の音部記号',
    leftHand: '左手',
    rightHand: '右手',
    mixedMode: 'ミックスモード',
    playNote: 'この音を弾いて',
    purrfecto: 'パーフェクト！',
    tryAgain: 'もう一度やってみよう',
    lessonComplete: 'パーフェクト！',
    lessonCompleteSubtitle: 'よくできました',
    repeatLesson: 'レッスンをもう一度',
    needRest: '休憩する',
  },
} as const satisfies Record<Language, Record<string, string>>;

export type TranslationKey = keyof typeof translations.ru;

let currentLanguage: Language = (localStorage.getItem('pianinni_lang') as Language) || 'ru';

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  localStorage.setItem('pianinni_lang', lang);
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: TranslationKey): string {
  return translations[currentLanguage][key];
}
