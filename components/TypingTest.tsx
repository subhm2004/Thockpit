'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { DEFAULT_SWITCH, isSwitchId, SwitchId, useKeySound } from '@/hooks/useKeySound';
import { useCelebrationSound } from '@/hooks/useCelebrationSound';
import { shareResult, ShareOutcome } from '@/utils/shareCard';
import { TestMode, TestOptions } from '@/types';
import { hintCodesForChar, keyForChar, shiftKeyFor } from '@/utils/keyboard';
import { getPref, getStringPref, setPref, setStringPref } from '@/utils/storage';
import { DEFAULT_THEME, getTheme, isThemeId, ThemeId } from '@/utils/themes';
import ModeSelector from './ModeSelector';
import Stats from './Stats';
import WordDisplay from './WordDisplay';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
import ResultChart from './ResultChart';
import HistoryChart from './HistoryChart';
import StatsPanel from './StatsPanel';
import ReplayView from './ReplayView';
import KeyboardView, { KeyboardMode } from './KeyboardView';
import KeyboardSettings from './KeyboardSettings';
import { getBestFromHistory } from '@/utils/storage';

const NO_KEYS: ReadonlySet<string> = new Set();

/**
 * The server has no localStorage, so it always renders the default theme. The
 * pre-mount placeholder must match that exactly, or hydration mismatches on the
 * --accent it carries and the amber value sticks even after the real theme loads.
 */
const DEFAULT_ACCENT = getTheme(DEFAULT_THEME);

function isKeyboardMode(value: string): value is KeyboardMode {
  return value === '2d' || value === '3d';
}

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
  const [kbMode, setKbMode] = useState<KeyboardMode>(() => {
    const stored = getStringPref('kbmode', '3d');
    return isKeyboardMode(stored) ? stored : '3d';
  });
  const [switchId, setSwitchId] = useState<SwitchId>(() => {
    const stored = getStringPref('switch', DEFAULT_SWITCH);
    return isSwitchId(stored) ? stored : DEFAULT_SWITCH;
  });
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    const stored = getStringPref('theme', DEFAULT_THEME);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  });
  const [pressedKeys, setPressedKeys] = useState<ReadonlySet<string>>(NO_KEYS);
  const [haptics, setHaptics] = useState(() => getPref('haptics', true));
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [shared, setShared] = useState<ShareOutcome | 'failed' | null>(null);
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
  } = useTypingEngine(30);

  const { press, release } = useKeySound(soundOn, switchId);
  const celebrate = useCelebrationSound(soundOn);

  // The active theme drives both the keyboard palette and the UI accent.
  const theme = getTheme(themeId);
  const keyColors = isDark ? theme.keyboard.dark : theme.keyboard.light;

  // Accent (and the faint background wash) are published as CSS variables on
  // <html>, imperatively — kept out of the server-rendered markup so a stored
  // theme can never mismatch hydration (which otherwise stuck the default amber).
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-hover', theme.accentHover);

    // Light mode gets a whisper of the accent; dark stays true black — a tint
    // there just muddies it.
    const bg = isDark ? '#0f0f0f' : `color-mix(in srgb, ${theme.accent} 7%, #fafafa)`;
    root.style.setProperty('--app-bg', bg);
    document.body.style.backgroundColor = bg;
  }, [theme.accent, theme.accentHover, isDark]);

  /**
   * A personal best is beating everything that came *before* — the run that just
   * finished already sits at the front of the history.
   */
  const isPersonalBest = useMemo(() => {
    if (!result || history.length < 2) return false;
    return result.wpm > Math.max(...history.slice(1).map((run) => run.wpm));
  }, [history, result]);

  useEffect(() => {
    if (isPersonalBest) celebrate();
  }, [celebrate, isPersonalBest, result?.id]);

  const handleReplay = useCallback(() => {
    setReplaying(true);
  }, []);

  const handleReplayDone = useCallback(() => {
    setReplaying(false);
  }, []);

  const handleShare = useCallback(async () => {
    if (!result) return;
    try {
      setShared(await shareResult(result, isPersonalBest));
    } catch (error) {
      // Swallowing this would leave the button sitting there saying nothing.
      console.error('Could not share the result', error);
      setShared('failed');
    }
  }, [isPersonalBest, result]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  /**
   * When a real keyboard last reported a key. A boolean flag gets stuck: a
   * keydown that produces no input event (a held Backspace we cancelled, Escape,
   * Shift) would leave it set and swallow the next virtual keystroke.
   */
  const lastPhysicalKeyAt = useRef(0);

  /**
   * Phone keyboards report no `code` — often no keydown at all — so the board
   * would sit dead and silent on the device most people will open this on.
   * Here the key is worked out from the character that landed in the input, and
   * released on a timer, since there's no keyup coming either.
   */
  /** A tiny buzz on keypress — silently a no-op where the device can't vibrate. */
  const pulse = useCallback(() => {
    if (haptics && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8);
    }
  }, [haptics]);

  const flashKey = useCallback(
    (code: string) => {
      press(code);
      pulse();
      setPressedKeys((prev) => {
        const next = new Set(prev);
        next.add(code);
        return next;
      });

      window.setTimeout(() => {
        release(code);
        setPressedKeys((prev) => {
          if (!prev.has(code)) return prev;
          const next = new Set(prev);
          next.delete(code);
          return next;
        });
      }, 90);
    },
    [press, release, pulse]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (status === 'finished') return;

      const value = e.target.value;

      // Text that arrives without a keydown just before it came from a phone.
      const fromRealKeyboard = performance.now() - lastPhysicalKeyAt.current < 50;

      if (!fromRealKeyboard) {
        // `inputValue` is still the previous value at this point.
        if (value.length > inputValue.length) {
          const typed = value.slice(-1);
          const hint = keyForChar(typed);
          if (hint) {
            flashKey(hint.code);
            if (hint.shift) flashKey(shiftKeyFor(hint.code));
          }
        } else if (value.length < inputValue.length) {
          flashKey('Backspace');
        }
      }

      handleInput(value);
    },
    [flashKey, handleInput, inputValue, status]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Escape restarts from anywhere. Tab is left alone: it moves focus to the
      // Restart button, which Enter then presses — hijacking it would trap
      // keyboard users in the input.
      if (e.key === 'Escape') {
        e.preventDefault();
        restart();
        return;
      }

      // Backspace on an empty input steps back into the previous word. Held
      // down, it walks back through them, so this sits above the repeat guard.
      // preventDefault matters: React restores the word synchronously, and the
      // browser's own backspace would then eat the last letter back off it.
      if (e.key === 'Backspace' && inputValue.length === 0) {
        e.preventDefault();
        backspaceWord();
      }

      if (e.repeat) return;

      // A virtual keyboard sends no usable code; onInputChange handles those.
      if (!e.code || e.code === 'Unidentified') return;
      lastPhysicalKeyAt.current = performance.now();

      press(e.code);
      pulse();
      setPressedKeys((prev) => {
        if (prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.add(e.code);
        return next;
      });
    },
    [backspaceWord, inputValue, press, restart, pulse]
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

  const toggleHaptics = useCallback(() => {
    setHaptics((prev) => {
      setPref('haptics', !prev);
      return !prev;
    });
  }, []);

  // Settings-panel setters: they don't hand focus back to the typing input, so a
  // choice can't start a test behind the open modal.
  const selectTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    setStringPref('theme', id);
  }, []);

  const selectKbMode = useCallback((mode: KeyboardMode) => {
    setKbMode(mode);
    setStringPref('kbmode', mode);
  }, []);

  const selectSwitch = useCallback((id: SwitchId) => {
    setSwitchId(id);
    setStringPref('switch', id);
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

  const openSettings = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowSettings(true);
      inputRef.current?.blur();
    },
    [inputRef]
  );

  const closeSettings = useCallback(() => {
    setShowSettings(false);
    inputRef.current?.focus();
  }, [inputRef]);

  /**
   * The logo is the way home: from the results, from a replay, from the stats
   * panel — click it and you're back on a fresh test, ready to type.
   */
  const goHome = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowStats(false);
      setShowSettings(false);
      setReplaying(false);
      setShared(null);
      restart();
      inputRef.current?.focus();
    },
    [inputRef, restart]
  );

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
    // Whether it came from the button or from Enter on the button, you want to
    // be typing again immediately.
    inputRef.current?.focus();
  }, [restart, inputRef]);

  const handleTryAgain = useCallback(() => {
    restart();
    inputRef.current?.focus();
  }, [restart, inputRef]);

  if (!mounted) {
    // Nothing storage-derived in this markup — it must match the server exactly.
    // Accent rides on <html> (set by the effect above), never inline here.
    return (
      <div
        className={`flex flex-col items-center justify-center min-h-screen p-4 transition-colors duration-300 ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}
        style={{ backgroundColor: 'var(--app-bg)' }}
      >
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} soundEnabled={soundOn} accent={DEFAULT_ACCENT.accent} />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen p-4 transition-colors duration-500 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}
      style={{ backgroundColor: 'var(--app-bg)' }}
      onClick={() => inputRef.current?.focus()}
    >
      <ThemeToggle isDark={isDark} onToggle={toggleTheme} soundEnabled={soundOn} accent={theme.accent} />

      {/* Gets out of the way once you're typing — and while it's invisible it
          must not be clickable either. Above the stats panel, so it's the way
          back from anywhere. */}
      <button
        onClick={goHome}
        aria-label="Back to typing"
        title="Back to typing"
        className={`fixed top-5 left-6 z-[60] rounded-lg transition-opacity duration-300 hover:opacity-80 ${
          status === 'running' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <Logo isDark={isDark} accent={theme.accent} />
      </button>

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
          <WordDisplay
            charStates={charStates}
            words={words}
            activeIndex={currentWordIndex}
            isDark={isDark}
          />
          {!isFocused && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-zinc-800/80 text-zinc-400' : 'bg-gray-200/80 text-gray-600'}`}>
                Click to focus
              </div>
            </div>
          )}
        </div>
      )}

      {status !== 'finished' && quote && (
        <p className={`mt-3 text-sm italic ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          — {quote.source}
        </p>
      )}

      {/* A shortcut nobody knows about may as well not exist. */}
      {status !== 'finished' && (
        <p className={`mt-4 text-xs ${isDark ? 'text-zinc-700' : 'text-zinc-400'}`}>
          <kbd className="font-bold">esc</kbd> — restart
          <span className="mx-2 opacity-50">·</span>
          <kbd className="font-bold">tab</kbd> then <kbd className="font-bold">enter</kbd> — restart
        </p>
      )}

      {status === 'finished' && (
        <div className="flex flex-col items-center w-full max-w-3xl mt-8 px-4">
          {isPersonalBest && (
            <div className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-accent-soft border border-accent-soft">
              <span className="text-accent text-sm font-bold tracking-wide">
                ★ NEW PERSONAL BEST
              </span>
            </div>
          )}

          {/* All four read from the same saved result, so they can't disagree. */}
          <div className="flex flex-wrap justify-center gap-8 sm:gap-12 mb-8">
            <div className="text-center">
              <div className={`text-xs uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-500'} mb-1`}>WPM</div>
              <div className="text-5xl sm:text-6xl font-bold text-accent">{result?.wpm ?? stats.wpm}</div>
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

          {result && replaying && replay && (
            <div className="w-full flex flex-col items-center gap-4">
              <p className={`text-xs uppercase tracking-widest font-bold ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Replaying your run
              </p>
              <ReplayView
                replay={replay}
                isDark={isDark}
                showKeyboard={showKeyboard}
                speed={1}
                press={press}
                release={release}
                onDone={handleReplayDone}
                keyColors={keyColors}
                accent={theme.accent}
                mode={kbMode}
              />
            </div>
          )}

          {result && !replaying && (
            <div className="w-full flex flex-col gap-10">
              <ResultChart result={result} isDark={isDark} accent={theme.accent} />

              {/* Which keys let you down — the one thing a graph can't tell you. */}
              {showKeyboard && Object.keys(result.keys).length > 0 && (
                <section className="w-full flex flex-col items-center">
                  <h2
                    className={`self-start text-xs uppercase tracking-widest font-bold ${
                      isDark ? 'text-zinc-600' : 'text-zinc-400'
                    }`}
                  >
                    Keys you missed
                  </h2>

                  <KeyboardView
                    mode={kbMode}
                    pressed={NO_KEYS}
                    hints={NO_KEYS}
                    keys={result.keys}
                    rippleToken={isPersonalBest ? result.id : null}
                    isDark={isDark}
                    keyColors={keyColors}
                    accent={theme.accent}
                  />

                  <div className="flex items-center gap-5 -mt-2 text-xs">
                    {[
                      { color: '#0ca30c', label: 'clean' },
                      { color: '#fab219', label: 'slipping' },
                      { color: '#d03b3b', label: 'trouble' },
                    ].map((entry) => (
                      <span
                        key={entry.label}
                        className={`flex items-center gap-1.5 ${
                          isDark ? 'text-zinc-500' : 'text-zinc-500'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: entry.color }}
                        />
                        {entry.label}
                      </span>
                    ))}
                    <span className={isDark ? 'text-zinc-700' : 'text-zinc-400'}>
                      untouched keys stay grey
                    </span>
                  </div>
                </section>
              )}

              <HistoryChart history={history} isDark={isDark} onClear={clearHistory} accent={theme.accent} />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
            <button
              onClick={handleTryAgain}
              className="px-8 py-3 bg-accent bg-accent-hover text-black font-bold rounded-lg transition-all transform hover:scale-105"
            >
              Try Again
            </button>

            {replay && (
              <button
                onClick={handleReplay}
                disabled={replaying}
                className={`px-5 py-3 rounded-lg font-bold border transition-colors disabled:opacity-40 ${
                  isDark
                    ? 'border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'
                    : 'border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400'
                }`}
              >
                {replaying ? 'Replaying…' : 'Replay'}
              </button>
            )}

            <button
              onClick={handleShare}
              className={`px-5 py-3 rounded-lg font-bold border transition-colors ${
                isDark
                  ? 'border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'
                  : 'border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400'
              }`}
            >
              {shared === 'copied'
                ? 'Copied to clipboard'
                : shared === 'downloaded'
                  ? 'Saved'
                  : shared === 'failed'
                    ? "Couldn't share"
                    : 'Share'}
            </button>
          </div>
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
        <KeyboardView
          mode={kbMode}
          pressed={pressedKeys}
          hints={hintKeys}
          isDark={isDark}
          keyColors={keyColors}
          accent={theme.accent}
        />
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
            soundOn ? 'text-accent' : isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600'
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
            showKeyboard ? 'text-accent' : isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600'
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

        <button
          onClick={openSettings}
          aria-label="Keyboard settings"
          title="Keyboard settings"
          className={`p-2 rounded-lg transition-colors ${
            isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
            />
          </svg>
        </button>
      </div>

      {showStats && (
        <StatsPanel
          history={history}
          isDark={isDark}
          onClose={closeStats}
          onClear={clearHistory}
          accent={theme.accent}
        />
      )}

      {showSettings && (
        <KeyboardSettings
          isDark={isDark}
          accent={theme.accent}
          onClose={closeSettings}
          themeId={themeId}
          onSelectTheme={selectTheme}
          kbMode={kbMode}
          onSelectKbMode={selectKbMode}
          switchId={switchId}
          onSelectSwitch={selectSwitch}
          showKeyboard={showKeyboard}
          onToggleKeyboard={toggleKeyboard}
          haptics={haptics}
          onToggleHaptics={toggleHaptics}
          soundOn={soundOn}
          onToggleSound={toggleSound}
        />
      )}
    </div>
  );
}