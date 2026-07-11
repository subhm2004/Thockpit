import { CharState, TypingStats } from '@/types';

export function calculateWpm(chars: number, elapsedSeconds: number): number {
  if (elapsedSeconds === 0) return 0;
  return Math.round((chars / 5) / (elapsedSeconds / 60));
}

export function calculateAccuracy(correctChars: number, totalTyped: number): number {
  if (totalTyped === 0) return 100;
  return Math.round((correctChars / totalTyped) * 100);
}

export function computeStats(
  charStates: CharState[][],
  elapsed: number,
  totalKeystrokes: number,
  correctKeystrokes: number
): TypingStats {
  let correctChars = 0;

  charStates.forEach((wordChars, wordIdx) => {
    wordChars.forEach((char) => {
      if (char.status === 'correct') {
        correctChars++;
      }
    });

    if (wordIdx < charStates.length - 1) {
      const hasContent = wordChars.some((c) => c.status !== 'idle');
      if (hasContent) {
        correctChars++;
      }
    }
  });

  return {
    wpm: calculateWpm(correctChars, elapsed),
    rawWpm: calculateWpm(totalKeystrokes, elapsed),
    accuracy: calculateAccuracy(correctKeystrokes, totalKeystrokes),
    elapsed,
    correctChars,
    totalTyped: totalKeystrokes,
  };
}
