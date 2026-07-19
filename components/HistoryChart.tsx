'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { TestResult } from '@/types';
import { modeLabel } from '@/utils/stats';

const WIDTH = 760;
const HEIGHT = 150;
const MARGIN = { top: 14, right: 16, bottom: 26, left: 48 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

const MAX_POINTS = 20;

const PALETTES = {
  dark: { grid: '#27272a', ink: '#71717a', surface: '#0f0f0f' },
  light: { grid: '#e4e4e7', ink: '#71717a', surface: '#fafafa' },
} as const;

/** Pull a hex toward black — keeps a light theme accent legible on a white plot. */
function darken(hex: string, factor: number): string {
  const n = hex.replace('#', '');
  const to = (i: number) =>
    Math.round(parseInt(n.slice(i, i + 2), 16) * factor)
      .toString(16)
      .padStart(2, '0');
  return `#${to(0)}${to(2)}${to(4)}`;
}

interface HistoryChartProps {
  /** Newest first, as stored. */
  history: TestResult[];
  isDark: boolean;
  onClear: () => void;
  /** The trend line follows the theme accent (defaults to Classic amber). */
  accent?: string;
}

export default function HistoryChart({ history, isDark, onClear, accent = '#f59e0b' }: HistoryChartProps) {
  const palette = useMemo(
    () => ({
      ...PALETTES[isDark ? 'dark' : 'light'],
      wpm: isDark ? accent : darken(accent, 0.72),
    }),
    [isDark, accent]
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  // Oldest on the left, so the line reads left-to-right like time does.
  const runs = useMemo(() => history.slice(0, MAX_POINTS).reverse(), [history]);

  const scale = useMemo(() => {
    const peak = runs.reduce((max, run) => Math.max(max, run.wpm), 0);
    const yMax = Math.max(20, Math.ceil((peak * 1.15) / 10) * 10);
    const step = runs.length > 1 ? PLOT_W / (runs.length - 1) : 0;

    return {
      x: (index: number) => MARGIN.left + index * step,
      y: (value: number) => MARGIN.top + PLOT_H - (value / yMax) * PLOT_H,
      yTicks: [0, Math.round(yMax / 2), yMax],
    };
  }, [runs]);

  const path = useMemo(
    () =>
      runs
        .map((run, i) => `${i === 0 ? 'M' : 'L'} ${scale.x(i)} ${scale.y(run.wpm)}`)
        .join(' '),
    [runs, scale]
  );

  const handleMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || runs.length === 0) return;

      const rect = svg.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * WIDTH;

      let nearest = 0;
      let best = Infinity;
      runs.forEach((_, i) => {
        const distance = Math.abs(scale.x(i) - svgX);
        if (distance < best) {
          best = distance;
          nearest = i;
        }
      });
      setHovered(nearest);
    },
    [runs, scale]
  );

  const active = hovered === null ? null : runs[hovered];
  const best = runs.reduce((max, run) => Math.max(max, run.wpm), 0);

  return (
    <section className="w-full">
      <header className="flex items-baseline justify-between mb-1">
        <h2 className={`text-xs uppercase tracking-widest font-bold ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          Last {runs.length} test{runs.length > 1 ? 's' : ''} · best {best} wpm
        </h2>
        <button
          onClick={onClear}
          className={`text-xs transition-colors ${
            isDark ? 'text-zinc-700 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          clear history
        </button>
      </header>

      {runs.length < 2 ? (
        <p className={`text-sm py-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          Finish another test to see your progress here.
        </p>
      ) : (
        <figure className="relative w-full">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto touch-none"
            role="img"
            aria-label={`Words per minute across your last ${runs.length} tests`}
            onPointerMove={handleMove}
            onPointerLeave={() => setHovered(null)}
          >
            {scale.yTicks.map((value) => (
              <g key={value}>
                <line
                  x1={MARGIN.left}
                  x2={WIDTH - MARGIN.right}
                  y1={scale.y(value)}
                  y2={scale.y(value)}
                  stroke={palette.grid}
                  strokeWidth={1}
                />
                <text
                  x={MARGIN.left - 10}
                  y={scale.y(value)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill={palette.ink}
                  fontSize={12}
                >
                  {value}
                </text>
              </g>
            ))}

            <path
              d={path}
              fill="none"
              stroke={palette.wpm}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {runs.map((run, i) => (
              <circle
                key={run.id}
                cx={scale.x(i)}
                cy={scale.y(run.wpm)}
                r={hovered === i ? 5 : 3}
                fill={palette.wpm}
                stroke={palette.surface}
                strokeWidth={2}
              />
            ))}

            <text x={MARGIN.left} y={HEIGHT - 4} fill={palette.ink} fontSize={11}>
              oldest
            </text>
            <text
              x={WIDTH - MARGIN.right}
              y={HEIGHT - 4}
              textAnchor="end"
              fill={palette.ink}
              fontSize={11}
            >
              newest
            </text>
          </svg>

          {active && (
            <div
              className={`pointer-events-none absolute top-0 px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg ${
                isDark
                  ? 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                  : 'bg-white border border-zinc-200 text-zinc-700'
              }`}
              style={{
                left: `${(scale.x(hovered!) / WIDTH) * 100}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <span className="font-bold" style={{ color: palette.wpm }}>
                {active.wpm} wpm
              </span>
              {` · ${active.accuracy}% · ${modeLabel(active.mode)} · `}
              {new Date(active.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </div>
          )}

          <table className="sr-only">
            <caption>Recent tests</caption>
            <thead>
              <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Words per minute</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>{new Date(run.timestamp).toLocaleString()}</td>
                  <td>{modeLabel(run.mode)}</td>
                  <td>{run.wpm}</td>
                  <td>{run.accuracy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      )}
    </section>
  );
}
