import { useState, useRef, useCallback, useEffect } from 'react';
import {
  CharState,
  TestMode,
  TestResult,
  TestStatus,
  TimelinePoint,
  TypingStats,
  TestOptions,
} from '@/types';
import { KeyTallies, Replay, ReplayEvent } from '@/types';
import { generateWords } from '@/utils/words';
import { Quote, randomQuote } from '@/utils/quotes';
import { keyForChar } from '@/utils/keyboard';
import { calculateAccuracy, calculateConsistency, calculateWpm, computeStats } from '@/utils/typing';
import { addResult, clearHistory as clearStoredHistory, getHistory } from '@/utils/storage';

const WORDS_COUNT = 100;
/** Top up the words once you're this close to the end of them. */
const REFILL_MARGIN = 30;
const REFILL_COUNT = 50;

function initializeCharStates(words: string[], markFirstCurrent = true): CharState[][] {
  return words.map((word, wordIndex) => {
    const chars: CharState[] = word.split('').map((char, charIndex) => ({
      char,
      status: markFirstCurrent && wordIndex === 0 && charIndex === 0 ? 'current' : 'idle',
    }));
    return chars;
  });
}

export function useTypingEngine(initialMode: TestMode = 30) {
  const [options, setOptionsState] = useState<TestOptions>({
    punctuation: false,
    numbers: false,
    capitals: false,
  });

  const [initialData] = useState(() => {
    const w = generateWords(WORDS_COUNT, { punctuation: false, numbers: false, capitals: false });
    return {
      words: w,
      charStates: initializeCharStates(w)
    };
  });

  const [words, setWords] = useState<string[]>(initialData.words);
  const [charStates, setCharStates] = useState<CharState[][]>(initialData.charStates);
  /** Set only in quote mode — the sentence you're typing, and where it came from. */
  const [quote, setQuote] = useState<Quote | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [status, setStatus] = useState<TestStatus>('idle');
  const [mode, setModeState] = useState<TestMode>(initialMode);
  const [elapsed, setElapsed] = useState(0);
  const [inputValue, setInputValue] = useState('');
  
  // Stats tracking
  const totalKeystrokesRef = useRef(0);
  const correctKeystrokesRef = useRef(0);
  /** Mirrors the correct-character count so the timer can sample it. */
  const correctCharsRef = useRef(0);
  /** Mistakes made since the last timeline sample. */
  const errorsSinceSampleRef = useRef(0);
  /** What was actually typed into each finished word, so backspace can go back. */
  const typedWordsRef = useRef<Record<number, string>>({});
  /** Hits and misses per physical key, for the heatmap. */
  const keysRef = useRef<KeyTallies>({});
  /** Every keystroke and when it landed, so the board can play the test back. */
  const eventsRef = useRef<ReplayEvent[]>([]);
  /** Mirrors `words`, because finishTest has no business re-running on every refill. */
  const wordsRef = useRef<string[]>(initialData.words);
  const [replay, setReplay] = useState<Replay | null>(null);
  const timelineRef = useRef<TimelinePoint[]>([]);
  const lastSampledSecondRef = useRef(0);

  const [result, setResult] = useState<TestResult | null>(null);
  // Read once on the client; the UI that shows it is behind a mounted gate.
  const [history, setHistory] = useState<TestResult[]>(() => getHistory());
  const [stats, setStats] = useState<TypingStats>(() => ({
    wpm: 0,
    rawWpm: 0,
    accuracy: 100,
    elapsed: 0,
    correctChars: 0,
    totalTyped: 0,
  }));

  const statusRef = useRef<TestStatus>('idle');
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  const updateStats = useCallback((currentElapsed: number, currentChars: CharState[][]) => {
    const newStats = computeStats(
      currentChars,
      currentElapsed,
      totalKeystrokesRef.current,
      correctKeystrokesRef.current
    );
    correctCharsRef.current = newStats.correctChars;
    setStats(newStats);
  }, []);

  /** One point per elapsed second — this is what the result graph draws. */
  const sampleTimeline = useCallback((second: number, currentElapsed: number) => {
    timelineRef.current.push({
      second,
      wpm: calculateWpm(correctCharsRef.current, currentElapsed),
      raw: calculateWpm(totalKeystrokesRef.current, currentElapsed),
      errors: errorsSinceSampleRef.current,
    });
    errorsSinceSampleRef.current = 0;
    lastSampledSecondRef.current = second;
  }, []);

  const finishTest = useCallback(
    (currentElapsed: number) => {
      clearTimer();
      statusRef.current = 'finished';
      setStatus('finished');

      // Catch the tail of the test, so a run that ends mid-second still lands
      // on the graph.
      const finalSecond = Math.round(currentElapsed);
      if (finalSecond > lastSampledSecondRef.current) {
        sampleTimeline(finalSecond, currentElapsed);
      }

      // An untouched test is not a result worth keeping.
      if (totalKeystrokesRef.current === 0) return;

      // Kept in memory only: a minute of fast typing is a thousand keystrokes,
      // and fifty of those in localStorage would blow the quota.
      setReplay({ words: wordsRef.current, events: eventsRef.current });

      const timeline = timelineRef.current;
      const updated = addResult({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        mode,
        options,
        wpm: calculateWpm(correctCharsRef.current, currentElapsed),
        raw: calculateWpm(totalKeystrokesRef.current, currentElapsed),
        accuracy: calculateAccuracy(correctKeystrokesRef.current, totalKeystrokesRef.current),
        consistency: calculateConsistency(timeline),
        timeline,
        keys: keysRef.current,
      });

      setHistory(updated);
      setResult(updated[0]);
    },
    [clearTimer, mode, options, sampleTimeline]
  );

  const clearHistory = useCallback(() => {
    clearStoredHistory();
    setHistory([]);
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = performance.now();
    statusRef.current = 'running';
    setStatus('running');

    // A quote has no clock — it ends when the sentence does, so the timer just
    // counts up underneath it.
    const limit = typeof mode === 'number' ? mode : Infinity;

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        const newElapsed = (performance.now() - startTimeRef.current) / 1000;
        setElapsed(newElapsed);

        const second = Math.floor(newElapsed);
        if (second > lastSampledSecondRef.current && second <= limit) {
          sampleTimeline(second, newElapsed);
        }

        if (newElapsed >= limit) {
          finishTest(newElapsed);
        }
      }
    }, 100);
  }, [mode, finishTest, sampleTimeline]);

  const restart = useCallback((currentOptions = options, currentMode: TestMode = mode) => {
    clearTimer();
    statusRef.current = 'idle';

    const nextQuote = currentMode === 'quote' ? randomQuote() : null;
    const newWords = nextQuote
      ? nextQuote.text.split(' ')
      : generateWords(WORDS_COUNT, currentOptions);
    const newCharStates = initializeCharStates(newWords);

    setQuote(nextQuote);

    totalKeystrokesRef.current = 0;
    correctKeystrokesRef.current = 0;
    correctCharsRef.current = 0;
    errorsSinceSampleRef.current = 0;
    timelineRef.current = [];
    typedWordsRef.current = {};
    keysRef.current = {};
    eventsRef.current = [];
    setReplay(null);
    lastSampledSecondRef.current = 0;
    setResult(null);

    wordsRef.current = newWords;
    setWords(newWords);
    setCharStates(newCharStates);
    setCurrentWordIndex(0);
    setCurrentCharIndex(0);
    setStatus('idle');
    setElapsed(0);
    setStats({
      wpm: 0,
      rawWpm: 0,
      accuracy: 100,
      elapsed: 0,
      correctChars: 0,
      totalTyped: 0,
    });
    setInputValue('');
  }, [clearTimer, mode, options]);

  const setMode = useCallback(
    (newMode: TestMode) => {
      setModeState(newMode);
      // restart() closes over the old mode, so the new one has to be handed over.
      restart(options, newMode);
    },
    [options, restart]
  );

  const setOptions = useCallback((newOptions: Partial<TestOptions>) => {
    setOptionsState(prev => {
      const next = { ...prev, ...newOptions };
      restart(next);
      return next;
    });
  }, [restart]);

  const getElapsed = useCallback(() => {
    if (startTimeRef.current === null) return 0;
    return (performance.now() - startTimeRef.current) / 1000;
  }, []);

  /** Rebuild a word's char states from what was typed into it. */
  const replayWord = useCallback((expected: string, typed: string): CharState[] => {
    const chars: CharState[] = expected.split('').map((char, i) => ({
      char,
      status: i < typed.length ? (typed[i] === char ? 'correct' : 'incorrect') : 'idle',
    }));

    // Anything typed past the end of the word hangs off it, still wrong.
    for (let i = expected.length; i < typed.length; i++) {
      chars.push({ char: typed[i], status: 'incorrect' });
    }

    if (typed.length < expected.length) {
      chars[typed.length] = { ...chars[typed.length], status: 'current' };
    }

    return chars;
  }, []);

  /**
   * Backspace with an empty input steps back into the previous word, with
   * whatever you typed into it still there — so a mistake two words ago is
   * fixable, the way it is on a real keyboard.
   */
  const backspaceWord = useCallback(() => {
    if (statusRef.current === 'finished' || currentWordIndex === 0) return;

    eventsRef.current.push({ t: Math.round(getElapsed() * 1000), char: '\b' });

    const previousIndex = currentWordIndex - 1;
    const typed = typedWordsRef.current[previousIndex] ?? '';
    const expected = words[previousIndex] ?? '';

    setCurrentWordIndex(previousIndex);
    setCurrentCharIndex(typed.length);
    setInputValue(typed);

    setCharStates((prev) => {
      const next = [...prev];
      next[previousIndex] = replayWord(expected, typed);
      // The word we just left goes back to untouched.
      next[currentWordIndex] = initializeCharStates([words[currentWordIndex] ?? ''], false)[0];
      return next;
    });
  }, [currentWordIndex, getElapsed, words, replayWord]);

  const handleInput = useCallback((value: string) => {
    if (statusRef.current === 'finished') return;

    if (statusRef.current === 'idle' && value.length > 0) {
      startTimer();
    }

    const currentElapsed = getElapsed();
    const currentWord = words[currentWordIndex];
    if (!currentWord) return;

    if (value.endsWith(' ')) {
      const typedWord = value.trim();
      if (typedWord.length === 0) {
        setInputValue('');
        return;
      }

      totalKeystrokesRef.current += 1;
      correctKeystrokesRef.current += 1;
      eventsRef.current.push({ t: Math.round(currentElapsed * 1000), char: ' ' });

      // Remember what was actually typed — the char states only keep the
      // *expected* letters, so without this there's nothing to come back to.
      typedWordsRef.current[currentWordIndex] = typedWord;

      const nextWordIdx = currentWordIndex + 1;

      if (nextWordIdx >= words.length) {
        finishTest(currentElapsed);
        return;
      }

      // A fast typist gets through 200+ words in a minute, so keep topping the
      // list up — the clock should end the test, never the word list. (A quote
      // is exactly as long as it is.)
      if (mode !== 'quote' && words.length - nextWordIdx <= REFILL_MARGIN) {
        const extra = generateWords(REFILL_COUNT, options);
        wordsRef.current = [...wordsRef.current, ...extra];
        setWords((prev) => [...prev, ...extra]);
        setCharStates((prev) => [...prev, ...initializeCharStates(extra, false)]);
      }

      setCurrentWordIndex(nextWordIdx);
      setCurrentCharIndex(0);

      setCharStates(prev => {
        const next = [...prev];
        next[currentWordIndex] = next[currentWordIndex].map(c => 
          c.status === 'current' ? { ...c, status: 'idle' } : c
        );
        if (next[nextWordIdx]) {
          next[nextWordIdx] = next[nextWordIdx].map((c, i) => 
            i === 0 ? { ...c, status: 'current' } : c
          );
        }
        updateStats(currentElapsed, next);
        return next;
      });

      setInputValue('');
      return;
    }

    setInputValue(value);

    if (value.length < currentCharIndex) {
      eventsRef.current.push({ t: Math.round(currentElapsed * 1000), char: '\b' });
      setCurrentCharIndex(value.length);
      setCharStates(prev => {
        const next = [...prev];
        const wordChars = [...next[currentWordIndex]];
        if (wordChars[value.length]) {
          wordChars[value.length] = { ...wordChars[value.length], status: 'current' };
        }
        for (let i = value.length + 1; i < wordChars.length; i++) {
          wordChars[i] = { ...wordChars[i], status: 'idle' };
        }
        next[currentWordIndex] = wordChars.slice(0, Math.max(words[currentWordIndex].length, value.length));
        updateStats(currentElapsed, next);
        return next;
      });
      return;
    }

    const charTyped = value[value.length - 1];
    const expectedChar = currentWord[currentCharIndex];
    
    if (charTyped) {
      totalKeystrokesRef.current += 1;
      eventsRef.current.push({ t: Math.round(currentElapsed * 1000), char: charTyped });
      const correct = charTyped === expectedChar;

      if (correct) {
        correctKeystrokesRef.current += 1;
      } else {
        errorsSinceSampleRef.current += 1;
      }

      // Tally against the key you were *meant* to hit — that's the one you need
      // to know you keep missing.
      const target = keyForChar(expectedChar);
      if (target) {
        const tally = (keysRef.current[target.code] ??= { presses: 0, errors: 0 });
        tally.presses += 1;
        if (!correct) tally.errors += 1;
      }

      setCharStates(prev => {
        const next = [...prev];
        const wordChars = [...next[currentWordIndex]];
        
        if (currentCharIndex < currentWord.length) {
          wordChars[currentCharIndex] = {
            char: expectedChar,
            status: charTyped === expectedChar ? 'correct' : 'incorrect'
          };
          if (currentCharIndex + 1 < currentWord.length) {
            wordChars[currentCharIndex + 1] = {
              ...wordChars[currentCharIndex + 1],
              status: 'current'
            };
          }
        } else {
          wordChars.push({ char: charTyped, status: 'incorrect' });
        }
        
        next[currentWordIndex] = wordChars;
        updateStats(currentElapsed, next);
        return next;
      });

      setCurrentCharIndex(value.length);

      // A quote is done the moment its last word is, with no trailing space to
      // press. The char state above only lands on the next render, so the count
      // for this final keystroke is added by hand.
      if (mode === 'quote' && currentWordIndex === words.length - 1 && value === currentWord) {
        if (correct) correctCharsRef.current += 1;
        finishTest(currentElapsed);
      }
    }
  }, [
    words,
    currentWordIndex,
    currentCharIndex,
    mode,
    options,
    startTimer,
    getElapsed,
    updateStats,
    finishTest,
  ]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  useEffect(() => {
    if (status === 'running') {
      updateStats(elapsed, charStates);
    }
  }, [elapsed, status, updateStats, charStates]);

  /** The character the user has to type next — ' ' once the word is complete. */
  const nextChar = (() => {
    const word = words[currentWordIndex] ?? '';
    return currentCharIndex < word.length ? word[currentCharIndex] : ' ';
  })();

  return {
    charStates,
    words,
    status,
    mode,
    options,
    stats,
    elapsed,
    inputValue,
    nextChar,
    currentWordIndex,
    quote,
    replay,
    result,
    history,
    handleInput,
    backspaceWord,
    restart,
    setMode,
    setOptions,
    clearHistory,
    inputRef,
  };
}