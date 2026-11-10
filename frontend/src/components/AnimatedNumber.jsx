import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Cuenta desde 0 hasta `value` al montar. Respeta prefers-reduced-motion.
 */
export default function AnimatedNumber({ value = 0, duration = 900 }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(() =>
    prefersReducedMotion() ? target : 0
  );
  const frameRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      frameRef.current = requestAnimationFrame(() => setDisplay(target));
      return () => cancelAnimationFrame(frameRef.current);
    }

    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return <>{display}</>;
}
