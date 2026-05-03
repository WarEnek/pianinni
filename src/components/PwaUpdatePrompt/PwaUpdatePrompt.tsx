import {useEffect, useState} from 'preact/hooks';
import {registerSW} from 'virtual:pwa-register';

type UpdateServiceWorker = (needReload?: boolean) => Promise<void> | void;

export function PwaUpdatePrompt() {
  const [shouldRefresh, setShouldRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyUpdate, setApplyUpdate] = useState<UpdateServiceWorker | null>(null);

  useEffect(() => {
    const updateServiceWorker = registerSW({
      onNeedRefresh() {
        if (import.meta.env.DEV) {
          console.debug('[PWA] new version is available');
        }
        setShouldRefresh(true);
      },
      onOfflineReady() {
        if (import.meta.env.DEV) {
          console.debug('[PWA] app is ready for offline use');
        }
        setOfflineReady(true);
      },
      onRegistered(registration) {
        if (import.meta.env.DEV) {
          console.debug('[PWA] service worker registered', {
            scope: registration?.scope,
          });
        }
      },
      onRegisterError(error) {
        if (import.meta.env.DEV) {
          console.debug('[PWA] service worker registration error', {error});
        }
      },
    });

    setApplyUpdate(() => updateServiceWorker);
  }, []);

  useEffect(() => {
    if (!offlineReady) return;
    const timer = window.setTimeout(() => {
      setOfflineReady(false);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [offlineReady]);

  async function handleUpdate() {
    if (!applyUpdate) return;

    setIsApplying(true);
    try {
      await applyUpdate(true);
      if (import.meta.env.DEV) {
        console.debug('[PWA] update flow executed');
      }
    } catch (error) {
      setShouldRefresh(false);
      if (import.meta.env.DEV) {
        console.debug('[PWA] failed to trigger service worker update', {error});
      }
      window.location.reload();
    } finally {
      setIsApplying(false);
    }
  }

  if (!shouldRefresh && !offlineReady) {
    return null;
  }

  const wrapperStyle = {
    position: 'fixed',
    right: '12px',
    bottom: '12px',
    zIndex: 1000,
    maxWidth: '340px',
  };

  const cardStyle = {
    padding: '10px 12px',
    border: '1px solid #4a3f6b',
    borderRadius: '10px',
    color: '#2b233b',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    fontSize: '14px',
    background: '#fff',
    lineHeight: 1.25,
  };

  const buttonStyle = {
    alignSelf: 'flex-start',
    marginTop: '4px',
    border: 'none',
    borderRadius: '999px',
    padding: '6px 12px',
    fontWeight: 600,
    cursor: 'pointer',
    background: '#4a3f6b',
    color: '#fff',
  };

  const offlineStyle = {
    padding: '10px 12px',
    border: '1px solid #4a3f6b',
    borderRadius: '10px',
    background: '#f4eef8',
    color: '#2b233b',
    fontSize: '14px',
  };

  if (shouldRefresh) {
    return (
      <div style={wrapperStyle}>
        <div style={cardStyle} role="status" aria-live="polite">
          <strong style={{display: 'block', fontSize: '15px'}}>Доступно обновление</strong>
          <span>Сейчас доступна новая версия приложения.</span>
          <button
            onClick={handleUpdate}
            disabled={isApplying}
            style={buttonStyle}
          >
            {isApplying ? 'Обновление...' : 'Обновить сейчас'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <div style={offlineStyle}>
        <strong>Приложение готово к работе офлайн</strong>
      </div>
    </div>
  );
}
