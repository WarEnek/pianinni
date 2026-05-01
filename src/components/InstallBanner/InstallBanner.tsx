import { useEffect } from 'preact/hooks';

export function InstallBanner() {
  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    const isStandalone = (window.matchMedia('(display-mode: standalone)').matches) || 
                          ((window.navigator as any).standalone === true);

    if (isStandalone) {
      return;
    }

    if (isIOSDevice) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      
      setTimeout(() => {
        const prompt = e as any;
        prompt.prompt();
        prompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          }
        });
      }, 1000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  
  return null;
}
