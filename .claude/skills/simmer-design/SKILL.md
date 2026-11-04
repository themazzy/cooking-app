---
name: simmer-design
description: Simmer's own UI rules (tokens, type, layout, icons, copy). Use before adding or changing any screen, sheet or style in this app.
---

# Simmer design rules

Simmer is a personal cooking app (React, Vite, Capacitor). Its look was reviewed on
2026-11-04 against published lists of "AI-made" design tells; these rules keep it
from drifting back. All styles live in `src/styles.css` and use its tokens.

## Colour
- Light theme is cream to match the red pot logo (`--bg`, `--card`, `--sunken`, `--border`).
  Dark theme is a warm brown-black, not neutral grey.
- One accent (`--accent`, picked in Settings). Semantic colours (`--warn`, `--error`,
  `--ok`, `--health-*`, `--macro-*`) are not accents.
- No gradients, glows, coloured side stripes on cards, or gradient text.

## Type
- Titles and headings use `--font-display` (Rubik, bundled in `src/fonts.css`);
  body text stays on the phone's own font.
- Use the size tokens only: `--fs-2xs` `--fs-xs` `--fs-sm` `--fs-md` `--fs-lg` `--fs-xl` `--fs-2xl`.
  Do not add new rem sizes.
- Section labels are sentence case and bold ("Vegetables"), never small grey UPPERCASE with letter-spacing.
- Numbers that line up (amounts, kcal, times) use `font-variant-numeric: tabular-nums`.

## Layout
- Lists (shopping, at home, ingredients) sit on the page with dividers (`.list-page`).
  Cards (`.card`) are for things that are separate objects: recipe cards, sheets, cook-mode steps.
- Cards have a border and no shadow. `--float-shadow` is only for things that float.
- Radius tokens: `--r-sm` 8px, `--r-md` 12px, `--radius` 16px, or fully round.
- Settings-style pages use `.page-title` plus `.group` sections, not a card per section.
- Don't open a screen with a row of big-number tiles; put facts in one meta line.
- Show the few controls people use most; put the rest in a sheet (see the recipe Filters sheet).

## Icons and pictures
- Lucide icons through `src/Icon.jsx` only; no emoji in the UI.
- The sparkle wand (`wand`) only marks real AI (Gemini) features.
- Ingredients without a picture show their aisle icon on a tinted tile (`IngredientIcon`).

## Pickers and controls
- No native `<select>`: use `src/Select.jsx`. Number boxes use `src/NumberField.jsx`.
- Controls are at least 40 to 44px tall. Destructive actions use `danger-text` or `danger`, never the same look as Done.
- Keyboard focus shows through `:focus-visible`.

## Copy
- Say what a control does, in plain words. Helper text is one short sentence.
- No slogans, no "magic", no em-dash asides.

## Checking
- Screenshot changed screens in light and dark at phone width before pushing.
- The `Design check` GitHub workflow runs Impeccable's detector on every push to main;
  read its summary for new findings.
