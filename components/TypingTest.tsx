'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import dynamic from 'next/dynamic';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { DEFAULT_SWITCH, isSwitchId, SWITCHES, SwitchId, useKeySound } from '@/hooks/useKeySound';
import { TestMode, TestOptions } from '@/types';
import { hintCodesForChar } from '@/utils/keyboard';
import { getPref, getStringPref, setPref, setStringPref } from '@/utils/storage';
import ModeSelector from './ModeSelector';
import Stats from './Stats';
import WordDisplay from './WordDisplay';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
import ResultChart from './ResultChart';
import HistoryChart from './HistoryChart';
import StatsPanel from './StatsPanel';
import { getBestFromHistory } from '@/utils/storage';

// WebGL can only run in the browser.
const Keyboard3D = dynamic(() => import('./Keyboard3D'), { ssr: false });

const NO_KEYS: ReadonlySet<string> = new Set();

const subscribeToNothing = () => () => {};

/** False on the server and through hydration, true once we're on the client. */
function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
}

export default function TypingTest() {
  const [isFocused, setIsFocused] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const mounted = useMounted();
  // Safe to read storage while rendering: nothing below the `mounted` gate is
  // part of the hydrated markup.
  const [soundOn, setSoundOn] = useState(() => getPref('sound', true));
  const [showKeyboard, setShowKeyboard] = useState(() => getPref('keyboard', true));
  const [switchId, setSwitchId] = useState<SwitchId>(() => {
    const stored = getStringPref('switch', DEFAULT_SWITCH);
    return isSwitchId(stored) ? stored : DEFAULT_SWITCH;
  });
  const [pressedKeys, setPressedKeys] = useState<ReadonlySet<string>>(NO_KEYS);
  const [showStats, setShowStats] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    charStates,
    words,
    status,
    mode,
    options,
    stats,
    elapsed,
    inputValue,
    nextChar,
    result,
    history,
    handleInput,
    restart,
    setMode,
    setOptions,
    clearHistory,
    inputRef,
  } = useTypingEngine(30);

  const { press, release } = useKeySound(soundOn, switchId);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (status !== 'finished') {
        handleInput(e.target.value);
      }
    },
    [handleInput, status]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.repeat) return;
      press(e.code);
      setPressedKeys((prev) => {
        if (prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.add(e.code);
        return next;
      });
    },
    [press]
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      release(e.code);
      setPressedKeys((prev) => {
        if (!prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.delete(e.code);
        return next;
      });
    },
    [release]
  );

  const releaseAllKeys = useCallback(() => {
    setPressedKeys((prev) => (prev.size === 0 ? prev : NO_KEYS));
  }, []);

  // A key held while the window loses focus never fires keyup, so it would
  // otherwise stay lit forever.
  useEffect(() => {
    window.addEventListener('blur', releaseAllKeys);
    return () => window.removeEventListener('blur', releaseAllKeys);
  }, [releaseAllKeys]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    releaseAllKeys();
  }, [releaseAllKeys]);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setPref('sound', next);
  }, [soundOn]);

  const toggleKeyboard = useCallback(() => {
    const next = !showKeyboard;
    setShowKeyboard(next);
    setPref('keyboard', next);
  }, [showKeyboard]);

  const handleSwitchChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const next = e.target.value;
      if (!isSwitchId(next)) return;
      setSwitchId(next);
      setStringPref('switch', next);
      // Hand focus back so the user can carry on typing straight away.
      e.target.blur();
      inputRef.current?.focus();
    },
    [inputRef]
  );

  /**
   * The page-wide click handler refocuses the hidden input, which would snatch
   * focus off the dropdown and shut it the instant it opens.
   */
  const keepFocus = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  // Blur the typing input while the panel is up, or keystrokes would run a test
  // behind it.
  const openStats = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowStats(true);
      inputRef.current?.blur();
    },
    [inputRef]
  );

  const closeStats = useCallback(() => {
    setShowStats(false);
    inputRef.current?.focus();
  }, [inputRef]);

  const hintKeys = useMemo(
    () => (status === 'finished' ? NO_KEYS : hintCodesForChar(nextChar)),
    [nextChar, status]
  );

  const handleModeChange = useCallback(
    (newMode: TestMode) => {
      setMode(newMode);
    },
    [setMode]
  );

  const handleOptionsChange = useCallback(
    (newOptions: Partial<TestOptions>) => {
      setOptions(newOptions);
    },
    [setOptions]
  );

  const handleRestart = useCallback(() => {
    restart();
  }, [restart]);

  const handleTryAgain = useCallback(() => {
    restart();
    inputRef.current?.focus();
  }, [restart, inputRef]);

  if (!mounted) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen p-4 transition-colors duration-300 ${isDark ? 'bg-[#0f0f0f] text-zinc-100' : 'bg-gray-100 text-gray-900'}`}>
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} soundEnabled={soundOn} />
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col items-center justify-center min-h-screen p-4 transition-colors duration-500 ${isDark ? 'bg-[#0f0f0f] text-zinc-100' : 'bg-[#fafafa] text-zinc-900'}`}
      onClick={() => inputRef.current?.focus()}
    >
      <ThemeToggle isDark={isDark} onToggle={toggleTheme} soundEnabled={soundOn} />

      {/* Gets out of the way once you're typing, like the mode selector. */}
      <div
        className={`fixed top-5 left-6 z-40 transition-opacity duration-300 ${
          status === 'running' ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <Logo isDark={isDark} />
      </div>

      <div className={`transition-all duration-300 ${status === 'running' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <ModeSelector 
          mode={mode} 
          options={options}
          onModeChange={handleModeChange} 
          onOptionsChange={handleOptionsChange}
          isDark={isDark} 
        />
      </div>

      {/* The result screen carries its own, final numbers. */}
      {status !== 'finished' && (
        <Stats
          stats={stats}
          mode={mode}
          elapsed={elapsed}
          bestWpm={getBestFromHistory(history)}
          isDark={isDark}
        />
      )}

      {status !== 'finished' && (
        <div
          ref={containerRef}
          className="relative w-full max-w-7xl cursor-text text-center mt-8 px-4 overflow-hidden h-[6rem] sm:h-[6.6rem] md:h-[8rem]"
        >
          <WordDisplay charStates={charStates} words={words} isDark={isDark} />
          {!isFocused && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-zinc-800/80 text-zinc-400' : 'bg-gray-200/80 text-gray-600'}`}>
                Click to focus
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'finished' && (
        <div className="flex flex-col items-center w-full max-w-3xl mt-8 px-4">
          {/* All four read from the same saved result, so they can't disagree. */}
          <div className="flex flex-wrap justify-center gap-8 sm:gap-12 mb-8">
            <div className="text-center">
              <div className={`text-xs uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-500'} mb-1`}>WPM</div>
              <div className="text-5xl sm:text-6xl font-bold text-amber-500">{result?.wpm ?? stats.wpm}</div>
            </div>
            <div className="text-center">
              <div className={`text-xs uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-500'} mb-1`}>Accuracy</div>
              <div className="text-5xl sm:text-6xl font-bold">{result?.accuracy ?? stats.accuracy}%</div>
            </div>
            {result && (
              <>
                <div className="text-center">
                  <div className={`text-xs uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-500'} mb-1`}>Raw</div>
                  <div className={`text-5xl sm:text-6xl font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{result.raw}</div>
                </div>
                <div className="text-center">
                  <div className={`text-xs uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-500'} mb-1`}>Consistency</div>
                  <div className={`text-5xl sm:text-6xl font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {result.consistency}<span className="text-xl sm:text-2xl ml-0.5 opacity-50">%</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {result && (
            <div className="w-full flex flex-col gap-10">
              <ResultChart result={result} isDark={isDark} />
              <HistoryChart history={history} isDark={isDark} onClear={clearHistory} />
            </div>
          )}

          <button
            onClick={handleTryAgain}
            className="mt-10 px-8 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-all transform hover:scale-105"
          >
            Try Again
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 w-1 h-1 pointer-events-none"
        onChange={onInputChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
      />

      {/* The board is for typing on — the results screen is for reading. */}
      {showKeyboard && status !== 'finished' && (
        <Keyboard3D pressed={pressedKeys} hints={hintKeys} isDark={isDark} />
      )}

      <div className="flex items-center gap-2 mt-2">
        {(status === 'idle' || status === 'running') && (
          <button
            onClick={handleRestart}
            className={`px-4 py-2 transition-colors ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Restart
          </button>
        )}

        <button
          onClick={toggleSound}
          aria-label={soundOn ? 'Mute key sounds' : 'Unmute key sounds'}
          title={soundOn ? 'Key sounds on' : 'Key sounds off'}
          className={`p-2 rounded-lg transition-colors ${
            soundOn ? 'text-amber-500' : isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H2v6h4l5 4V5Z" />
            {soundOn ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="m16 9 5 6m0-6-5 6" />
            )}
          </svg>
        </button>

        <button
          onClick={toggleKeyboard}
          aria-label={showKeyboard ? 'Hide keyboard' : 'Show keyboard'}
          title={showKeyboard ? 'Keyboard visible' : 'Keyboard hidden'}
          className={`p-2 rounded-lg transition-colors ${
            showKeyboard ? 'text-amber-500' : isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path strokeLinecap="round" d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
          </svg>
        </button>

        <button
          onClick={openStats}
          aria-label="Show stats"
          title="Stats"
          className={`p-2 rounded-lg transition-colors ${
            isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
          </svg>
        </button>

        {soundOn && (
          <select
            value={switchId}
            onChange={handleSwitchChange}
            onMouseDown={keepFocus}
            onClick={keepFocus}
            aria-label="Switch type"
            className={`px-2 py-1.5 text-xs rounded-lg border cursor-pointer transition-colors ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'bg-white border-zinc-200 text-gray-500 hover:text-gray-800'
            }`}
          >
            {SWITCHES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {showStats && (
        <StatsPanel
          history={history}
          isDark={isDark}
          onClose={closeStats}
          onClear={clearHistory}
        />
      )}
    </div>
  );
}