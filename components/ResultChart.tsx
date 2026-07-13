'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { TestResult } from '@/types';

const WIDTH = 760;
const HEIGHT = 300;
const MARGIN = { top: 18, right: 62, bottom: 36, left: 48 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

/**
 * Emphasis palette: speed is the point (accent), raw is context (gray), errors
 * are a status mark. Accent steps are the ones that clear the lightness band and
 * 3:1 contrast on each surface — amber-500 does not, on either.
 */
const PALETTES = {
  dark: { wpm: '#d97706', raw: '#a1a1aa', error: '#d03b3b', grid: '#27272a', ink: '#71717a' },
  light: { wpm: '#b45309', raw: '#52525b', error: '#d03b3b', grid: '#e4e4e7', ink: '#71717a' },
} as const;

/** A round tick step that covers the peak in at most five gridlines. */
function niceScale(peak: number): { yMax: number; step: number } {
  const target = Math.max(20, peak * 1.1);
  const step = [10, 20, 25, 50, 100, 200].find((s) => target / s <= 5) ?? 500;
  return { yMax: Math.ceil(target / step) * step, step };
}

interface ResultChartProps {
  result: TestResult;
  isDark: boolean;
}

export default function ResultChart({ result, isDark }: ResultChartProps) {
  const palette = PALETTES[isDark ? 'dark' : 'light'];
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const { timeline } = result;

  const scale = useMemo(() => {
    const lastSecond = Math.max(1, timeline.at(-1)?.second ?? 1);
    const peak = timeline.reduce((max, point) => Math.max(max, point.raw, point.wpm), 0);
    const { yMax, step } = niceScale(peak);

    const x = (second: number) => MARGIN.left + (second / lastSecond) * PLOT_W;
    const y = (value: number) => MARGIN.top + PLOT_H - (value / yMax) * PLOT_H;

    const xStep = lastSecond <= 20 ? 5 : 10;
    const xTicks: number[] = [];
    for (let s = xStep; s <= lastSecond; s += xStep) xTicks.push(s);

    const yTicks: number[] = [];
    for (let value = 0; value <= yMax; value += step) yTicks.push(value);

    return { x, y, xTicks, yTicks, lastSecond, yMax };
  }, [timeline]);

  const paths = useMemo(() => {
    const line = (pick: (point: (typeof timeline)[number]) => number) =>
      timeline
        .map((point, i) => `${i === 0 ? 'M' : 'L'} ${scale.x(point.second)} ${scale.y(pick(point))}`)
        .join(' ');

    return { wpm: line((p) => p.wpm), raw: line((p) => p.raw) };
  }, [timeline, scale]);

  const errorPoints = useMemo(() => timeline.filter((point) => point.errors > 0), [timeline]);

  /**
   * The two lines usually finish within a few wpm of each other, which would
   * stack the end labels on top of one another. Nudge them apart when they're
   * closer than a line-height.
   */
  const endLabels = useMemo(() => {
    const last = timeline.at(-1);
    if (!last) return null;

    let wpmY = scale.y(last.wpm);
    let rawY = scale.y(last.raw);
    const gap = 15;

    if (Math.abs(wpmY - rawY) < gap) {
      const middle = (wpmY + rawY) / 2;
      // Whichever series is actually higher stays on top.
      const wpmOnTop = last.wpm >= last.raw;
      wpmY = middle + (wpmOnTop ? -gap / 2 : gap / 2);
      rawY = middle + (wpmOnTop ? gap / 2 : -gap / 2);
    }

    return { wpmY, rawY };
  }, [timeline, scale]);

  const handleMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || timeline.length === 0) return;

      const rect = svg.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * WIDTH;

      let nearest = 0;
      let best = Infinity;
      timeline.forEach((point, i) => {
        const distance = Math.abs(scale.x(point.second) - svgX);
        if (distance < best) {
          best = distance;
          nearest = i;
        }
      });
      setHovered(nearest);
    },
    [timeline, scale]
  );

  const active = hovered === null ? null : timeline[hovered];

  if (timeline.length < 2) {
    return (
      <p className={`text-sm ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
        Too short to graph.
      </p>
    );
  }

  return (
    <figure className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto touch-none"
        role="img"
        aria-label={`Speed over time: ${result.wpm} words per minute, ${result.accuracy}% accuracy`}
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
              fontSize={13}
            >
              {value}
            </text>
          </g>
        ))}

        {scale.xTicks.map((second) => (
          <text
            key={second}
            x={scale.x(second)}
            y={HEIGHT - MARGIN.bottom + 22}
            textAnchor="middle"
            fill={palette.ink}
            fontSize={13}
          >
            {second}s
          </text>
        ))}

        <text
          x={MARGIN.left}
          y={HEIGHT - 6}
          fill={palette.ink}
          fontSize={12}
          letterSpacing={1}
        >
          SECONDS
        </text>

        <path
          d={paths.raw}
          fill="none"
          stroke={palette.raw}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={paths.wpm}
          fill="none"
          stroke={palette.wpm}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Errors ride on the raw line, so they need no second scale. */}
        {errorPoints.map((point) => {
          const cx = scale.x(point.second);
          const cy = scale.y(point.raw);
          return (
            <g key={point.second} stroke={palette.error} strokeWidth={2} strokeLinecap="round">
              <line x1={cx - 4.5} y1={cy - 4.5} x2={cx + 4.5} y2={cy + 4.5} />
              <line x1={cx - 4.5} y1={cy + 4.5} x2={cx + 4.5} y2={cy - 4.5} />
            </g>
          );
        })}

        {/* Direct labels: identity never rests on colour alone. */}
        {endLabels && (
          <>
            <text
              x={WIDTH - MARGIN.right + 8}
              y={endLabels.wpmY}
              dominantBaseline="middle"
              fill={palette.wpm}
              fontSize={13}
              fontWeight={700}
            >
              wpm
            </text>
            <text
              x={WIDTH - MARGIN.right + 8}
              y={endLabels.rawY}
              dominantBaseline="middle"
              fill={palette.raw}
              fontSize={13}
            >
              raw
            </text>
          </>
        )}

        {active && (
          <g pointerEvents="none">
            <line
              x1={scale.x(active.second)}
              x2={scale.x(active.second)}
              y1={MARGIN.top}
              y2={MARGIN.top + PLOT_H}
              stroke={palette.ink}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={scale.x(active.second)}
              cy={scale.y(active.raw)}
              r={4}
              fill={palette.raw}
              stroke={isDark ? '#0f0f0f' : '#fafafa'}
              strokeWidth={2}
            />
            <circle
              cx={scale.x(active.second)}
              cy={scale.y(active.wpm)}
              r={4}
              fill={palette.wpm}
              stroke={isDark ? '#0f0f0f' : '#fafafa'}
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      {active && (
        <div
          className={`pointer-events-none absolute top-0 px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg ${
            isDark
              ? 'bg-zinc-900 border border-zinc-800 text-zinc-300'
              : 'bg-white border border-zinc-200 text-zinc-700'
          }`}
          style={{
            left: `${(scale.x(active.second) / WIDTH) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="font-bold">{active.second}s</span>
          {' · '}
          <span style={{ color: palette.wpm }}>{active.wpm} wpm</span>
          {' · '}
          <span style={{ color: palette.raw }}>{active.raw} raw</span>
          {active.errors > 0 && (
            <>
              {' · '}
              <span style={{ color: palette.error }}>
                {active.errors} error{active.errors > 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
      )}

      <figcaption className="flex items-center justify-center gap-5 mt-3 text-xs">
        <span className="flex items-center gap-1.5" style={{ color: palette.ink }}>
          <svg width="16" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="16" y2="4" stroke={palette.wpm} strokeWidth={2} />
          </svg>
          words per minute
        </span>
        <span className="flex items-center gap-1.5" style={{ color: palette.ink }}>
          <svg width="16" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="16" y2="4" stroke={palette.raw} strokeWidth={2} />
          </svg>
          raw
        </span>
        <span className="flex items-center gap-1.5" style={{ color: palette.ink }}>
          <svg width="12" height="12" aria-hidden="true">
            <line x1="2" y1="2" x2="10" y2="10" stroke={palette.error} strokeWidth={2} />
            <line x1="2" y1="10" x2="10" y2="2" stroke={palette.error} strokeWidth={2} />
          </svg>
          errors
        </span>
      </figcaption>

      {/* The same numbers, for screen readers and anyone who wants the values. */}
      <table className="sr-only">
        <caption>Speed per second</caption>
        <thead>
          <tr>
            <th>Second</th>
            <th>Words per minute</th>
            <th>Raw</th>
            <th>Errors</th>
          </tr>
        </thead>
        <tbody>
          {timeline.map((point) => (
            <tr key={point.second}>
              <td>{point.second}</td>
              <td>{point.wpm}</td>
              <td>{point.raw}</td>
              <td>{point.errors}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
