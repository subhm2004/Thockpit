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
import { generateWords } from '@/utils/words';
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
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        const newElapsed = (performance.now() - startTimeRef.current) / 1000;
        setElapsed(newElapsed);

        const second = Math.floor(newElapsed);
        if (second > lastSampledSecondRef.current && second <= mode) {
          sampleTimeline(second, newElapsed);
        }

        if (newElapsed >= mode) {
          finishTest(newElapsed);
        }
      }
    }, 100);
  }, [mode, finishTest, sampleTimeline]);

  const restart = useCallback((currentOptions = options) => {
    clearTimer();
    statusRef.current = 'idle';
    const newWords = generateWords(WORDS_COUNT, currentOptions);
    const newCharStates = initializeCharStates(newWords);
    
    totalKeystrokesRef.current = 0;
    correctKeystrokesRef.current = 0;
    correctCharsRef.current = 0;
    errorsSinceSampleRef.current = 0;
    timelineRef.current = [];
    lastSampledSecondRef.current = 0;
    setResult(null);

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
  }, [clearTimer, options]);

  const setMode = useCallback((newMode: TestMode) => {
    setModeState(newMode);
    restart();
  }, [restart]);

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

      const nextWordIdx = currentWordIndex + 1;

      if (nextWordIdx >= words.length) {
        finishTest(currentElapsed);
        return;
      }

      // A fast typist gets through 200+ words in a minute, so keep topping the
      // list up — the clock should end the test, never the word list.
      if (words.length - nextWordIdx <= REFILL_MARGIN) {
        const extra = generateWords(REFILL_COUNT, options);
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
      if (charTyped === expectedChar) {
        correctKeystrokesRef.current += 1;
      } else {
        errorsSinceSampleRef.current += 1;
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
    }
  }, [
    words,
    currentWordIndex,
    currentCharIndex,
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
    result,
    history,
    handleInput,
    restart,
    setMode,
    setOptions,
    clearHistory,
    inputRef,
  };
}