'use client';

import React from 'react';
import { TypingStats, TestMode } from '@/types';

interface StatsProps {
  stats: TypingStats;
  mode: TestMode;
  elapsed: number;
  bestWpm: number | null;
  isDark?: boolean;
}

const Stats = React.memo(function Stats({ stats, mode, elapsed, bestWpm, isDark = true }: StatsProps) {
  // A quote has no clock to run out, so its timer counts up instead of down.
  const timed = typeof mode === 'number';
  const seconds = timed ? Math.max(0, Math.floor(mode - elapsed)) : Math.floor(elapsed);
  const runningOut = timed && seconds <= 5;

  return (
    <div className="flex flex-col items-center mb-10 font-['JetBrains_Mono',_monospace] animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex flex-wrap justify-center gap-8 sm:gap-16">
        <div className="flex flex-col items-center">
          <span className={`text-xs uppercase tracking-widest font-bold mb-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>WPM</span>
          <div className={`text-4xl sm:text-5xl font-black ${isDark ? 'text-zinc-100' : 'text-black'}`}>
            {stats.wpm}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className={`text-xs uppercase tracking-widest font-bold mb-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Accuracy</span>
          <div className={`text-4xl sm:text-5xl font-black ${isDark ? 'text-zinc-100' : 'text-black'}`}>
            {stats.accuracy}<span className="text-xl sm:text-2xl ml-0.5 opacity-50">%</span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className={`text-xs uppercase tracking-widest font-bold mb-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            {timed ? 'Time Left' : 'Time'}
          </span>
          <div className={`text-4xl sm:text-5xl font-black ${runningOut ? 'text-red-500 animate-pulse' : isDark ? 'text-zinc-100' : 'text-black'}`}>
            {seconds}<span className="text-xl sm:text-2xl ml-0.5 opacity-50">s</span>
          </div>
        </div>
      </div>
      {bestWpm !== null && (
        <div className="text-amber-500 text-sm mt-2">Best: {bestWpm} WPM</div>
      )}
    </div>
  );
});

export default Stats;