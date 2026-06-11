# Movie Wizard

Movie Wizard is a small, browser-only app for rating movies, keeping a watchlist, and finding something to watch next.

Use the app here: https://ifbars.github.io/movie-wizard/

There is no account system, no backend, and no hosted database. Your ratings, watched list, ignored movies, watchlist, and settings stay in your browser's local storage. You can export a backup from Settings and import it again later.

## What it does

- Browse a static movie catalog with posters, release details, genres, cast, crew, trailers, and IMDb links.
- Rate movies in half-star steps.
- Mark movies as watched, add them to a watchlist, or hide titles you are not interested in.
- Get local recommendations based on your ratings and preferences.
- Filter the catalog by language, adult-tagged titles, and minimum recommendation year.
- Export or import your local Movie Wizard data as JSON.

## Data and attribution

Movie Wizard uses TMDB for public movie metadata, images, credits, trailers, and vote data. The generated catalog is bundled with the app at build time, so visitors do not need an API key.

This product uses the TMDB API but is not endorsed or certified by TMDB.

IMDb IDs are used only for outbound IMDb links. Movie Wizard does not bundle OMDb data.

## Privacy

Movie Wizard is local-first:

- No sign-in.
- No tracking account.
- No server-side copy of your movie activity.
- No API keys in the browser app.

GitHub Pages serves the static app. GitHub may log normal request data for security and service operation.

## Development

Install dependencies:

```bash
bun install
```

Start the Vite dev server:

```bash
bun run dev
```

Run the normal checks:

```bash
bun run lint
bun run build
```

Build the static catalog payloads:

```bash
bun run data:payloads
```

Refresh the catalog from TMDB with a local `.env.local` file:

```bash
bun run data:enrich -- --limit=250 --pages=20 --include-tmdb-export
```

See `docs/data/movie-data-pipeline.md` for the catalog pipeline details.

## Deployment

The app deploys to GitHub Pages through `.github/workflows/deploy-pages.yml`. The workflow installs dependencies with Bun, runs lint, builds with `GITHUB_PAGES=true`, adds a single-page app fallback, and publishes `dist`.

## License

MIT. See `LICENSE`.
