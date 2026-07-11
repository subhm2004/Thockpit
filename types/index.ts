export type CharStatus = 'idle' | 'correct' | 'incorrect' | 'current';

export interface CharState {
  char: string;
  status: CharStatus;
}

export type TestMode = 15 | 30 | 60;

export interface TestOptions {
  punctuation: boolean;
  numbers: boolean;
  capitals: boolean;
}

export type TestStatus = 'idle' | 'running' | 'finished';

export interface TypingStats {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  elapsed: number;
  correctChars: number;
  totalTyped: number;
}

/** One sample per elapsed second, for the result graph. */
export interface TimelinePoint {
  second: number;
  wpm: number;
  raw: number;
  /** Mistyped keystrokes during this second. */
  errors: number;
}

export interface TestResult {
  id: string;
  /** Epoch ms. */
  timestamp: number;
  mode: TestMode;
  options: TestOptions;
  wpm: number;
  raw: number;
  accuracy: number;
  /** How even the typing speed was, 0–100. */
  consistency: number;
  timeline: TimelinePoint[];
}