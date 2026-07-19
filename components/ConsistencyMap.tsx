'use client';

import React, { useMemo, useState } from 'react';
import { TestResult } from '@/types';

/**
 * A LeetCode-style activity calendar: each month is its own little block of
 * day-of-week columns, labelled on top, brighter the more tests you ran that
 * day. It's the "consistency" number, but over the calendar — did you show up?
 */

const DAY = 24 * 60 * 60 * 1000;

/**
 * Where the calendar begins — July 2026, when Thockpit started. It grows forward
 * on its own: every new month appears once the clock rolls into it, and the
 * fixed start means early months never fall off when old runs age out of storage.
 */
const LAUNCH_YEAR = 2026;
const LAUNCH_MONTH = 6; // July (months are 0-indexed)
/** A ceiling so a years-old install doesn't render a mile-wide grid. */
const MAX_MONTHS = 24;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 0 (none) … 4 (a lot) — how the square is shaded. */
function level(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

const FILL = [0, 32, 54, 76, 100];

interface DayCell {
  dayMs: number;
  count: number;
  future: boolean;
}

interface MonthBlock {
  key: string;
  label: string;
  /** Columns of 7 (a week each); null is padding before the 1st / after the last. */
  cols: (DayCell | null)[][];
}

interface ConsistencyMapProps {
  history: TestResult[];
  isDark: boolean;
  accent: string;
}

export default function ConsistencyMap({ history, isDark, accent }: ConsistencyMapProps) {
  const base = isDark ? '#26262b' : '#e6e6ea';
  // Captured once, so render stays pure (no Date.now() mid-render).
  const [nowMs] = useState(() => Date.now());

  const { months, activeDays, streak } = useMemo(() => {
    // Tests per calendar day.
    const counts = new Map<number, number>();
    let earliest = nowMs;
    for (const run of history) {
      const day = startOfDay(run.timestamp);
      counts.set(day, (counts.get(day) ?? 0) + 1);
      if (run.timestamp < earliest) earliest = run.timestamp;
    }

    const today = startOfDay(nowMs);
    const now = new Date(nowMs);
    // Start at the launch month — but never hide runs older than it, just in case.
    const launch = new Date(LAUNCH_YEAR, LAUNCH_MONTH, 1);
    const start = startOfDay(earliest) < launch.getTime() ? new Date(earliest) : launch;
    // Every month from the start up to (and including) the current one.
    const span = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const toShow = Math.min(MAX_MONTHS, span + 1);

    const blocks: MonthBlock[] = [];
    for (let m = toShow - 1; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const firstDow = d.getDay(); // 0 = Sunday, the top row
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const numCols = Math.ceil((firstDow + daysInMonth) / 7);

      const cols: (DayCell | null)[][] = [];
      for (let c = 0; c < numCols; c++) {
        const col: (DayCell | null)[] = [];
        for (let r = 0; r < 7; r++) {
          const dayNum = c * 7 + r - firstDow + 1;
          if (dayNum < 1 || dayNum > daysInMonth) {
            col.push(null);
            continue;
          }
          const dayMs = new Date(year, month, dayNum).getTime();
          col.push({ dayMs, count: counts.get(dayMs) ?? 0, future: dayMs > today });
        }
        cols.push(col);
      }

      blocks.push({
        key: `${year}-${month}`,
        label: d.toLocaleDateString(undefined, { month: 'short' }),
        cols,
      });
    }

    // Current streak: consecutive days with a test, ending today — or yesterday,
    // since not having typed *yet* today shouldn't break it.
    let s = 0;
    let day = today;
    if ((counts.get(day) ?? 0) === 0) day -= DAY;
    while ((counts.get(day) ?? 0) > 0) {
      s++;
      day -= DAY;
    }

    return { months: blocks, activeDays: counts.size, streak: s };
  }, [history, nowMs]);

  const shade = (count: number) => {
    const l = level(count);
    return l === 0 ? base : `color-mix(in srgb, ${accent} ${FILL[l]}%, ${base})`;
  };

  const dim = isDark ? 'text-zinc-600' : 'text-zinc-400';

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className={`text-xs uppercase tracking-widest font-bold ${dim}`}>Consistency</h3>
        <span className={`text-xs ${dim}`}>
          {activeDays} {activeDays === 1 ? 'day' : 'days'} active
          {streak > 1 && <span className="text-accent font-bold"> · {streak}-day streak</span>}
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-3 w-max">
          {months.map((mo) => (
            <div key={mo.key} className="flex flex-col gap-1.5">
              <span className={`text-[10px] font-bold ${dim}`}>{mo.label}</span>
              <div className="flex gap-[3px]">
                {mo.cols.map((col, ci) => (
                  <div key={ci} className="flex flex-col gap-[3px]">
                    {col.map((c, ri) =>
                      c === null ? (
                        <div key={ri} className="h-3 w-3" />
                      ) : (
                        <div
                          key={ri}
                          title={
                            c.future
                              ? undefined
                              : `${c.count} ${c.count === 1 ? 'test' : 'tests'} · ${new Date(c.dayMs).toLocaleDateString(
                                  undefined,
                                  { month: 'short', day: 'numeric' }
                                )}`
                          }
                          className="h-3 w-3 rounded-[3px]"
                          style={{ backgroundColor: c.future ? 'transparent' : shade(c.count) }}
                        />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`flex items-center gap-1.5 mt-3 text-xs ${dim}`}>
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span
            key={l}
            className="h-3 w-3 rounded-[3px]"
            style={{ backgroundColor: l === 0 ? base : `color-mix(in srgb, ${accent} ${FILL[l]}%, ${base})` }}
          />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}
