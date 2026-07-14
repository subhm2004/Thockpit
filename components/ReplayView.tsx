'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { CharState, Replay } from '@/types';
import { keyForChar, shiftKeyFor } from '@/utils/keyboard';
import WordDisplay from './WordDisplay';

const Keyboard3D = dynamic(() => import('./Keyboard3D'), { ssr: false });

const NO_KEYS: ReadonlySet<string> = new Set();
/** How long a key stays down during playback. */
const KEY_HOLD = 90;

/** Rebuild one word's colours from what was typed into it. */
function wordStates(expected: string, typed: string, active: boolean): CharState[] {
  const chars: CharState[] = expected.split('').map((char, i) => ({
    char,
    status: i < typed.length ? (typed[i] === char ? 'correct' : 'incorrect') : 'idle',
  }));

  for (let i = expected.length; i < typed.length; i++) {
    chars.push({ char: typed[i], status: 'incorrect' });
  }

  if (active && typed.length < expected.length) {
    chars[typed.length] = { ...chars[typed.length], status: 'current' };
  }

  return chars;
}

function buildStates(words: string[], typed: string[], wordIndex: number): CharState[][] {
  return words.map((word, i) => wordStates(word, typed[i] ?? '', i === wordIndex));
}

interface ReplayViewProps {
  replay: Replay;
  isDark: boolean;
  showKeyboard: boolean;
  speed: number;
  press: (code: string) => void;
  release: (code: string) => void;
  onDone: () => void;
}

/**
 * Plays the test back: the same keystrokes, at the same moments, with the same
 * sounds — including the mistakes and the backspaces.
 */
export default function ReplayView({
  replay,
  isDark,
  showKeyboard,
  speed,
  press,
  release,
  onDone,
}: ReplayViewProps) {
  const { words, events } = replay;

  const [charStates, setCharStates] = useState<CharState[][]>(() =>
    buildStates(words, [], 0)
  );
  const [wordIndex, setWordIndex] = useState(0);
  const [pressed, setPressed] = useState<ReadonlySet<string>>(NO_KEYS);
  const [finished, setFinished] = useState(false);

  const typed = useRef<string[]>([]);
  const cursor = useRef(0);
  const frame = useRef<number | null>(null);
  const holds = useRef<Map<string, number>>(new Map());
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const lift = useCallback(
    (code: string) => {
      release(code);
      setPressed((prev) => {
        if (!prev.has(code)) return prev;
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
      holds.current.delete(code);
    },
    [release]
  );

  const strike = useCallback(
    (code: string) => {
      press(code);
      setPressed((prev) => {
        const next = new Set(prev);
        next.add(code);
        return next;
      });

      const existing = holds.current.get(code);
      if (existing) window.clearTimeout(existing);
      holds.current.set(code, window.setTimeout(() => lift(code), KEY_HOLD));
    },
    [lift, press]
  );

  useEffect(() => {
    const startedAt = performance.now();
    const wordIndexRef = { current: 0 };
    const timers = holds.current;

    const step = () => {
      const elapsed = (performance.now() - startedAt) * speed;

      let moved = false;
      while (cursor.current < events.length && events[cursor.current].t <= elapsed) {
        const { char } = events[cursor.current];
        cursor.current += 1;
        moved = true;

        const current = typed.current[wordIndexRef.current] ?? '';

        if (char === ' ') {
          typed.current[wordIndexRef.current] = current;
          wordIndexRef.current += 1;
          strike('Space');
        } else if (char === '\b') {
          if (current.length > 0) {
            typed.current[wordIndexRef.current] = current.slice(0, -1);
          } else if (wordIndexRef.current > 0) {
            wordIndexRef.current -= 1;
          }
          strike('Backspace');
        } else {
          typed.current[wordIndexRef.current] = current + char;
          const hint = keyForChar(char);
          if (hint) {
            strike(hint.code);
            if (hint.shift) strike(shiftKeyFor(hint.code));
          }
        }
      }

      if (moved) {
        setWordIndex(wordIndexRef.current);
        setCharStates(buildStates(words, typed.current, wordIndexRef.current));
      }

      if (cursor.current >= events.length) {
        setFinished(true);
        onDoneRef.current();
        return;
      }

      frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, [events, speed, strike, words]);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full max-w-7xl text-center px-4 overflow-hidden h-[6rem] sm:h-[6.6rem] md:h-[8rem]">
        <WordDisplay
          charStates={charStates}
          words={words}
          activeIndex={wordIndex}
          isDark={isDark}
        />
      </div>

      {showKeyboard && (
        <Keyboard3D pressed={finished ? NO_KEYS : pressed} hints={NO_KEYS} isDark={isDark} />
      )}
    </div>
  );
}
