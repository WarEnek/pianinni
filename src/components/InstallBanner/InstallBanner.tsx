import { useState, useEffect } from 'preact/hooks';
import './InstallBanner.module.css';

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isInstallable = localStorage.getItem('pianinni_install_banner_dismissed') !== 'true';
    
    if (!isInstallable) {
      return;
    }

    const isStandalone = (window.matchMedia('(display-mode: standalone)').matches) || 
                          ((window.navigator as any).standalone === true);

    if (isStandalone) {
      return;
    }

    if (isIOSDevice) {
      setShowIOSBanner(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      setTimeout(() => {
        const prompt = e as any;
        prompt.prompt();
        prompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          }
          setDeferredPrompt(null);
        });
      }, 1000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismiss = () => {
    setShowIOSBanner(false);
    localStorage.setItem('pianinni_install_banner_dismissed', 'true');
    setDismissed(true);
  };

  if (!showIOSBanner || dismissed) {
    return null;
  }

  return (
    <div class="install-banner install-banner-ios">
      <div class="install-banner-content">
        <div class="install-banner-text">
          <strong>Install Pianinni</strong>
          <p>Tap the share button and then "Add to Home Screen"</p>
        </div>
        <button class="install-banner-close" onClick={handleDismiss}>✕</button>
      </div>
    </div>
  );
}
