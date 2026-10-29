# Simmer

A personal cooking app for one household. It imports recipes from reels, websites, photos and pasted text, scales them to any number of portions, plans the week, and builds a shared shopping list. Everything runs on the phone or in the browser, with no paid services.

Website version: **https://themazzy.github.io/cooking-app/** (built from `main` by `.github/workflows/website.yml`). Reel import needs the Android app; see [Why the Android app](#why-the-android-app).

Plan: [Cooking app: architecture and MVP plan](https://claude.ai/artifact/Rynt9iWqeLzTsi2GALbCK7)

## Features

**Import**
- Reels from Instagram, TikTok, Facebook and YouTube Shorts: the caption, the author's or pinned comment, and a transcript made on the phone with Whisper. Whisper is skipped when the caption or comments already hold the recipe.
- Recipe websites (schema.org data, microdata and common recipe plugins), including sites behind Cloudflare.
- Photos of a cookbook or handwritten recipe (several pages are joined), screenshots of comments, pasted text and video files.
- Share a reel or link into the app with **Share → Simmer**.
- A rule-based parser reads ingredients, amounts, groups ("For the sauce") and steps in English, Czech, Slovak, Bulgarian, German, Spanish, Italian, French, Polish, Russian, Japanese, Chinese and Korean. Other languages are translated on the phone first. Every import opens as an editable recipe.

**Recipes**
- Portion scaling, unit display (original, metric or imperial; dry ingredients are weighed), and oven temperatures in °C or °F.
- Ingredient groups, drag to reorder, ingredient swaps, diet and style tags, collections, ratings per person, notes and cooking history.
- Calories, protein, carbs and fat per portion; filters by time, calories, rating and tags.
- Share as text or as a one-page PDF.
- Saved videos stay on the phone that saved them (480p or 720p WebM).

**Cooking**
- Cook mode shows one step at a time with its ingredients and timers, keeps the screen on, reads steps aloud, and listens to voice commands ("next", "read", "scroll down", in English, Czech and Bulgarian).
- After cooking, it offers to take the used amounts out of stock.

**Planning and shopping**
- Weekly meal plan with "Plan my week" and suggestions that use up leftovers.
- One shopping list combined from several recipes, sorted in your own shop's section order, with eBag.bg search links.
- At home: pantry stock with minimum amounts and use-by dates, barcode scanning (Open Food Facts), and receipt reading (Bulgarian and English).
- An ingredient catalog of about 800 items with pictures, aliases in several languages, and your own products.

**Household**
- Recipes, lists, plan and stock sync through Supabase. A household can share one login, or each person signs in and joins with an invite code.
- Light (cream) and dark themes with a choice of accent colour.

## Install the Android app

1. Open the latest green **Build Android APK** run on the [Actions tab](https://github.com/themazzy/cooking-app/actions/workflows/build-android.yml).
2. Download the `Simmer-<n>` artifact, unzip it, and open `Simmer-<n>.apk` on the phone. Allow installs from unknown sources once.
3. Later builds install as updates over the old one, since each run has a higher version number and the same signing key.

Signing in to Instagram and Facebook under **Settings** is optional; it lets the app read comments and reels that are only shown to signed-in users.

## Setup

The app talks to one Supabase project (URL and publishable key in `src/lib/supabase.js`). To set up a new project:

1. Run the files in `supabase/migrations/` in order in the Supabase SQL editor. They create the households, recipes, shopping lists, pantry, ingredient and barcode tables, row level security, and the private `recipe-videos` bucket.
2. Run `supabase/seed-ingredients.sql` to fill the ingredient catalog. After changing `src/data/`, regenerate it with `npm run seed:ingredients` and run it again, because the app shows the database copy of the catalog.
3. In Authentication settings, turn off new sign-ups once your household's accounts exist.
4. Point `src/lib/supabase.js` at the new project.

For CI builds, add two repository secrets: `ANDROID_KEYSTORE_BASE64` (the keystore, base64) and `ANDROID_KEYSTORE_PASSWORD` (alias `cookingapp`). The key is not in the repo. Without these secrets the build stops, because an APK signed with another key can't update the installed app.

For the website, set **Settings → Pages → Source** to GitHub Actions.

## Develop

```bash
npm install
npm run dev           # website at http://localhost:5173
npm test              # parser and logic tests (Vitest)
npm run sync:android  # build and copy into the Android project
```

## Stack

- **React 19 + Vite** for the app, **Capacitor 8** for Android.
- **Supabase** for login, Postgres with row level security, realtime sync and storage.
- **Transformers.js** Whisper (`whisper-base`, or `whisper-small` for better Czech) for transcripts, downloaded from Hugging Face on first use.
- **Google ML Kit** for text in photos and for barcodes; **Tesseract.js** (bundled Bulgarian and English) for Cyrillic photos and receipts; ML Kit GenAI (Gemini Nano on the phone) for translation where the phone supports it.
- Native Android plugins in `android/app/src/main/java/`: `PageReaderPlugin` (hidden WebView for Instagram, Facebook and Cloudflare sites), `TextReaderPlugin`, `BarcodeScannerPlugin`, `TranslatorPlugin`, `VoiceCommandsPlugin` (speech recognition and text-to-speech) and `TimerAlarmPlugin`.
- **lucide-react** icons; ingredient pictures from TheMealDB and Wikimedia Commons (see `public/ingredients/CREDITS.md`).

## How reel import works

| Platform | Text from | Video from |
| --- | --- | --- |
| Instagram | requests run inside a hidden WebView on instagram.com (`PageReaderPlugin`): signed-in media info and comments, then the logged-out query | `video_versions` |
| TikTok | page JSON, then the public oEmbed endpoint | `playAddr` in the page JSON |
| Facebook | the reel loaded in the hidden WebView (caption and comments), then plain HTTP | `playable_url` / `browser_native_*_url` |
| YouTube Shorts | description, captions and comments | audio stream |

These are unofficial page formats and will break from time to time. The readers live in `src/lib/reel/` with tests next to them; when a platform changes, save the page HTML from the phone and update the fixture.

### Why the Android app

Browsers block requests to other sites (CORS), so the website can't load reel pages. The Android app uses Capacitor's native HTTP and a hidden WebView, which aren't limited by CORS and go out over your own connection. On the website, paste the caption or upload a video file instead.
