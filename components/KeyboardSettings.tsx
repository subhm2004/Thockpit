'use client';

import React, { useCallback, useEffect } from 'react';
import { SWITCHES, SwitchId } from '@/hooks/useKeySound';
import { THEMES, ThemeId } from '@/utils/themes';
import { KeyboardMode } from './KeyboardView';

interface ToggleProps {
  label: string;
  on: boolean;
  onToggle: () => void;
  isDark: boolean;
  accent: string;
  disabled?: boolean;
}

/** The pill switch — accent when on, grey when off. */
function Toggle({ label, on, onToggle, isDark, accent, disabled }: ToggleProps) {
  return (
    <div className={`flex items-center justify-between ${disabled ? 'opacity-40' : ''}`}>
      <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={onToggle}
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed"
        style={{ backgroundColor: on ? accent : isDark ? '#3f3f46' : '#d4d4d8' }}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

interface KeyboardSettingsProps {
  isDark: boolean;
  accent: string;
  onClose: () => void;
  themeId: ThemeId;
  onSelectTheme: (id: ThemeId) => void;
  kbMode: KeyboardMode;
  onSelectKbMode: (mode: KeyboardMode) => void;
  switchId: SwitchId;
  onSelectSwitch: (id: SwitchId) => void;
  showKeyboard: boolean;
  onToggleKeyboard: () => void;
  haptics: boolean;
  onToggleHaptics: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
}

export default function KeyboardSettings({
  isDark,
  accent,
  onClose,
  themeId,
  onSelectTheme,
  kbMode,
  onSelectKbMode,
  switchId,
  onSelectSwitch,
  showKeyboard,
  onToggleKeyboard,
  haptics,
  onToggleHaptics,
  soundOn,
  onToggleSound,
}: KeyboardSettingsProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Clicks inside must not reach the page, which would refocus the typing input.
  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  const labelClass = `block text-xs uppercase tracking-widest font-bold mb-2 ${
    isDark ? 'text-zinc-500' : 'text-zinc-400'
  }`;
  const selectClass = `w-full px-3 py-2.5 rounded-xl border text-sm cursor-pointer transition-colors ${
    isDark
      ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-600'
      : 'bg-white border-zinc-200 text-zinc-800 hover:border-zinc-300'
  }`;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard settings"
    >
      <div
        onClick={stop}
        className={`w-full max-w-sm my-auto rounded-2xl border shadow-2xl p-6 sm:p-7 ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <h2 className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          Keyboard Settings
        </h2>
        <p className={`mt-1 text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Configure your keyboard preferences here.
        </p>

        <div className="mt-6 flex flex-col gap-5">
          <div>
            <label className={labelClass}>Theme</label>
            <select
              value={themeId}
              onChange={(e) => onSelectTheme(e.target.value as ThemeId)}
              className={selectClass}
              aria-label="Colour theme"
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Keyboard Style</label>
            <select
              value={kbMode}
              onChange={(e) => onSelectKbMode(e.target.value as KeyboardMode)}
              className={selectClass}
              aria-label="Keyboard style"
            >
              <option value="3d">3D</option>
              <option value="2d">2D</option>
            </select>
          </div>

          <div className={soundOn ? '' : 'opacity-40'}>
            <label className={labelClass}>Sound Pack</label>
            <select
              value={switchId}
              onChange={(e) => onSelectSwitch(e.target.value as SwitchId)}
              disabled={!soundOn}
              className={`${selectClass} disabled:cursor-not-allowed`}
              aria-label="Switch type"
            >
              {SWITCHES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-4 pt-1">
            <Toggle
              label="Display Keyboard"
              on={showKeyboard}
              onToggle={onToggleKeyboard}
              isDark={isDark}
              accent={accent}
            />
            <Toggle
              label="Enable Haptics"
              on={haptics}
              onToggle={onToggleHaptics}
              isDark={isDark}
              accent={accent}
            />
            <Toggle
              label="Enable Sound"
              on={soundOn}
              onToggle={onToggleSound}
              isDark={isDark}
              accent={accent}
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-7 w-full rounded-xl py-3 font-bold text-black bg-accent bg-accent-hover transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
