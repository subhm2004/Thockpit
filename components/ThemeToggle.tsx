'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

/** Resting length of the cord, in px. */
const CORD = 170;
/** Pull it further than this and letting go flips the switch. */
const PULL_THRESHOLD = 44;
const MAX_PULL = 96;
/** Anything shorter than this counts as a tap, not a pull. */
const DRAG_SLOP = 4;

export default function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  const [armed, setArmed] = useState(false);

  const armRef = useRef<HTMLDivElement>(null);
  const cordRef = useRef<HTMLDivElement>(null);

  const dragging = useRef(false);
  const dragged = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);

  // Cord stretch and pendulum swing, both spring back to rest.
  const pull = useRef(0);
  const pullVelocity = useRef(0);
  const swing = useRef(0);
  const swingVelocity = useRef(0);
  const frame = useRef<number | null>(null);

  const paint = useCallback(() => {
    if (cordRef.current) cordRef.current.style.height = `${CORD + pull.current}px`;
    if (armRef.current) armRef.current.style.transform = `rotate(${swing.current}deg)`;
  }, []);

  const settle = useCallback(() => {
    const step = () => {
      if (!dragging.current) {
        // Springy snap back — overshoots a little, like a real cord.
        pullVelocity.current += -pull.current * 0.22;
        pullVelocity.current *= 0.76;
        pull.current += pullVelocity.current;

        swingVelocity.current += -swing.current * 0.006;
        swingVelocity.current *= 0.98;
        swing.current += swingVelocity.current;

        const pullAtRest = Math.abs(pull.current) < 0.2 && Math.abs(pullVelocity.current) < 0.2;
        const swingAtRest = Math.abs(swing.current) < 0.1 && Math.abs(swingVelocity.current) < 0.1;

        if (pullAtRest) {
          pull.current = 0;
          pullVelocity.current = 0;
        }
        if (swingAtRest) {
          swing.current = 0;
          swingVelocity.current = 0;
        }

        paint();

        if (pullAtRest && swingAtRest) {
          frame.current = null;
          return;
        }
      }
      frame.current = requestAnimationFrame(step);
    };

    frame.current ??= requestAnimationFrame(step);
  }, [paint]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      dragging.current = true;
      dragged.current = 0;
      startX.current = e.clientX;
      startY.current = e.clientY;
      settle();
    },
    [settle]
  );

  // Tracked on the window rather than with setPointerCapture: capturing
  // retargets the follow-up click to the capturing element, which would stop a
  // plain tap on the bulb from ever reaching the button's onClick.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;

      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      dragged.current = Math.max(dragged.current, Math.abs(dx) + Math.abs(dy));

      // Pulling down stretches the cord; past MAX_PULL it goes rubbery.
      const down = Math.max(0, dy);
      pull.current = down > MAX_PULL ? MAX_PULL + (down - MAX_PULL) * 0.25 : down;
      pullVelocity.current = 0;

      swing.current = Math.max(-24, Math.min(24, dx * 0.16));
      swingVelocity.current = 0;

      setArmed(pull.current >= PULL_THRESHOLD);
      paint();
    };

    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;

      const flipped = pull.current >= PULL_THRESHOLD;
      setArmed(false);

      // Let go and the cord whips back up.
      pullVelocity.current = -Math.min(pull.current, MAX_PULL) * 0.35;
      settle();

      if (flipped) onToggle();
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [onToggle, paint, settle]);

  // A tap — mouse, touch or keyboard — flips it too. A drag must not, or the
  // pull would toggle twice.
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (dragged.current > DRAG_SLOP) return;
      onToggle();
    },
    [onToggle]
  );

  // Cord length and swing are driven imperatively (they change every frame).
  // Re-running this after every render keeps a state change — arming the pull —
  // from letting React paint the resting cord back over a live drag.
  useEffect(paint);

  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  const bulb = (
    <button
      onClick={handleClick}
      aria-label={isDark ? 'Turn the light on' : 'Turn the light off'}
      aria-pressed={!isDark}
      className={`
        relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center
        transition-all duration-300 cursor-grab active:cursor-grabbing touch-none
        ${
          isDark
            ? 'bg-zinc-700 shadow-inner shadow-black/40 hover:bg-zinc-600'
            : 'bg-amber-300 shadow-[0_0_40px_12px_rgba(251,191,36,0.55)] hover:bg-amber-200'
        }
        ${armed ? 'scale-110 ring-2 ring-amber-400/70' : ''}
      `}
    >
      {/* Filament */}
      <svg
        className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors duration-300 ${
          isDark ? 'text-zinc-500' : 'text-amber-700'
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 17.5h6M10 20.5h4M8.5 14a5.5 5.5 0 1 1 7 0c-.7.6-1 1.3-1 2h-5c0-.7-.3-1.4-1-2Z"
        />
      </svg>
    </button>
  );

  return (
    <>
      {/* Desktop: hangs from the top, pull it down to flip the switch */}
      <div className="fixed z-50 hidden sm:block select-none" style={{ top: 0, right: '100px' }}>
        <div
          ref={armRef}
          onPointerDown={handlePointerDown}
          className="flex flex-col items-center touch-none"
          style={{ transformOrigin: 'top center', cursor: 'grab' }}
        >
          <div
            ref={cordRef}
            className={`w-0.5 transition-colors duration-300 ${
              isDark ? 'bg-zinc-600' : 'bg-amber-600/80'
            }`}
            style={{ height: `${CORD}px` }}
          />
          <div className={`w-2.5 h-2.5 rounded-full -mt-0.5 ${isDark ? 'bg-zinc-600' : 'bg-amber-700'}`} />
          {bulb}
        </div>
      </div>

      {/* Mobile: no room for a cord, so just tap it */}
      <div className="fixed z-50 top-4 right-4 sm:hidden">{bulb}</div>
    </>
  );
}
