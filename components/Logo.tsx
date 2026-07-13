'use client';

import React from 'react';

interface LogoProps {
  isDark?: boolean;
}

/** A keycap, mid-thock. The same mark is the favicon in app/icon.svg. */
export default function Logo({ isDark = true }: LogoProps) {
  const skirt = isDark ? '#52525b' : '#a1a1aa';

  return (
    <div className="flex items-center gap-2.5 select-none" aria-label="Thockpit">
      <svg
        width="26"
        height="26"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="5" y="10" width="15" height="14" rx="3.5" fill={skirt} />
        <rect x="5" y="6.5" width="15" height="13" rx="3.5" fill="#f59e0b" />
        <path d="M23.5 12.5a5 5 0 0 1 0 7" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
        <path
          d="M26.8 9.5a9.5 9.5 0 0 1 0 13"
          stroke="#f59e0b"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>

      <span className="text-base tracking-tight">
        <span className={`font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>thock</span>
        <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>pit</span>
      </span>
    </div>
  );
}
