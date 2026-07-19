'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { CharState } from '@/types';

interface WordRowProps {
  charStates: CharState[];
  isDark?: boolean;
  ref?: React.Ref<HTMLSpanElement>;
}

const WordRow = React.memo(function WordRow({ charStates, isDark = true, ref }: WordRowProps) {
  return (
    <span className="inline-block mr-4 mb-2" ref={ref}>
      {charStates.map((charState, index) => (
        <span
          key={index}
          className={`
            inline transition-colors duration-75
            ${charState.status === 'idle' ? (isDark ? 'text-zinc-500' : 'text-gray-400') : ''}
            ${charState.status === 'correct' ? 'text-green-500' : ''}
            ${charState.status === 'incorrect' ? 'text-red-500 bg-red-100 dark:bg-red-900/20' : ''}
            ${charState.status === 'current' ? 'text-zinc-900 dark:text-white bg-accent-soft border-l-2 border-accent' : ''}
          `}
        >
          {charState.char}
        </span>
      ))}
    </span>
  );
});

WordRow.displayName = 'WordRow';

interface WordDisplayProps {
  charStates: CharState[][];
  words: string[];
  /** The word being typed. The view scrolls to keep it on screen. */
  activeIndex: number;
  isDark?: boolean;
}

const WordDisplay = React.memo(function WordDisplay({
  charStates,
  words,
  activeIndex,
  isDark = true,
}: WordDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);

  /**
   * The box only shows three lines and the word list now refills forever, so
   * without this the caret walks off the bottom and vanishes. Written straight
   * to the DOM — it runs on every keystroke, and state would re-render the lot.
   */
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const active = activeRef.current;
    if (!scroller || !active) return;

    // Hold the active word on the second line, so there's always a line to read ahead.
    const lineHeight = active.offsetHeight;
    const shift = Math.max(0, active.offsetTop - lineHeight);
    scroller.style.transform = `translateY(${-shift}px)`;
  });

  return (
    <div
      ref={scrollRef}
      className="flex flex-wrap leading-relaxed text-lg sm:text-xl md:text-2xl font-['JetBrains_Mono',_monospace] transition-transform duration-150 ease-out"
    >
      {words.map((word, index) => (
        <WordRow
          key={index}
          ref={index === activeIndex ? activeRef : undefined}
          charStates={charStates[index] || []}
          isDark={isDark}
        />
      ))}
    </div>
  );
});

WordDisplay.displayName = 'WordDisplay';

export default WordDisplay;
