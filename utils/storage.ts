import { TestResult } from '@/types';

const PREFIX = "owntype_";

const HISTORY_KEY = 'history';
const PREF_KEY = (name: string) => `pref_${name}`;
const HISTORY_LIMIT = 50;

function read(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PREFIX + key);
}

function write(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // Quota exceeded — nothing useful to do, and it must not break typing.
  }
}

export function getHistory(): TestResult[] {
  try {
    const stored = read(HISTORY_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is TestResult =>
        typeof entry === 'object' && entry !== null && 'wpm' in entry && 'timeline' in entry
    );
  } catch {
    // Corrupt or unreadable storage shouldn't take the app down.
    return [];
  }
}

/** Newest first. Returns the updated list. */
export function addResult(result: TestResult): TestResult[] {
  const history = [result, ...getHistory()].slice(0, HISTORY_LIMIT);
  write(HISTORY_KEY, JSON.stringify(history));
  return history;
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PREFIX + HISTORY_KEY);
}

export function getBestFromHistory(history: TestResult[]): number | null {
  if (history.length === 0) return null;
  return history.reduce((best, result) => Math.max(best, result.wpm), 0);
}

export function getPref(key: string, fallback: boolean): boolean {
  const stored = read(PREF_KEY(key));
  return stored === null ? fallback : stored === 'true';
}

export function setPref(key: string, value: boolean): void {
  write(PREF_KEY(key), String(value));
}

export function getStringPref(key: string, fallback: string): string {
  return read(PREF_KEY(key)) ?? fallback;
}

export function setStringPref(key: string, value: string): void {
  write(PREF_KEY(key), value);
}
