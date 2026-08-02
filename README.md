# Octohuit

A local, ad-free Octordle clone with English and French modes. Eight simultaneous
5-letter words, 13 shared guesses, one random game at a time.

## Run it

```sh
npm install
npm run dev      # then open http://localhost:5173
```

Or build once and serve the static files from `dist/`:

```sh
npm run build
npm run preview
```

## Play it

Live at **https://regisca.github.io/octohuit/** (auto-deployed from `main` via
`.github/workflows/deploy.yml`). It's an installable PWA — open the link in
Chrome and use "Add to Home Screen" / the install prompt to get a standalone
app icon. Once installed, the whole game (both word lists, both languages)
works fully offline.

## Features

- **8 boards, 13 guesses** — classic Octordle rules; solved boards freeze and
  show the guess number that solved them.
- **EN / FR** — QWERTY or AZERTY on-screen keyboard; physical keyboard works in
  both (accented input like `é` is normalized to `E`). Switching language starts
  a new game.
- **Word pools** — *Common* draws solutions from high-frequency words (the
  original Wordle answer list for EN, top of the Lexique.org frequency corpus
  for FR); *Extended* uses a larger pool. Guesses always validate against the
  full dictionary (~13k EN / ~8k FR words).
- **One-screen layout** — 4×2 board grid plus keyboard fit without scrolling on
  laptop and ultrawide screens; falls back to 2 columns under 900px.
- **Dark / light theme** — follows system preference, manual override persisted.
- **Game end** — solutions shown with proper French accents and linked to
  Merriam-Webster (EN) or Wiktionnaire (FR).
- In-progress games survive a page reload (localStorage).

## Word data

`node scripts/build-wordlists.mjs` regenerates `src/data/en.ts` and
`src/data/fr.ts` from public sources (Wordle lists, hermitdave/FrequencyWords,
Lexique 3.83, French Hunspell dictionaries). Downloads are cached under
`scripts/.cache/`.

## Tests

```sh
npm test         # vitest — engine scoring, win/loss, keyboard aggregation
```
