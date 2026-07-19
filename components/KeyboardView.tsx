'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { KeyTallies } from '@/types';
import { KeyColors } from '@/utils/themes';
import Keyboard2D from './Keyboard2D';

// WebGL only runs in the browser; the flat board is plain DOM.
const Keyboard3D = dynamic(() => import('./Keyboard3D'), { ssr: false });

export type KeyboardMode = '2d' | '3d';

interface KeyboardViewProps {
  mode: KeyboardMode;
  pressed: ReadonlySet<string>;
  hints: ReadonlySet<string>;
  keys?: KeyTallies;
  /** Only the 3D board rides the personal-best wave. */
  rippleToken?: string | null;
  isDark?: boolean;
  keyColors?: KeyColors;
  accent?: string;
}

/** One switch, so every caller renders whichever board the user picked. */
export default function KeyboardView({ mode, rippleToken = null, ...rest }: KeyboardViewProps) {
  if (mode === '2d') {
    return <Keyboard2D {...rest} />;
  }
  return <Keyboard3D rippleToken={rippleToken} {...rest} />;
}
