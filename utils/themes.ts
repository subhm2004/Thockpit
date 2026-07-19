export type ThemeId = 'classic' | 'mint' | 'royal' | 'dolch' | 'sand' | 'scarlet';

export interface KeyColors {
  /** The tray the caps sit in. */
  deck: string;
  /** Resting keycap colour. */
  cap: string;
  /** Emissive tint for the "type this next" hint — has to read on the cap. */
  hint: string;
  /** Legend colour drawn onto each cap. */
  label: string;
}

export interface AppTheme {
  id: ThemeId;
  name: string;
  /** Buttons, the WPM number, the pressed-key glow and the personal-best wave. */
  accent: string;
  accentHover: string;
  /** One keycap palette per light/dark, so a colour reads in both. */
  keyboard: { dark: KeyColors; light: KeyColors };
}

/**
 * Named after keycap sets, the way the switches are. Classic is the original
 * amber; the rest tint the whole board — and, through --accent, the UI with it.
 */
export const THEMES: AppTheme[] = [
  {
    id: 'classic',
    name: 'Classic',
    accent: '#f59e0b',
    accentHover: '#fbbf24',
    keyboard: {
      dark: { deck: '#1f1f24', cap: '#33333b', hint: '#5a4622', label: '#d4d4d8' },
      light: { deck: '#c8c8cf', cap: '#f6f6f8', hint: '#fcd34d', label: '#3f3f46' },
    },
  },
  {
    id: 'mint',
    name: 'Mint',
    accent: '#10b981',
    accentHover: '#34d399',
    keyboard: {
      dark: { deck: '#14231d', cap: '#2a5344', hint: '#1f9e73', label: '#dcefe6' },
      light: { deck: '#bfe0d2', cap: '#e9f7f0', hint: '#34d399', label: '#2f4a40' },
    },
  },
  {
    id: 'royal',
    name: 'Royal',
    accent: '#6366f1',
    accentHover: '#818cf8',
    keyboard: {
      dark: { deck: '#1a1b2e', cap: '#33355c', hint: '#4a4fb0', label: '#dcdcf5' },
      light: { deck: '#c9caea', cap: '#eef0fb', hint: '#818cf8', label: '#3b3d66' },
    },
  },
  {
    id: 'dolch',
    name: 'Dolch',
    accent: '#2dd4bf',
    accentHover: '#5eead4',
    keyboard: {
      dark: { deck: '#17201f', cap: '#2e3d3b', hint: '#1f9e8e', label: '#d6ece9' },
      light: { deck: '#c2d4d1', cap: '#e8f2f0', hint: '#5eead4', label: '#324340' },
    },
  },
  {
    id: 'sand',
    name: 'Sand',
    accent: '#d9853b',
    accentHover: '#e8a563',
    keyboard: {
      dark: { deck: '#241f18', cap: '#4a4030', hint: '#9c6a34', label: '#f0e6d6' },
      light: { deck: '#e0d3bf', cap: '#f5ede0', hint: '#e0b483', label: '#4a4030' },
    },
  },
  {
    id: 'scarlet',
    name: 'Scarlet',
    accent: '#ef4444',
    accentHover: '#f87171',
    keyboard: {
      dark: { deck: '#241717', cap: '#4a2e2e', hint: '#a83232', label: '#f5dede' },
      light: { deck: '#e6c9c9', cap: '#f8ecec', hint: '#fca5a5', label: '#4a2e2e' },
    },
  },
];

export const DEFAULT_THEME: ThemeId = 'classic';

const BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

export function isThemeId(value: string): value is ThemeId {
  return BY_ID.has(value as ThemeId);
}

/** Always returns a theme — falls back to Classic for an unknown id. */
export function getTheme(id: string): AppTheme {
  return BY_ID.get(id as ThemeId) ?? BY_ID.get(DEFAULT_THEME)!;
}
