# Cooking App

Personal recipe app for two: import recipes from Instagram, TikTok and Facebook reels and from web pages, scale quantities, and build a shared shopping list. Everything runs on the device, with no paid services.

Website version: **https://themazzy.github.io/cooking-app/** (built from `main` by `.github/workflows/website.yml`). Reel import needs the Android app; see below.

Plan: [Cooking app: architecture and MVP plan](https://claude.ai/artifact/Rynt9iWqeLzTsi2GALbCK7)

## Current state: reel import test

One screen that takes a reel link and shows:

- the post **description** (where most recipes list ingredients),
- a **transcript** of the audio, made on the phone with Whisper,
- **ingredients and steps** read from the text by a rule-based parser (Czech and English).

| Platform | Description from | Video from |
| --- | --- | --- |
| TikTok | page JSON, then the public oEmbed endpoint | `playAddr` in the page JSON |
| Instagram | requests run inside a hidden WebView on instagram.com (`PageReaderPlugin`): signed-in media info, then the logged-out GraphQL query; plain HTTP fallbacks after that | `video_versions` from the same responses |
| Facebook | `message.text` or `og:description` | `playable_url` / `browser_native_*_url` |

Instagram answers plain HTTP clients with an empty app shell, which is why its requests run inside a real browser engine. Some reels are shown only to logged-in users; **Settings → Sign in to Instagram** logs in through a separate window inside the app, which has no access to the app itself.

These are unofficial page formats and will break from time to time. The parsers live in `src/lib/reel/` with tests in `reel.test.js`; when a platform changes, save the page HTML from the phone and update the fixture.

### Why the Android app

Browsers block requests to other sites (CORS), so the website can't load reel pages. The Android app uses Capacitor's native HTTP, which isn't limited by CORS and goes out over your own connection. On the website, paste the description or upload a video file instead.

### Sharing into the app

In Instagram, TikTok or Facebook tap **Share → Cooking App**. `MainActivity` turns the shared text into `cookingapp://share?text=…`, and the app starts the import.

### Speech model

Transcription uses [Transformers.js](https://huggingface.co/docs/transformers.js) with `onnx-community/whisper-base` (default) or `whisper-small` (better for Czech, larger download). The model downloads from Hugging Face on first use and is cached afterwards.

## Develop

```bash
npm install
npm run dev        # website at http://localhost:5173
npm test           # parser tests
npm run sync:android  # build and copy into the Android project
```

## Get the APK

Every push to `main` runs **Build Android APK** in GitHub Actions. Open the run, download the `cooking-app-debug-<n>` artifact, unzip it, and install `app-debug.apk` on the phone (allow installs from unknown sources once).

## Signing

APKs are signed with the app's own key, which is not in the repo. CI writes it from two repository secrets: `ANDROID_KEYSTORE_BASE64` (the keystore, base64) and `ANDROID_KEYSTORE_PASSWORD` (alias `cookingapp`). Without them the build stops, since an APK signed with another key can't update the installed app.
