import { TestMode, TestResult } from '@/types';

export const MODES: TestMode[] = [15, 30, 60];

export interface StatsSummary {
  tests: number;
  bestWpm: number;
  averageWpm: number;
  averageAccuracy: number;
  averageConsistency: number;
  /** Total seconds spent typing. */
  timeTyped: number;
  /** Best run per test length; null when that length hasn't been played. */
  bestByMode: Record<TestMode, number | null>;
}

const mean = (values: number[]) =>
  values.length === 0 ? 0 : Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);

export function summarise(history: TestResult[]): StatsSummary {
  const bestByMode = Object.fromEntries(
    MODES.map((mode) => {
      const runs = history.filter((result) => result.mode === mode);
      return [mode, runs.length === 0 ? null : Math.max(...runs.map((r) => r.wpm))];
    })
  ) as Record<TestMode, number | null>;

  return {
    tests: history.length,
    bestWpm: history.length === 0 ? 0 : Math.max(...history.map((r) => r.wpm)),
    averageWpm: mean(history.map((r) => r.wpm)),
    averageAccuracy: mean(history.map((r) => r.accuracy)),
    averageConsistency: mean(history.map((r) => r.consistency)),
    timeTyped: history.reduce((total, result) => total + result.mode, 0),
    bestByMode,
  };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
