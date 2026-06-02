# Movie Wizard Foundation Design

## Goal

Movie Wizard is a static React app inspired by MovieLens for choosing movies to add to a Plex server. It lets a single local user mark movies as watched, rate them, and receive recommendations from a local seeded catalog without any backend or hosting costs.

## Scope For The Foundation

This first pass establishes the app structure and a usable local-first prototype:

- Vite, React, TypeScript, Tailwind CSS v4, and Bun scripts.
- Project conventions inspired by `MLVScan.Web` and `DedicatedServerMod/marketing`: `@` path alias, Tailwind v4 Vite plugin, small `cn` utility, focused feature/data/lib folders, and clear app composition boundaries.
- A polished app shell with navigation for Discover, Rated, Watchlist, and Settings.
- A seed movie catalog stored in source code.
- User movie state stored in browser `localStorage`.
- Rating, watched, and watchlist interactions that update real local state.
- A deterministic recommendation engine based on genre affinity, mood tags, release decade, runtime preference, director/cast overlap, and exploration penalties.
- Export/import placeholders in the architecture, with a simple export button acceptable if time permits.

No backend, authentication, Plex integration, TMDB API integration, scraping, or hosted account sync belongs in the foundation.

## Product Model

The app should feel like a modern recommendation workbench, not a marketing landing page. The first screen should be the actual tool:

- A focused app shell with compact navigation and library status.
- A recommendation feed that explains why each movie was suggested.
- Movie rows/cards with poster-like visual treatment, metadata, rating control, watched toggle, and watchlist action.
- A small taste profile summary showing strongest genres/tags and how many ratings are needed to improve quality.
- Settings for local data controls such as reset, export, and future import.

Visual direction should borrow the disciplined dark product surface from MLVScan.Web and the confident, media-rich presentation from DedicatedServerMod marketing, but keep the palette specific to cinema rather than copying either brand.

## Data Model

The app uses code-native seed data:

- `Movie`: id, title, year, runtime, genres, tags, directors, cast, synopsis, poster color/gradient, popularity, critical score, and Plex-fit notes.
- `UserMovieState`: movie id, watched boolean, rating from 0.5 to 5, watchlist boolean, ignored boolean, updated timestamp.
- `TasteProfile`: derived from rated movies, not stored directly.
- `Recommendation`: movie plus score, confidence, and readable reason list.

Browser storage keeps only user-specific state. The seed catalog can be replaced later by imported JSON or a generated static dataset.

## Recommendation Approach

The first algorithm should be transparent and deterministic:

1. Learn positive affinities from highly rated watched movies.
2. Learn negative affinities from low-rated watched movies.
3. Score unrated movies by weighted genre/tag/director/cast overlap.
4. Adjust by runtime, decade, and popularity/critical balance.
5. Penalize movies already watched, ignored, or too similar to recently rated items.
6. Return reasons like `matches your sci-fi noir streak` or `shares director/cast DNA with movies you rated highly`.

This is not collaborative filtering because there are no other users in a static app. The architecture should keep the scorer isolated so a future model, import pipeline, or account-backed service can replace it.

## Architecture

- `src/data/movies.ts`: curated seed catalog.
- `src/types.ts`: shared domain types.
- `src/lib/storage.ts`: localStorage read/write helpers with versioned payloads.
- `src/lib/recommendations.ts`: pure scoring and profile functions.
- `src/lib/utils.ts`: small shared utilities such as `cn`.
- `src/hooks/useMovieLibrary.ts`: React state boundary for user actions and persistence.
- `src/components/*`: app shell, movie cards, rating controls, profile summary, recommendation list, settings panel.
- `src/App.tsx`: composition only.

React implementation should keep expensive derived data in `useMemo`, use lazy `useState` initialization for localStorage reads, keep functional state updates for rating/watchlist actions, and avoid putting derived recommendation state into effects.

## Testing And Verification

Foundation verification should include:

- `bun run build`
- Manual browser check of the app shell and core flow.
- Confirm rating/watched/watchlist actions persist after refresh.
- Confirm recommendations change after ratings are added.

## Future Work

- Larger generated or imported movie catalog.
- JSON export/import for backup.
- Optional TMDB metadata enrichment at build time.
- Optional account sync only after the local app proves useful.
