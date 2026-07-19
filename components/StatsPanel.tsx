'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { TestResult } from '@/types';
import { formatDuration, MODES, modeLabel, summarise } from '@/utils/stats';
import HistoryChart from './HistoryChart';

interface TileProps {
  label: string;
  value: string;
  isDark: boolean;
  accent?: boolean;
}

function Tile({ label, value, isDark, accent = false }: TileProps) {
  return (
    <div className="text-center">
      <div className={`text-xs uppercase tracking-widest mb-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
        {label}
      </div>
      <div
        className={`text-3xl sm:text-4xl font-bold ${
          accent ? 'text-accent' : isDark ? 'text-zinc-100' : 'text-zinc-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

interface StatsPanelProps {
  history: TestResult[];
  isDark: boolean;
  onClose: () => void;
  onClear: () => void;
  accent?: string;
}

export default function StatsPanel({ history, isDark, onClose, onClear, accent = '#f59e0b' }: StatsPanelProps) {
  const summary = useMemo(() => summarise(history), [history]);
  const recent = useMemo(() => history.slice(0, 10), [history]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Clicks inside must not reach the page, which would refocus the typing input.
  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Your typing stats"
    >
      <div
        onClick={stop}
        className={`w-full max-w-3xl my-auto rounded-2xl border shadow-2xl p-6 sm:p-8 ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <header className="flex items-center justify-between mb-8">
          <h2 className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Stats</h2>
          <button
            onClick={onClose}
            aria-label="Close stats"
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'text-zinc-500 hover:text-zinc-200' : 'text-zinc-400 hover:text-zinc-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {summary.tests === 0 ? (
          <p className={`py-10 text-center text-sm ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            No tests yet — finish one and it&apos;ll show up here.
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
              <Tile label="Tests" value={String(summary.tests)} isDark={isDark} />
              <Tile label="Best" value={`${summary.bestWpm}`} isDark={isDark} accent />
              <Tile label="Avg WPM" value={`${summary.averageWpm}`} isDark={isDark} />
              <Tile label="Avg accuracy" value={`${summary.averageAccuracy}%`} isDark={isDark} />
              <Tile label="Avg consistency" value={`${summary.averageConsistency}%`} isDark={isDark} />
              <Tile label="Time typed" value={formatDuration(summary.timeTyped)} isDark={isDark} />
            </div>

            <section>
              <h3 className={`text-xs uppercase tracking-widest font-bold mb-3 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Best per mode
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {MODES.map((mode) => (
                  <Tile
                    key={mode}
                    label={modeLabel(mode)}
                    value={summary.bestByMode[mode] === null ? '—' : `${summary.bestByMode[mode]}`}
                    isDark={isDark}
                  />
                ))}
              </div>
            </section>

            <HistoryChart history={history} isDark={isDark} onClear={onClear} accent={accent} />

            <section>
              <h3 className={`text-xs uppercase tracking-widest font-bold mb-3 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Recent tests
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className={isDark ? 'text-zinc-600' : 'text-zinc-400'}>
                      <th className="text-left font-normal py-2">When</th>
                      <th className="text-right font-normal py-2">Length</th>
                      <th className="text-right font-normal py-2">WPM</th>
                      <th className="text-right font-normal py-2">Acc</th>
                      <th className="text-right font-normal py-2">Cons</th>
                    </tr>
                  </thead>
                  <tbody className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                    {recent.map((run) => (
                      <tr key={run.id} className={`border-t ${isDark ? 'border-zinc-900' : 'border-zinc-100'}`}>
                        <td className="py-2">
                          {new Date(run.timestamp).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="text-right py-2">{modeLabel(run.mode)}</td>
                        <td className="text-right py-2 font-bold text-accent">{run.wpm}</td>
                        <td className="text-right py-2">{run.accuracy}%</td>
                        <td className="text-right py-2">{run.consistency}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
