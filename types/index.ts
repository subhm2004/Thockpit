export type CharStatus = 'idle' | 'correct' | 'incorrect' | 'current';

export interface CharState {
  char: string;
  status: CharStatus;
}

/** A test that ends when the clock does. */
export type TimeMode = 15 | 30 | 60;

/** …or one that ends when the sentence does. */
export type TestMode = TimeMode | 'quote';

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

/** One keystroke, kept so the board can type the test back to you. */
export interface ReplayEvent {
  /** Milliseconds from the start of the test. */
  t: number;
  /** The character typed, ' ' for space, or '\b' for a backspace. */
  char: string;
}

export interface Replay {
  words: string[];
  events: ReplayEvent[];
}

/** How a single physical key fared, keyed by KeyboardEvent.code. */
export interface KeyTally {
  presses: number;
  errors: number;
}

export type KeyTallies = Record<string, KeyTally>;

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
  /** Which keys you fumbled — drives the heatmap on the board. */
  keys: KeyTallies;
}