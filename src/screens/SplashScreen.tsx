import { useEffect } from 'preact/hooks';
import { CatMascot } from '../components/CatMascot/CatMascot';
import logoSvg from './Pianinni.svg';
import styles from './SplashScreen.module.css';

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  function handleClick() {
    onDone();
  }

  return (
    <div class={styles.container} onClick={handleClick}>
      <div class={styles.content}>
        <CatMascot size={140} />
        <img src={logoSvg} alt="Pianinni" class={styles.logo} width="126" height="23" />
      </div>
    </div>
  );
}
