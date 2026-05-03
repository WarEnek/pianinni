import { useRef, useEffect, useState } from 'preact/hooks';

interface CatMascotProps {
  size?: number;
}

const BLINK_INTERVAL_MIN_MS = 3000;
const BLINK_INTERVAL_MAX_MS = 6000;
const BLINK_CLOSED_DURATION_MS = 110;
const BLINK_EYE_SCALE_Y = 0.08;
const LEFT_EYE_BLINK_ANCHOR = {x: 43, y: 73};
const RIGHT_EYE_BLINK_ANCHOR = {x: 86, y: 73};
const MAX_OFFSET = 3;

export function CatMascot({ size = 120 }: CatMascotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    let active = true;
    let nextBlinkTimeout: number | null = null;
    let blinkEndTimeout: number | null = null;

    const scheduleNextBlink = () => {
      const rangeMs = BLINK_INTERVAL_MAX_MS - BLINK_INTERVAL_MIN_MS;
      const nextBlinkMs = Math.floor(Math.random() * rangeMs) + BLINK_INTERVAL_MIN_MS;
      if (import.meta.env.DEV) {
        console.debug('[CatMascot] next blink planned', {nextBlinkMs});
      }

      nextBlinkTimeout = window.setTimeout(() => {
        if (!active) return;
        setIsBlinking(true);
        if (import.meta.env.DEV) {
          console.debug('[CatMascot] blink started');
        }

        blinkEndTimeout = window.setTimeout(() => {
          if (!active) return;
          setIsBlinking(false);
          if (import.meta.env.DEV) {
            console.debug('[CatMascot] blink ended');
          }
          scheduleNextBlink();
        }, BLINK_CLOSED_DURATION_MS);
      }, nextBlinkMs);
    };

    scheduleNextBlink();

    return () => {
      active = false;
      if (nextBlinkTimeout) {
        window.clearTimeout(nextBlinkTimeout);
      }
      if (blinkEndTimeout) {
        window.clearTimeout(blinkEndTimeout);
      }
    };
  }, []);

  useEffect(() => {
    function handleMove(clientX: number, clientY: number) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.55;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) {
        setOffset({x: 0, y: 0});
        return;
      }
      const clamp = Math.min(dist / 150, 1);
      const baseOffset = {
        x: (dx / dist) * MAX_OFFSET * clamp,
        y: (dy / dist) * MAX_OFFSET * clamp,
      };
      setOffset(baseOffset);
    }

    function onMouse(e: MouseEvent) {
      handleMove(e.clientX, e.clientY);
    }
    function onTouch(e: TouchEvent) {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }

    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
    };
  }, []);

  const scale = size / 126;
  const eyeScaleY = isBlinking ? BLINK_EYE_SCALE_Y : 1;
  const leftEyeBlinkTransform = `translate(${LEFT_EYE_BLINK_ANCHOR.x}, ${LEFT_EYE_BLINK_ANCHOR.y}) scale(1, ${eyeScaleY}) translate(${-LEFT_EYE_BLINK_ANCHOR.x}, ${-LEFT_EYE_BLINK_ANCHOR.y})`;
  const rightEyeBlinkTransform = `translate(${RIGHT_EYE_BLINK_ANCHOR.x}, ${RIGHT_EYE_BLINK_ANCHOR.y}) scale(1, ${eyeScaleY}) translate(${-RIGHT_EYE_BLINK_ANCHOR.x}, ${-RIGHT_EYE_BLINK_ANCHOR.y})`;
  const leftPupilTransform = `translate(${offset.x + LEFT_EYE_BLINK_ANCHOR.x}, ${offset.y + LEFT_EYE_BLINK_ANCHOR.y}) scale(1, ${eyeScaleY}) translate(${-LEFT_EYE_BLINK_ANCHOR.x}, ${-LEFT_EYE_BLINK_ANCHOR.y})`;
  const rightPupilTransform = `translate(${offset.x + RIGHT_EYE_BLINK_ANCHOR.x}, ${offset.y + RIGHT_EYE_BLINK_ANCHOR.y}) scale(1, ${eyeScaleY}) translate(${-RIGHT_EYE_BLINK_ANCHOR.x}, ${-RIGHT_EYE_BLINK_ANCHOR.y})`;

  return (
    <svg
      ref={svgRef}
      width={size}
      height={Math.round(122 * scale)}
      viewBox="0 0 126 122"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clip-path="url(#catClip)">
        {/* Head */}
        <path d="M115.2 77.3C115.2 89.5 112.6 102.4 103.4 110.4C93.9 118.6 77.6 121.8 63.1 121.8C47.5 121.8 31 117.9 21.4 108.6C13.3 100.8 10.9 88.5 10.9 77.2C10.9 52.6 34.3 32.7 63.1 32.7C91.9 32.7 115.2 52.7 115.2 77.3Z" fill="#211F1F"/>
        {/* Left ear */}
        <path d="M13.2 66C13.2 66 1.59998 6.1 9.99998 0.500002C18.4 -5.1 54.1 35.8 54.1 35.8L13.2 66Z" fill="#211F1F"/>
        {/* Right ear */}
        <path d="M113.5 66.8C113.5 66.8 130.5 9.6 122.7 3.3C114.8 -3.1 71.7 35.1 71.7 35.1L113.5 66.8Z" fill="#211F1F"/>

        {/* Left eye white */}
        <g transform={leftEyeBlinkTransform}>
          <path d="M53.7 70.3C53.3 68.3 52.5 66.2 51.3 64.5C50 62.6 48.1 62.3 46.4 61C43.1 58.4 36.7 60.1 33.4 61.9C28.3 64.6 27.3 69.8 28.1 75.3C28.6 78.3 30.6 82.5 33.6 84.2C34.2 84.6 34.9 84.9 35.7 85.2C37.8 85.8 40.2 85.5 42.3 85.4C44.9 85.2 46.7 84.5 48.7 82.8C52.4 79.5 54.7 75.5 53.7 70.3Z" fill="white"/>
        </g>

        {/* Left pupil and shine */}
        <g transform={leftPupilTransform}>
          {/* Left pupil */}
          <path d="M51.8 69.9C49.8 65.3 45.9 60.4 39.8 62.4C34.2 64.2 32 69.4 33.2 74.6C34.4 79.8 39.2 83.9 45 82C47.7 81.1 49.5 79.5 50.5 77.5C51.3 76.4 51.8 75 51.9 73.4C52 72.8 52 72.1 51.9 71.5C52.1 71 52 70.4 51.8 69.9Z" fill="#211F1F"/>
          {/* Left eye shine */}
          <path d="M48.2 68.8C47.9 68.1 47.3 67.4 46.4 67.7C45.6 68 45.2 68.7 45.4 69.5C45.6 70.3 46.3 70.9 47.2 70.6C47.6 70.5 47.9 70.2 48 69.9C48.1 69.7 48.2 69.5 48.2 69.3C48.2 69.2 48.2 69.1 48.2 69C48.3 68.9 48.2 68.8 48.2 68.8Z" fill="white"/>
        </g>

        {/* Right eye white */}
        <g transform={rightEyeBlinkTransform}>
          <path d="M97.2 67.1C94.5 59.5 83.1 56.2 77 61.3C75.5 62.5 74 64.1 73 65.8C71.9 67.7 71.8 69.8 71.8 72C71.8 74.2 72.1 76.3 73.1 78.3C74 80.2 75.5 81.8 76.8 83.4C77.2 84 77.9 84.3 78.5 84.4C78.7 84.5 78.9 84.6 79 84.7C82 86.2 86.6 85.4 89.7 84.6C93.2 83.8 96 81.4 96.9 77.8C97.7 74.5 98.3 70.3 97.2 67.1Z" fill="white"/>
        </g>

        <g transform={rightPupilTransform}>
          {/* Right pupil */}
          <path d="M86.6 61.8C83.3 60 79.6 60.2 77.3 62.7C76.2 63.2 75.3 64.1 74.8 65.3C74.6 65.8 74.4 66.3 74.2 66.8C74 67.2 73.8 67.6 73.6 68C73 69.5 72.9 71 73 72.4C73 74 73.2 75.5 74 77C75.7 80.4 80.9 83.8 84.9 82.1C88.9 80.4 90.6 75.8 91 71.9C91.4 67.7 90.7 64.1 86.6 61.8Z" fill="#211F1F"/>
          {/* Right eye shine */}
          <path d="M79 66.8C78.7 66.1 78.1 65.4 77.2 65.7C76.4 66 76 66.7 76.2 67.5C76.4 68.3 77.1 68.9 78 68.6C78.4 68.5 78.7 68.2 78.8 67.9C78.9 67.7 79 67.5 79 67.3C79 67.2 79 67.1 79 67C79.1 67 79.1 66.9 79 66.8Z" fill="white"/>
        </g>

        {/* Right whiskers */}
        <path d="M112.9 88.4C116.6 88.6 120.4 88.2 124.1 87.8C124.6 87.7 124.9 87.4 124.9 87C124.9 86.6 124.5 86.1 124.1 86.2C120.4 86.6 116.7 87.1 112.9 86.8C112.4 86.8 112.1 87.2 112.1 87.6C112.1 88.1 112.5 88.4 112.9 88.4Z" fill="#211F1F"/>
        <path d="M111.2 92.2C115.6 92.4 120 92.8 124.3 93.3C124.8 93.4 125.1 92.9 125.1 92.5C125.1 92 124.7 91.7 124.3 91.7C119.9 91.2 115.6 90.8 111.2 90.6C110.1 90.5 110.2 92.2 111.2 92.2Z" fill="#211F1F"/>
        {/* Left whiskers */}
        <path d="M12.3 86.1C8.49998 86.5 4.59998 86.6 0.799976 86.5C-0.300024 86.5 -0.300024 88.2 0.799976 88.2C4.59998 88.3 8.49998 88.2 12.3 87.8C12.8 87.8 13.1 87.4 13.1 87C13.2 86.5 12.8 86 12.3 86.1Z" fill="#211F1F"/>
        <path d="M12.7 90C8.7 90.5 4.8 91.1 0.900002 92C-0.199998 92.2 0.300002 93.9 1.4 93.6C5.1 92.7 8.9 92.1 12.7 91.6C13.2 91.5 13.5 91.2 13.5 90.8C13.5 90.4 13.1 90 12.7 90Z" fill="#211F1F"/>
      </g>
      <defs>
        <clipPath id="catClip">
          <rect width="125.2" height="121.8" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}
