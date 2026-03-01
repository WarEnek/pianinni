import { useState, useEffect } from 'preact/hooks';
import { SplashScreen } from './screens/SplashScreen';
import { LanguageScreen } from './screens/LanguageScreen';
import { ClefSelectScreen } from './screens/ClefSelectScreen';
import { GameScreen } from './screens/GameScreen';
import { LessonEndScreen } from './screens/LessonEndScreen';
import { InstallBanner } from './components/InstallBanner/InstallBanner';
import type { ClefMode, Language } from './types';
import { setLanguage, getLanguage } from './lib/i18n';
import { saveLessonResult } from './lib/storage';
import { queueForSync, syncToCloud, isSupabaseConfigured } from './lib/supabase';
import { startBgm, stopBgm } from './lib/audio';

type Screen = 'splash' | 'language' | 'clef' | 'game' | 'lessonEnd';

export function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [clefMode, setClefMode] = useState<ClefMode>('treble');
  const [lastScore, setLastScore] = useState({ score: 0, total: 8 });
  const [, setLangTick] = useState(0);

  useEffect(() => {
    const savedLang = localStorage.getItem('pianinni_lang') as Language | null;
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  useEffect(() => {
    if (screen === 'splash' || screen === 'language') {
      startBgm();
    } else {
      stopBgm();
    }
  }, [screen]);

  function handleSplashDone() {
    const savedLang = localStorage.getItem('pianinni_lang');
    setScreen(savedLang ? 'clef' : 'language');
  }

  function handleLanguageSelect(lang: Language) {
    setLanguage(lang);
    setLangTick((n) => n + 1);
    setScreen('clef');
  }

  function handleClefSelect(mode: ClefMode) {
    setClefMode(mode);
    setScreen('game');
  }

  function handleLessonEnd(score: number, total: number) {
    setLastScore({ score, total });
    setScreen('lessonEnd');
    const result = {
      clefMode,
      score,
      total,
      attempts: [],
      playedAt: new Date().toISOString(),
    };
    saveLessonResult(result);
    if (isSupabaseConfigured()) {
      queueForSync(result);
      syncToCloud().catch(() => {});
    }
  }

  function handleRepeat() {
    setScreen('game');
  }

  function handleRest() {
    setScreen('clef');
  }

  function handleBackToClef() {
    setScreen('clef');
  }

  const lang = getLanguage();

  return (
    <>
      {(() => {
        switch (screen) {
          case 'splash':
            return <SplashScreen onDone={handleSplashDone} />;
          case 'language':
            return <LanguageScreen onSelect={handleLanguageSelect} />;
          case 'clef':
            return <ClefSelectScreen lang={lang} onSelect={handleClefSelect} />;
          case 'game':
            return <GameScreen lang={lang} clefMode={clefMode} onFinish={handleLessonEnd} onBack={handleBackToClef} />;
          case 'lessonEnd':
            return <LessonEndScreen lang={lang} score={lastScore.score} total={lastScore.total} onRepeat={handleRepeat} onRest={handleRest} />;
        }
      })()}
      <InstallBanner />
    </>
  );
}
