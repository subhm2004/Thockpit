'use client';

import React from 'react';
import { KeyTallies } from '@/types';
import { KeyDef, MAC_ROWS } from '@/utils/keyboard';
import { KeyColors } from '@/utils/themes';

/**
 * The flat board. Same keys and props as the 3D one — pressed lights up, the
 * next key glows, and on the results screen each cap wears its accuracy — only
 * drawn as coloured DOM tiles instead of WebGL.
 */

/** The three caps OwnType tints with the accent, so the board reads as themed. */
const ACCENT_KEYS = new Set(['Escape', 'ShiftLeft', 'MetaLeft']);

const ARROWS: Record<'left' | 'up' | 'down' | 'right', KeyDef> = {
  left: { code: 'ArrowLeft', label: '◀' },
  up: { code: 'ArrowUp', label: '▲' },
  down: { code: 'ArrowDown', label: '▼' },
  right: { code: 'ArrowRight', label: '▶' },
};

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

interface CapProps {
  def: KeyDef;
  colors: KeyColors;
  accent: string;
  isPressed: boolean;
  isHint: boolean;
  score: number | null;
  /** Flex weight (key units) and whether this cap is a short function-row key. */
  units: number;
  small?: boolean;
  /** Half-height, for the stacked up/down arrows. */
  half?: boolean;
  /** On the results board, untouched keys stay grey — the signature accent keys
   *  step aside so the heatmap legend stays honest. */
  heatmap?: boolean;
}

const Cap = React.memo(function Cap({
  def,
  colors,
  accent,
  isPressed,
  isHint,
  score,
  units,
  small,
  half,
  heatmap,
}: CapProps) {
  let background = colors.cap;
  let color = colors.label;
  let boxShadow: string | undefined;

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

  if (isHint && !isPressed) {
    boxShadow = `0 0 0 2px ${accent}, 0 0 12px ${accent}`;
  }

  // Numbers/symbols show their shifted legend above; modifiers show their glyph;
  // the space bar shows nothing.
  let legend: React.ReactNode = def.label;
  if (def.shifted) {
    legend = (
      <span className="flex flex-col items-center leading-none">
        <span className="opacity-55 text-[0.85em]">{def.shifted}</span>
        <span>{def.label}</span>
      </span>
    );
  } else if (def.glyph && def.code !== 'Fn') {
    legend = def.glyph;
  }

  return (
    <div
      style={{
        flexGrow: units,
        flexBasis: 0,
        minWidth: 0,
        background,
        color,
        boxShadow,
        transform: isPressed ? 'translateY(2px)' : undefined,
      }}
      className={`
        flex items-center justify-center rounded-md select-none
        ${half ? 'flex-1' : 'h-full'}
        ${small ? 'text-[7px] sm:text-[9px]' : 'text-[9px] sm:text-[11px] md:text-xs'}
        transition-[background-color,box-shadow,transform] duration-150
      `}
    >
      {legend}
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

  const capFor = (def: KeyDef, units: number, small: boolean, half = false) => (
    <Cap
      key={def.code}
      def={def}
      colors={colors}
      accent={accent}
      isPressed={pressed.has(def.code)}
      isHint={hints.has(def.code)}
      score={scores?.get(def.code) ?? null}
      units={units}
      small={small}
      half={half}
      heatmap={heatmap}
    />
  );

  return (
    <div className="w-full max-w-3xl mx-auto select-none">
      <div
        className="flex flex-col gap-[3px] sm:gap-1 rounded-2xl p-2 sm:p-3 shadow-xl"
        style={{ background: colors.deck }}
      >
        {MAC_ROWS.map((row, rowIndex) => {
          const small = rowIndex === 0;
          return (
            <div
              key={rowIndex}
              className={`flex gap-[3px] sm:gap-1 ${small ? 'h-4 sm:h-6' : 'h-7 sm:h-9 md:h-10'}`}
            >
              {row.map((def) => {
                if (def.shape === 'arrows') {
                  // One 3u slot: ◀ | (▲ over ▼) | ▶
                  return (
                    <div
                      key={def.code}
                      style={{ flexGrow: 3, flexBasis: 0, minWidth: 0 }}
                      className="flex gap-[3px] sm:gap-1"
                    >
                      {capFor(ARROWS.left, 1, small)}
                      <div
                        style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
                        className="flex flex-col gap-[3px] sm:gap-1"
                      >
                        {capFor(ARROWS.up, 1, small, true)}
                        {capFor(ARROWS.down, 1, small, true)}
                      </div>
                      {capFor(ARROWS.right, 1, small)}
                    </div>
                  );
                }
                return capFor(def, def.w ?? 1, small);
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
