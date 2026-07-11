export type KeyShape = 'normal' | 'fn' | 'arrows';

export interface KeyDef {
  /** KeyboardEvent.code, or a synthetic id for keys the browser never reports */
  code: string;
  label: string;
  /** Shifted legend, drawn above the main label (number row, symbols) */
  shifted?: string;
  /** Small glyph drawn next to the label (⌘, ⌥, ⇧ ...) */
  glyph?: string;
  /** Width in key units (1u = one letter key) */
  w?: number;
  shape?: KeyShape;
  /** Home row bumps on F and J, like a real MacBook */
  bump?: boolean;
}

/**
 * Apple US ANSI (MacBook Air / Magic Keyboard) layout.
 * Every row adds up to 14.5u, which is what keeps the deck rectangular.
 */
export const MAC_ROWS: KeyDef[][] = [
  [
    { code: 'Escape', label: 'esc', w: 1.5, shape: 'fn' },
    { code: 'F1', label: 'F1', shape: 'fn' },
    { code: 'F2', label: 'F2', shape: 'fn' },
    { code: 'F3', label: 'F3', shape: 'fn' },
    { code: 'F4', label: 'F4', shape: 'fn' },
    { code: 'F5', label: 'F5', shape: 'fn' },
    { code: 'F6', label: 'F6', shape: 'fn' },
    { code: 'F7', label: 'F7', shape: 'fn' },
    { code: 'F8', label: 'F8', shape: 'fn' },
    { code: 'F9', label: 'F9', shape: 'fn' },
    { code: 'F10', label: 'F10', shape: 'fn' },
    { code: 'F11', label: 'F11', shape: 'fn' },
    { code: 'F12', label: 'F12', shape: 'fn' },
    { code: 'TouchID', label: '◉', shape: 'fn' },
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
    { code: 'Backspace', label: 'delete', glyph: '⌫', w: 1.5 },
  ],
  [
    { code: 'Tab', label: 'tab', glyph: '⇥', w: 1.5 },
    { code: 'KeyQ', label: 'Q' },
    { code: 'KeyW', label: 'W' },
    { code: 'KeyE', label: 'E' },
    { code: 'KeyR', label: 'R' },
    { code: 'KeyT', label: 'T' },
    { code: 'KeyY', label: 'Y' },
    { code: 'KeyU', label: 'U' },
    { code: 'KeyI', label: 'I' },
    { code: 'KeyO', label: 'O' },
    { code: 'KeyP', label: 'P' },
    { code: 'BracketLeft', label: '[', shifted: '{' },
    { code: 'BracketRight', label: ']', shifted: '}' },
    { code: 'Backslash', label: '\\', shifted: '|' },
  ],
  [
    { code: 'CapsLock', label: 'caps lock', glyph: '⇪', w: 1.75 },
    { code: 'KeyA', label: 'A' },
    { code: 'KeyS', label: 'S' },
    { code: 'KeyD', label: 'D' },
    { code: 'KeyF', label: 'F', bump: true },
    { code: 'KeyG', label: 'G' },
    { code: 'KeyH', label: 'H' },
    { code: 'KeyJ', label: 'J', bump: true },
    { code: 'KeyK', label: 'K' },
    { code: 'KeyL', label: 'L' },
    { code: 'Semicolon', label: ';', shifted: ':' },
    { code: 'Quote', label: "'", shifted: '"' },
    { code: 'Enter', label: 'return', glyph: '⏎', w: 1.75 },
  ],
  [
    { code: 'ShiftLeft', label: 'shift', glyph: '⇧', w: 2.25 },
    { code: 'KeyZ', label: 'Z' },
    { code: 'KeyX', label: 'X' },
    { code: 'KeyC', label: 'C' },
    { code: 'KeyV', label: 'V' },
    { code: 'KeyB', label: 'B' },
    { code: 'KeyN', label: 'N' },
    { code: 'KeyM', label: 'M' },
    { code: 'Comma', label: ',', shifted: '<' },
    { code: 'Period', label: '.', shifted: '>' },
    { code: 'Slash', label: '/', shifted: '?' },
    { code: 'ShiftRight', label: 'shift', glyph: '⇧', w: 2.25 },
  ],
  [
    { code: 'Fn', label: 'fn', glyph: '🌐' },
    { code: 'ControlLeft', label: 'control', glyph: '⌃' },
    { code: 'AltLeft', label: 'option', glyph: '⌥' },
    { code: 'MetaLeft', label: 'command', glyph: '⌘', w: 1.25 },
    { code: 'Space', label: '', w: 5 },
    { code: 'MetaRight', label: 'command', glyph: '⌘', w: 1.25 },
    { code: 'AltRight', label: 'option', glyph: '⌥' },
    { code: 'Arrows', label: '', w: 3, shape: 'arrows' },
  ],
];

/** Width of every row in key units — the deck is sized from this. */
export const ROW_UNITS = 14.5;
