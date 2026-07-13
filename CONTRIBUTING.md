# Contributing

```bash
npm install
npm run dev
```

Before opening a PR:

```bash
npm run lint
npm run build
```

## Adding a switch pack

Drop a folder in `public/sounds/<name>/` with `press/` and `release/` samples —
`GENERIC_R0…R4`, `SPACE`, `ENTER`, `BACKSPACE` for presses, and `GENERIC`, `SPACE`,
`ENTER`, `BACKSPACE` for releases — then add it to `SWITCHES` in
`hooks/useKeySound.ts`. Make sure you have the right to redistribute the recordings,
and credit them in `public/sounds/CREDITS.md`.

## Things worth knowing

- Every commit should `npm run lint` and `npm run build` clean.
- Charts follow the rules in the README's "Design decisions" — one y-axis, colours
  checked against the surface, series direct-labelled.
- The board is measured, not hand-tuned: if you change its geometry, the camera rig
  refits itself.
