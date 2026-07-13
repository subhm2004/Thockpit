'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLampSound } from '@/hooks/useLampSound';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
  soundEnabled?: boolean;
}

/** Resting length of the cord, in px. */
const CORD = 170;
/** Pull it further than this and letting go flips the switch. */
const PULL_THRESHOLD = 44;
const MAX_PULL = 96;
/** Keeps the bulb from swinging off the edge of the screen. */
const MAX_SWING = 26;
/** Anything shorter than this counts as a tap, not a pull. */
const DRAG_SLOP = 4;

export default function ThemeToggle({ isDark, onToggle, soundEnabled = true }: ThemeToggleProps) {
  const [armed, setArmed] = useState(false);
  const clack = useLampSound(soundEnabled);

  const mountRef = useRef<HTMLDivElement>(null);
  const armRef = useRef<HTMLDivElement>(null);
  const cordRef = useRef<HTMLDivElement>(null);

  const dragging = useRef(false);
  const dragged = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  /** Where the cord hangs from, and how far the bulb was when you grabbed it. */
  const pivotX = useRef(0);
  const pivotY = useRef(0);
  const grabDistance = useRef(CORD);

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

      // The mount never rotates, so it gives an honest pivot even mid-swing.
      const mount = mountRef.current;
      if (mount) {
        const rect = mount.getBoundingClientRect();
        pivotX.current = rect.left + rect.width / 2;
        pivotY.current = rect.top;
      }
      grabDistance.current = Math.hypot(
        e.clientX - pivotX.current,
        Math.max(1, e.clientY - pivotY.current)
      );

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

      dragged.current = Math.max(
        dragged.current,
        Math.abs(e.clientX - startX.current) + Math.abs(e.clientY - startY.current)
      );

      // The cord points at the cursor, the way a real one would — mapping the
      // horizontal drag straight to an angle just leaves the bulb trailing
      // behind your hand.
      const dx = e.clientX - pivotX.current;
      const dy = Math.max(1, e.clientY - pivotY.current);

      // Negated: CSS rotates clockwise, and screen y points down, so a positive
      // angle swings anything *hanging below* the pivot to the left.
      const angle = (-Math.atan2(dx, dy) * 180) / Math.PI;
      swing.current = Math.max(-MAX_SWING, Math.min(MAX_SWING, angle));
      swingVelocity.current = 0;

      // Stretch is how much further than the grab point the cursor has gone.
      // Past MAX_PULL it goes rubbery.
      const stretch = Math.max(0, Math.hypot(dx, dy) - grabDistance.current);
      pull.current = stretch > MAX_PULL ? MAX_PULL + (stretch - MAX_PULL) * 0.25 : stretch;
      pullVelocity.current = 0;

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

      if (flipped) {
        clack();
        onToggle();
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [clack, onToggle, paint, settle]);

  // A tap — mouse, touch or keyboard — flips it too. A drag must not, or the
  // pull would toggle twice.
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (dragged.current > DRAG_SLOP) return;
      clack();
      onToggle();
    },
    [clack, onToggle]
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
      {/* Desktop: hangs from the top, pull it down to flip the switch.
          Far enough in that a full swing keeps the bulb on screen. */}
      <div
        ref={mountRef}
        className="fixed z-50 hidden sm:block select-none"
        style={{ top: 0, right: '170px' }}
      >
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
