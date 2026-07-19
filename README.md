<p align="center">
  <img src="assets/header.svg" alt="Thockpit — a typing test you can hear" width="100%">
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000?logo=next.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white">
  <img alt="three.js" src="https://img.shields.io/badge/three.js-r185-000?logo=three.js&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white">
</p>

**Thockpit** is a typing test you can *hear*. A 3D mechanical keyboard sits under the
words and reacts as you type — the right keycap sinks, the next one glows, and every
stroke plays a recording of a real switch. Dress it in one of six keycap-set themes,
flatten it to a 2D board if you prefer, and when the clock runs out you get a graph of
what actually happened. Every run is kept locally so you can watch yourself improve.

```bash
npm install
npm run dev     # → http://localhost:3000
```

No accounts, no backend, no telemetry. Everything lives in your browser.

<p align="center">
  <img src="assets/shot-typing.png" alt="Typing, with the 3D board tracking every keystroke" width="100%">
</p>

<p align="center">
  <img src="assets/shot-results.png" alt="Results: speed per second, raw, and errors" width="49%">
  <img src="assets/shot-stats.png" alt="All-time stats" width="49%">
</p>

---

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Sound packs](#sound-packs)
- [Themes](#themes)
- [Project structure](#project-structure)
- [Design decisions](#design-decisions)
- [Accessibility](#accessibility)
- [Scripts](#scripts)
- [Deploying](DEPLOYMENT.md)
- [Credits](#credits)

---

## Features

### ⌨️ A real 3D keyboard

A MacBook (US ANSI) layout rendered in WebGL with three.js — actual keycap geometry,
lights, shadows, and a deck that tilts as you move the cursor. Not a CSS approximation:
the caps genuinely sit above the deck plane, so they parallax correctly and cast
shadows onto it.

The layout is the real thing, down to the key widths — `delete` is 1.5u, `caps lock`
1.75u, both shifts 2.25u, the arrows are a proper inverted-T, and `F` and `J` have
home-row bumps. Every row adds up to 14.5u, which is what keeps the deck rectangular.

- The key you must press **next** pulses in the theme's accent.
- A capital letter also lights the **opposite** shift key — the one you're supposed
  to use.
- On a phone, where the keyboard reports no key codes at all, the key is worked out
  from the character that lands in the input — so the board still plays along.
- The whole board can be hidden if you'd rather just type.

Prefer something flatter? Flip to the **2D board** in Keyboard Settings: the same keys
and the same behaviour — pressed lights up, the next one glows, the results heatmap —
drawn as crisp coloured tiles instead of WebGL. Both boards read from one layout table,
so they can never disagree.

### 🎨 Six themes, head to toe

Classic amber, Mint, Royal, Dolch, Sand, Scarlet — named after keycap sets, the way the
switches are. Pick one and the whole app moves with it: the keycaps and their deck, the
pressed-key glow, the next-key hint, the WPM number, the buttons, the speed line on the
graph, the logo mark, even the glow of the lamp. In light mode the page itself takes on
a faint wash of the colour; dark mode stays true black, because a tint there just muddies
it. Your choice is kept between visits.

### 🎯 …and it shows you what you keep missing

When the test ends, the board comes back as a **heatmap**: every key you typed is
coloured by how often you actually hit it. Green is clean, amber is slipping, red is
trouble. Keys you never touched stay grey.

Every other typing test hands you a graph. None of them can show you that your `;`
is the problem.

### 🔊 Real switch sounds

Recordings of actual switches, not synthesis. Twelve packs ship, and each one carries:

- a **different press sample per keyboard row**, so the board sounds uneven the way a
  real one does,
- **dedicated samples** for the stabilised keys (space, enter, backspace),
- an **up-stroke** sample, because releasing a key makes a sound too.

Every press is detuned a few percent at random, so two strokes of the same key are
never identical. Samples decode up-front and play through a compressor, so fast typing
doesn't clip or lag.

And where the device can do it — a phone, mostly — **haptics** add a faint tap on every
keystroke. Everywhere that can't, the toggle is simply a no-op; nothing pretends.

### 🏆 A best worth celebrating

Beat your own record and the board says so: a wave rolls out from the middle of the
keyboard, every cap lifting and flashing the accent as it passes, over a rising arpeggio
that could never be mistaken for a keystroke.

Then hit **Share** and the run renders to an image — your wpm, the shape of the run,
the mistakes, a personal-best badge if you earned one. It goes to the share sheet on
a phone, the clipboard on a desktop, and your downloads folder if the browser allows
neither.

### ⏪ Replay

Press **Replay** and the board types your test back to you: the same keys, at the same
moments, with the same sounds — including every mistake and every backspace. Kept in
memory only, since a minute of fast typing is a thousand keystrokes and fifty of those
would not fit in `localStorage`.

### 💡 A light you pull

The lamp hanging in the corner is a pull-chain. Grab it, **pull it down**, and let go —
the cord stretches, springs back, and the light comes on (light theme). Pull again and
it goes off. Pull less than the threshold and nothing happens, exactly like the real
thing. Lit, the bulb glows in whatever theme you're wearing. It's also a plain button,
so a tap or the keyboard works fine.

### ⚙️ One place for the settings

The **Keyboard Settings** panel gathers everything in one dialog: theme, 2D or 3D board,
sound pack, whether the board shows, haptics, and sound. It opens from the toolbar and
closes on `Escape` or the button. Nothing you set there is ever lost — it all rides in
`localStorage`.

### 📈 Stats that mean something

After every test:

| | |
|---|---|
| **WPM** | correct characters ÷ 5, per minute |
| **Raw** | every character you typed, mistakes included |
| **Accuracy** | correct keystrokes ÷ total keystrokes |
| **Consistency** | how even your pace was — the coefficient of variation of your per-second raw speed, inverted. Typing at a constant speed scores 100. |

…and a graph of **speed per second**: your wpm line, your raw line, and a red **×**
wherever you slipped. Hover anywhere on it for the numbers at that second.

Every run is saved to `localStorage` (the last 50). The **stats panel** in the toolbar
shows your averages, your best per mode, a graph of your recent runs, and a table of
your last ten.

### ✍️ Words, or a sentence

15, 30 or 60 seconds of common English drawn from ~960 words — and the list tops itself
up as you go, so the clock ends the test, never the word list. Or switch to **quote**
mode and type a real sentence from public-domain literature; it ends when the sentence
does.

Backspace reaches **back into the previous word**, the way it does in a real editor, and
`esc` restarts.

---

## How it works

### The typing engine — `hooks/useTypingEngine.ts`

Holds the words, the per-character state (`idle` / `correct` / `incorrect` / `current`),
the timer, and the stats. Input arrives through a hidden `<input>`, so the browser's own
text handling (backspace, repeat, IME) does the boring work.

While the test runs it takes **one sample per elapsed second** — wpm, raw, and the
number of mistakes made during that second. That array is the result graph. When the
clock ends (or you finish the words), it builds a `TestResult`, saves it, and hands it
back. An untouched test is never saved.

### The boards — `components/Keyboard3D.tsx`, `components/Keyboard2D.tsx`

The layout table in `utils/keyboard.ts` is turned into positions once, then drawn two
ways. `Keyboard3D` places it in world space and renders with React Three Fiber; key
legends are drawn to a canvas and used as textures, so no font file has to load and
nothing goes fuzzy when the board is scaled. `Keyboard2D` lays the same keys out as flat
DOM tiles. A tiny `KeyboardView` picks between them, so every caller — the live test, the
results heatmap, the replay — renders whichever board you chose.

Pressed keys are damped toward their sunk position each frame rather than snapped, and
the emissive glow is lerped, so at 150 wpm the board still looks like it's being played
rather than strobing.

### The theme — `utils/themes.ts`

Each theme is an accent plus a keycap palette for light and dark. The keyboards take the
palette directly; the rest of the UI reads the accent through a single `--accent` CSS
variable. That variable is written to `<html>` *imperatively, after mount* — never in
the server-rendered markup — so a stored theme can't clash with what the server drew and
leave the wrong colour stuck on load.

### The sound — `hooks/useKeySound.ts`

A small Web Audio sample player. The `AudioContext` is created up-front in a suspended
state and all twelve samples for the chosen pack are decoded immediately, so the very
first keystroke already has sound to play — a keydown only has to `resume()` it, which
is the user gesture browsers require.

### The charts — `components/ResultChart.tsx`, `components/HistoryChart.tsx`

Hand-written SVG, no chart library. Scales, ticks, hover crosshair, tooltip, and a
screen-reader table, in about 200 lines each. The speed line follows the theme accent,
darkened a touch in light mode so it stays legible on a near-white plot.

---

## Sound packs

| Pack | Feel |
|---|---|
| **Holy Panda** *(default)* | tactile, deep thock |
| **Alpaca**, **Cream**, **Topre** | smooth, poppy, deep |
| **MX Brown**, **MX Black**, **Black Ink**, **Red Ink** | the classics, tactile and linear |
| **Box Navy**, **Blue Alps**, **Turquoise** | loud and clicky |
| **Buckling Spring** | the IBM Model M |

Pick one in Keyboard Settings; the choice is remembered. All 144 samples come from
[**tplai/kbsim**](https://github.com/tplai/kbsim) (MIT) — see
[`public/sounds/CREDITS.md`](public/sounds/CREDITS.md). They add up to about 600 KB.

---

## Themes

| Theme | Accent |
|---|---|
| **Classic** *(default)* | amber |
| **Mint** | emerald |
| **Royal** | indigo |
| **Dolch** | teal |
| **Sand** | warm tan |
| **Scarlet** | red |

Choose one in Keyboard Settings. Each carries its own keycap colours for light and dark,
and the accent flows to the whole interface. Everything's in `utils/themes.ts` — add a
theme by dropping another entry in the list.

---

## Project structure

```
app/
  layout.tsx           root layout, fonts, metadata
  page.tsx             the only route
  icon.svg             favicon (Next picks this up automatically)
components/
  TypingTest.tsx       composition root — wires everything together
  WordDisplay.tsx      the words and their per-character colours
  Keyboard3D.tsx       the three.js board
  Keyboard2D.tsx       the flat DOM board
  KeyboardView.tsx     picks 2D or 3D for every caller
  KeyboardSettings.tsx the settings dialog
  ThemeToggle.tsx      the pull-chain lamp
  ResultChart.tsx      speed-over-time graph
  HistoryChart.tsx     wpm across recent tests
  StatsPanel.tsx       all-time stats
  Stats.tsx            the live wpm / accuracy / timer row
  ModeSelector.tsx     test length and options
  Logo.tsx             the keycap mark
hooks/
  useTypingEngine.ts   test state, per-second sampling, results
  useKeySound.ts       Web Audio sample player
utils/
  keyboard.ts          MacBook layout table, char → key mapping
  themes.ts            the six keycap-set colour themes
  words.ts             word list and generation
  typing.ts            wpm, accuracy, consistency
  stats.ts             all-time aggregates
  storage.ts           localStorage (history + prefs)
public/sounds/         the switch recordings
```

---

## Design decisions

A few things that are less obvious than they look, kept here so nobody re-learns them
the hard way.

**The board is WebGL, but the fit is measured, not derived.** Sizing the camera with
trigonometry looks right until it isn't: the keycaps stand *above* the deck plane, so
they project wider than the deck's own footprint, and the board yaws with the cursor.
Both push the edges out of frame — `fn` and the right arrow get clipped. The camera rig
instead measures the board's real bounding box and binary-searches the closest distance
that still projects all eight corners inside the view. It's correct at any aspect ratio.
(drei's `<Bounds>` fits a bounding *sphere*, which for a board this wide and flat
overshoots the other way and leaves it tiny.)

**The theme rides on a CSS variable set after mount.** Reading the stored theme in
render would make the server draw amber and the client draw your real colour — a
hydration mismatch, and browsers "won't patch it up," so the wrong accent sticks. Instead
`--accent` is written to `<html>` in an effect, once the client is mounted, and nothing
theme-derived ever appears in the server markup. `<body>` also carries
`suppressHydrationWarning`, because extensions like to inject attributes there before
React loads.

**Dark stays black; only light gets a tint.** The page background is a faint wash of the
accent — but only in light mode, where it reads as a tasteful hint. Over near-black it
just turns muddy, so dark mode keeps its true `#0f0f0f`.

**The result graph has one y-axis.** Monkeytype-style charts often put errors on a
second scale; two y-scales in one chart is the single most misleading thing you can do
to a reader. Errors ride on the raw line instead — same scale, no second axis.

**Chart colours follow the theme, but never blindly.** The speed line uses the theme
accent so the graph matches the rest of the app, but on a light plot that accent is
darkened until it clears contrast against the near-white surface. Both lines are also
labelled directly, so identity never rests on colour alone.

**Pointer capture eats clicks.** The pull-chain first used `setPointerCapture`, which
retargets the follow-up `click` to the capturing element — so a plain tap on the lamp
never reached the button and the theme wouldn't toggle. It tracks the drag on `window`
instead.

**A page-wide click handler will steal your focus.** Clicking anywhere refocuses the
hidden typing input — which snatched focus off the controls and shut a dropdown the
instant it opened. Interactive controls stop the click from propagating; the panels blur
the input while they're up, or keystrokes would quietly run a test behind them.

---

## Accessibility

- Every chart ships a `sr-only` table of the same numbers.
- Series are direct-labelled, so a colourblind reader never has to tell the accent from grey.
- The lamp is a real `<button>`: tab to it, hit enter.
- The stats and settings panels are labelled dialogs and close on `Escape`.
- The banner above honours `prefers-reduced-motion`. **The app itself doesn't yet** —
  the board's tilt and the next-key pulse keep animating. Worth fixing.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server on :3000 |
| `npm run build` | production build |
| `npm start` | serve the build |
| `npm run lint` | eslint |

Deploying it (Vercel or anywhere else): [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## Credits

- Switch recordings — [tplai/kbsim](https://github.com/tplai/kbsim) (MIT)
- Type — [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
- Built with [Next.js](https://nextjs.org), [React Three Fiber](https://r3f.docs.pmnd.rs/),
  and [Tailwind](https://tailwindcss.com)
