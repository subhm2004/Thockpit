const STORAGE_KEY = 'owntype_best_wpm';

export function getBestWpm(): number | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? parseInt(stored, 10) : null;
}

export function setBestWpm(wpm: number): void {
  if (typeof window === 'undefined') return;
  const current = getBestWpm();
  if (current === null || wpm > current) {
    localStorage.setItem(STORAGE_KEY, wpm.toString());
  }
}

const PREF_PREFIX = 'owntype_pref_';

export function getPref(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const stored = localStorage.getItem(PREF_PREFIX + key);
  return stored === null ? fallback : stored === 'true';
}

export function setPref(key: string, value: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREF_PREFIX + key, String(value));
}

export function getStringPref(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem(PREF_PREFIX + key) ?? fallback;
}

export function setStringPref(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREF_PREFIX + key, value);
}
