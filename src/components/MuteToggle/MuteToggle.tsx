import styles from './MuteToggle.module.css';
import type {AudioAvailability} from '../../lib/audio';

interface MuteToggleProps {
  muted: boolean;
  audioAvailability: AudioAvailability;
  onToggle: () => void;
}

export function MuteToggle({
  muted,
  audioAvailability,
  onToggle,
}: MuteToggleProps) {
  const soundBlocked = audioAvailability !== 'available';
  let ariaLabel = muted ? 'Unmute' : 'Mute';
  if (audioAvailability === 'blocked') {
    ariaLabel = 'Enable sound';
  } else if (audioAvailability === 'unavailable') {
    ariaLabel = 'Sound unavailable';
  }

  return (
    <button
      class={`${styles.btn} ${soundBlocked ? styles.soundBlocked : ''}`}
      onClick={onToggle}
      aria-label={ariaLabel}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {muted || soundBlocked ? (
          <>
            <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="var(--color-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            <line x1="18" y1="9" x2="22" y2="15" stroke="var(--color-text-muted)" stroke-width="2" stroke-linecap="round" />
            <line x1="22" y1="9" x2="18" y2="15" stroke="var(--color-text-muted)" stroke-width="2" stroke-linecap="round" />
          </>
        ) : (
          <>
            <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            <path d="M15.5 8.5a5 5 0 010 7" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" fill="none" />
            <path d="M18 6a8 8 0 010 12" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" fill="none" />
          </>
        )}
      </svg>
      {soundBlocked && <span class={styles.warningDot} />}
    </button>
  );
}
