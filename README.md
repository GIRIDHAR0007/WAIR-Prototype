# Wair

Wair is a mobile-first digital wardrobe and outfit planner prototype. It runs locally with Next.js, TypeScript, Tailwind CSS, Drizzle ORM, and SQLite.

## Run it locally

Requirements: Node.js 20.9+ and pnpm (npm also works with equivalent scripts).

```powershell
Copy-Item .env.example .env
pnpm db:push
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). If `pnpm` is not installed, enable it with `corepack enable` (or use `npm run dev`, `npm run db:push`, and `npm run db:seed`). Set `DATABASE_URL="file:./dev.db"` in `.env` for local SQLite.

## Quick demo

1. On the login screen, tap **Explore the demo as Avery**. The demo login uses Avery / `wair-demo` and Other gender, so both clothing taxonomies are available.
2. If the wardrobe is empty, tap **Load demo wardrobe** for 21 sample garments. It’s safe to click again; existing samples are kept and missing ones are restored. Or upload your own photos.
3. Open **Profile** and save a face shape and body type, or use the optional browser-only face photo estimator.
4. Open **Outfit Planner**, choose Formal/Informal, pick a color direction, then browse the three swipeable looks. Try Like/Dislike and **Generate again** to see feedback affect later suggestions.
5. Open **Preview** on an outfit to see the garments on the silhouette. Personal try-on is optional and disabled by default.

You can use the bottom navigation on a phone-sized screen. Demo credentials are for convenience only; login is not real authentication and passwords are stored as prototype data.

## What works and what is mocked

- Wardrobe uploads support multiple images, editable tags, category filters, deletion, and pixel-derived dominant color hex values.
- Clothing tagging uses the OpenAI vision wrapper only when `OPENAI_API_KEY` is configured. Otherwise a deterministic mock tagger is used; it does not call an AI service.
- Sample garment art is generated placeholder SVG, not product photography. Seed/reset demo data with `pnpm db:seed`; use **Load demo wardrobe** to add the samples to the signed-in user.
- Outfit combinations and ranking use the editable deterministic rules in `data/outfit-rules.ts`; the explanation is generated with a local fallback when no suitable API key is configured. Three looks are returned when the wardrobe contains enough compatible, distinct pieces.
- Feedback is persisted and influences the recommendation weights.
- Face shape from a photo is estimated on-device in the browser with MediaPipe. Face photos are not uploaded or stored.
- The base try-on is a silhouette composition. Optional personal image generation needs `OPENAI_API_KEY` and `ENABLE_VIRTUAL_TRY_ON="true"`; it can incur API charges. A full-body photo is sent only after the user chooses it and presses **See it on me**, and it is not saved by Wair.
- Background removal is optional and runs in the browser; upload still works if it fails or is skipped.

## Configuration

Copy `.env.example` to `.env`. For normal demo use, no API keys are required. Optional settings:

```dotenv
OPENAI_API_KEY=
ENABLE_VIRTUAL_TRY_ON=false
DATABASE_URL="file:./dev.db"
```

Restart the dev server after changing environment variables. See `.env.example` for the complete list.

## Data and storage

The local database is SQLite. User garment images are stored under `uploads/` through the storage module so disk storage can later be replaced by cloud storage. Do not put `.env` or real user photos into source control.

Run focused scoring checks with `pnpm test`.
