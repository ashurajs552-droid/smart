# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

Vite + React + TypeScript single-page app that:
- Captures webcam frames, detects face and emotion with face-api.js (TensorFlow.js).
- Derives a simple "attention" score from face bounding box size.
- Streams latest readings to Supabase (for a live dashboard) and can log attendance.
- Allows CSV export of local session snapshots via PapaParse.
- Styled with Tailwind CSS; no routing/state library beyond React state.

Key modules:
- src/App.tsx — UI, camera lifecycle, snapshot loop, CSV export, Supabase writes.
- src/utils/emotion.ts — Model loading and per-frame analysis.
- src/lib/supabaseClient.ts — Supabase client initialized from Vite env vars.

## Environment setup

1) Install dependencies

```sh
npm install
```

2) Configure environment

Copy the example and fill in your Supabase project values:

```sh
cp .env.local.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
```

3) Run the dev server

```sh
npm run dev
```

App mounts at http://localhost:5173 by default (Vite). You'll be prompted for camera access.

## Commands

- Development server:

```sh
npm run dev
```

- Type-check only:

```sh
npm run typecheck
```

- Lint entire repo:

```sh
npm run lint
```

- Lint a specific file (example):

```sh
npx eslint src/App.tsx
```

- Production build:

```sh
npm run build
```

- Preview built app locally:

```sh
npm run preview
```

Note: A test runner is not configured in this repo. If you add one (e.g., Vitest), also add matching npm scripts for full and single-test runs.

## Architecture and data flow

- Entry: index.html -> src/main.tsx renders src/App.tsx.
- Emotion pipeline (src/utils/emotion.ts):
  - On first use, loads TinyFaceDetector and FaceExpressionNet models from CDN (https://cdn.jsdelivr.net/npm/face-api.js/models).
  - analyzeFrame(video):
    - Detects single face + expressions.
    - Picks top-probability emotion.
    - Computes an attention score by normalizing the face box area against video frame area.
- UI loop (src/App.tsx):
  - Uses getUserMedia to stream webcam to a <video> element.
  - requestAnimationFrame loop calls analyzeFrame and appends results to local snapshots.
  - If a studentId is set, upserts the latest reading into Supabase for realtime dashboards.
  - Attendance button inserts a record with latest emotion/attention.
  - CSV export converts snapshots with PapaParse and downloads a file client-side.
- Styling: Tailwind classes with a few primitives in src/index.css; configured via tailwind.config.js and postcss.config.js.
- Build tooling: Vite with @vitejs/plugin-react; TypeScript strict mode; path alias @/* -> src/* (tsconfig.json).

## Supabase integration

- Env vars (Vite):
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY

- Tables referenced (expected columns inferred from code):
  - emotion_stream: student_id (text), at (timestamptz), emotion (text), confidence (float8), attention (float8). Upserted per latest reading.
  - attendance: student_id (text), student_name (text), at (timestamptz), emotion (text|null), attention (float8|null). Insert on "Mark attendance".

- Realtime: App writes current readings; a separate dashboard can subscribe to emotion_stream updates. Ensure Realtime is enabled for the table in Supabase if you use live subscriptions elsewhere.

## Notes for future changes

- face-api.js models are fetched from a public CDN. For offline or stricter CSP environments, host models yourself and update MODEL_URL in src/utils/emotion.ts.
- Performance: The detector uses inputSize 224 and scoreThreshold 0.4. Adjust for speed/accuracy trade-offs as needed.
