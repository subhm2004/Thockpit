'use client';

import React from 'react';
import { KeyTallies } from '@/types';
import { KeyDef } from '@/utils/keyboard';
import { KeyColors } from '@/utils/themes';

/**
 * The flat board — a 65% layout with the nav column and arrows, drawn as
 * coloured keycaps. Same props and behaviour as the 3D one: pressed lights up,
 * the next key glows, and on the results screen each cap wears its accuracy.
 *
 * Its own layout (not the MacBook one the 3D board uses): the extra keys —
 * media glyphs, del/pgup/pgdn/home/end, the arrow cluster — are decorative, so
 * their codes never appear in `pressed`, `hints` or the heatmap. Every row adds
 * up to 16 units, which is what keeps the deck rectangular.
 */

const UNITS = 16;

/** The three caps tinted with the accent, so the board reads as themed. */
const ACCENT_KEYS = new Set(['Escape', 'ShiftLeft', 'MetaLeft']);

// U+FE0E asks for the flat, monochrome glyph rather than a colour emoji.
const TEXT = '︎';
const fn = (label: string, glyph: string): KeyDef => ({ code: label, label, shifted: glyph + TEXT });

const ROWS: KeyDef[][] = [
  [
    { code: 'Escape', label: 'esc' },
    fn('F1', '☼'), fn('F2', '☀'), fn('F3', '▦'), fn('F4', '⌕'),
    fn('F5', '●'), fn('F6', '☾'), fn('F7', '≪'), fn('F8', '▷'),
    fn('F9', '≫'), fn('F10', '⊘'), fn('F11', '◁'), fn('F12', '◀'),
    { code: 'MissionControl', label: '⊞' + TEXT },
    { code: 'Delete', label: 'del' },
    { code: 'Power', label: '⏻' + TEXT },
  ],
  [
    { code: 'Backquote', label: '`', shifted: '~' },
    { code: 'Digit1', label: '1', shifted: '!' },
    { code: 'Digit2', label: '2', shifted: '@' },
    { code: 'Digit3', label: '3', shifted: '#' },
    { code: 'Digit4', label: '4', shifted: '$' },
    { code: 'Digit5', label: '5', shifted: '%' },
    { code: 'Digit6', label: '6', shifted: '^' },
    { code: 'Digit7', label: '7', shifted: '&' },
    { code: 'Digit8', label: '8', shifted: '*' },
    { code: 'Digit9', label: '9', shifted: '(' },
    { code: 'Digit0', label: '0', shifted: ')' },
    { code: 'Minus', label: '-', shifted: '_' },
    { code: 'Equal', label: '=', shifted: '+' },
    { code: 'Backspace', label: '←', w: 2 },
    { code: 'PageUp', label: 'pgup' },
  ],
  [
    { code: 'Tab', label: 'tab', w: 1.5 },
    { code: 'KeyQ', label: 'Q' }, { code: 'KeyW', label: 'W' }, { code: 'KeyE', label: 'E' },
    { code: 'KeyR', label: 'R' }, { code: 'KeyT', label: 'T' }, { code: 'KeyY', label: 'Y' },
    { code: 'KeyU', label: 'U' }, { code: 'KeyI', label: 'I' }, { code: 'KeyO', label: 'O' },
    { code: 'KeyP', label: 'P' },
    { code: 'BracketLeft', label: '[', shifted: '{' },
    { code: 'BracketRight', label: ']', shifted: '}' },
    { code: 'Backslash', label: '\\', shifted: '|', w: 1.5 },
    { code: 'PageDown', label: 'pgdn' },
  ],
  [
    { code: 'CapsLock', label: 'caps', w: 1.75 },
    { code: 'KeyA', label: 'A' }, { code: 'KeyS', label: 'S' }, { code: 'KeyD', label: 'D' },
    { code: 'KeyF', label: 'F', bump: true }, { code: 'KeyG', label: 'G' }, { code: 'KeyH', label: 'H' },
    { code: 'KeyJ', label: 'J', bump: true }, { code: 'KeyK', label: 'K' }, { code: 'KeyL', label: 'L' },
    { code: 'Semicolon', label: ';', shifted: ':' },
    { code: 'Quote', label: "'", shifted: '"' },
    { code: 'Enter', label: 'return', w: 2.25 },
    { code: 'Home', label: 'home' },
  ],
  [
    { code: 'ShiftLeft', label: 'shift', w: 2.25 },
    { code: 'KeyZ', label: 'Z' }, { code: 'KeyX', label: 'X' }, { code: 'KeyC', label: 'C' },
    { code: 'KeyV', label: 'V' }, { code: 'KeyB', label: 'B' }, { code: 'KeyN', label: 'N' },
    { code: 'KeyM', label: 'M' },
    { code: 'Comma', label: ',', shifted: '<' },
    { code: 'Period', label: '.', shifted: '>' },
    { code: 'Slash', label: '/', shifted: '?' },
    { code: 'ShiftRight', label: 'shift', w: 1.75 },
    { code: 'ArrowUp', label: '▲' },
    { code: 'End', label: 'end' },
  ],
  [
    { code: 'ControlLeft', label: 'ctrl', w: 1.25 },
    { code: 'AltLeft', label: 'option', w: 1.25 },
    { code: 'MetaLeft', label: '', glyph: '⌘', w: 1.25 },
    { code: 'Space', label: '', w: 6.25 },
    { code: 'MetaRight', label: '', glyph: '⌘' },
    { code: 'Fn', label: 'fn' },
    { code: 'ControlRight', label: 'ctrl' },
    { code: 'ArrowLeft', label: '◀' },
    { code: 'ArrowDown', label: '▼' },
    { code: 'ArrowRight', label: '▶' },
  ],
];

/** Same three buckets the legend names: clean / slipping / trouble. */
function heatColor(score: number): string {
  if (score >= 0.9) return '#0ca30c';
  if (score >= 0.7) return '#fab219';
  return '#d03b3b';
}

/** Black or white text, whichever reads on the given fill. */
function readableOn(hex: string): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0a0a0a' : '#f8f8f8';
}

const LIP = 'inset 0 -3px 0 rgba(0,0,0,0.14)';
const DROP = '0 1px 1px rgba(0,0,0,0.2)';

interface CapProps {
  def: KeyDef;
  colors: KeyColors;
  accent: string;
  isPressed: boolean;
  isHint: boolean;
  score: number | null;
  fnRow: boolean;
  /** On the results board, untouched keys stay grey — the signature accent keys
   *  step aside so the heatmap legend stays honest. */
  heatmap: boolean;
}

const Cap = React.memo(function Cap({
  def,
  colors,
  accent,
  isPressed,
  isHint,
  score,
  fnRow,
  heatmap,
}: CapProps) {
  let background = colors.cap;
  let color = colors.label;

  if (isPressed) {
    background = accent;
    color = readableOn(accent);
  } else if (score !== null) {
    background = heatColor(score);
    color = readableOn(background);
  } else if (ACCENT_KEYS.has(def.code) && !heatmap) {
    background = accent;
    color = readableOn(accent);
  }

  let boxShadow = `${LIP}, ${DROP}`;
  if (isPressed) {
    boxShadow = 'inset 0 -1px 0 rgba(0,0,0,0.12)';
  } else if (isHint) {
    boxShadow = `0 0 0 2px ${accent}, 0 0 11px ${accent}, ${LIP}`;
  }

  // Numbers/symbols/F-keys stack a small legend above the main one; ⌘ shows its
  // glyph; the space bar shows nothing.
  let legend: React.ReactNode = def.label;
  if (def.shifted) {
    legend = (
      <span className="flex flex-col items-center leading-none gap-px">
        <span className="opacity-60 text-[0.82em]">{def.shifted}</span>
        <span>{def.label}</span>
      </span>
    );
  } else if (def.glyph && def.code !== 'Fn') {
    legend = def.glyph;
  }

  return (
    <div style={{ flex: `0 0 ${(def.w ?? 1) * (100 / UNITS)}%` }} className="min-w-0 p-[2px]">
      <div
        style={{ background, color, boxShadow, transform: isPressed ? 'translateY(2px)' : undefined }}
        className={`
          relative flex h-full w-full items-center justify-center rounded-md text-center leading-none
          ${fnRow ? 'text-[6px] sm:text-[8px]' : 'text-[8px] sm:text-[10px] md:text-[11px]'}
          transition-[background-color,box-shadow,transform] duration-100
        `}
      >
        {legend}
        {def.bump && (
          <span className="absolute bottom-[3px] left-1/2 h-px w-2 -translate-x-1/2 rounded bg-current opacity-40" />
        )}
      </div>
    </div>
  );
});

interface Keyboard2DProps {
  pressed: ReadonlySet<string>;
  hints: ReadonlySet<string>;
  keys?: KeyTallies;
  isDark?: boolean;
  keyColors?: KeyColors;
  accent?: string;
}

const FALLBACK: Record<'dark' | 'light', KeyColors> = {
  dark: { deck: '#1f1f24', cap: '#33333b', hint: '#5a4622', label: '#d4d4d8' },
  light: { deck: '#c8c8cf', cap: '#f6f6f8', hint: '#fcd34d', label: '#3f3f46' },
};

export default function Keyboard2D({
  pressed,
  hints,
  keys,
  isDark = true,
  keyColors,
  accent = '#f59e0b',
}: Keyboard2DProps) {
  const colors = keyColors ?? FALLBACK[isDark ? 'dark' : 'light'];

  const scores = React.useMemo(() => {
    if (!keys) return null;
    const map = new Map<string, number>();
    for (const [code, tally] of Object.entries(keys)) {
      if (tally.presses >= 2) {
        map.set(code, (tally.presses - tally.errors) / tally.presses);
      }
    }
    return map;
  }, [keys]);

  const heatmap = scores !== null;

  return (
    <div className="w-full max-w-3xl mx-auto select-none px-2">
      <div
        className="flex flex-col gap-[3px] sm:gap-1 rounded-2xl p-2.5 sm:p-3.5"
        style={{
          background: colors.deck,
          boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.06), 0 14px 34px rgba(0,0,0,0.35)`,
        }}
      >
        {ROWS.map((row, rowIndex) => {
          const fnRow = rowIndex === 0;
          return (
            <div key={rowIndex} className={`flex w-full ${fnRow ? 'h-6 sm:h-8' : 'h-9 sm:h-11 md:h-12'}`}>
              {row.map((def) => (
                <Cap
                  key={def.code}
                  def={def}
                  colors={colors}
                  accent={accent}
                  isPressed={pressed.has(def.code)}
                  isHint={hints.has(def.code)}
                  score={scores?.get(def.code) ?? null}
                  fnRow={fnRow}
                  heatmap={heatmap}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
