# Movie Data Pipeline

Movie Wizard should stay browser-only. Movie metadata is generated ahead of time by local Bun scripts, then the app reads static JSON from `src/data/generated`.

## API Keys

Create `.env.local` from `.env.example`.

Required:

- `TMDB_READ_TOKEN`: TMDb API Read Access Token from TMDb account settings. This is the preferred credential for enrichment.

Optional:

- `OMDB_API_KEY`: OMDb API key. Keep this disabled for the public generated catalog unless you have separate permission from OMDb. Their terms restrict use to personal, non-commercial purposes and prohibit creating an index of Contributions without authorization.
- `TMDB_API_KEY`: legacy TMDb v3 API key. The script supports it, but prefer `TMDB_READ_TOKEN`.

Do not expose these keys to the Vite app. Keep them in `.env.local` for local runs and, later, GitHub Actions secrets.

## Source Roles

- Curated seeds: `src/data/curated/movies.seed.json` keeps hand-picked titles and local recommendation tags.
- TMDb API: primary source for posters, backdrops, overview, runtime, genres, popularity, vote data, credits, keywords, and external IDs.
- TMDb daily exports: optional no-auth discovery list for valid TMDb IDs. The export is not a full metadata source.
- OMDb API: not part of the default catalog pipeline. It can be useful for local personal experiments by IMDb ID, but should stay out of public generated data unless separately authorized.

IMDb public TSV datasets are intentionally not wired in yet. They can be useful later for rating/vote-count cross-checks, but their terms are more restrictive and they do not provide posters or descriptions.

## Commands

Generate placeholder records from curated seeds only:

```bash
bun run data:seed -- --limit=18
```

Generate enriched records from curated seeds plus TMDb popular, top-rated, and discovery pages:

```bash
bun run data:enrich -- --limit=250 --pages=3
```

Enrichment is incremental. If `src/data/generated/movies.json` already exists, the script keeps those records and treats `--limit` as the maximum number of new records to add during that run. Existing records are skipped by TMDb ID, IMDb ID, record ID, and seed title/year so reruns do not spend API calls re-enriching the same catalog entries.

The script also writes `src/data/generated/enrichment-manifest.json`. The manifest tracks successful TMDb enrichments, recent failures, retry cooldowns, and the current source fingerprint. Local reruns and scheduled runs use it to avoid redundant requests for fresh records.

Raw TMDb API responses are cached under `.movie-wizard-cache/tmdb` and are intentionally not committed. Use `--cache=read-only` to rebuild from local cached responses only, or `--cache=off` to force live API reads.

Include the no-auth TMDb daily ID export as an extra discovery source:

```bash
bun run data:enrich -- --limit=1000 --pages=10 --include-tmdb-export
```

Refresh records that TMDb reports as changed and records older than the stale threshold:

```bash
bun run data:enrich -- --limit=250 --pages=20 --include-tmdb-export --refresh-changes --refresh-stale --stale-days=90 --refresh-limit=100
```

Useful reliability flags:

- `--refresh-changes`: checks TMDb `/movie/changes` and refreshes matching records already in the local catalog.
- `--refresh-stale`: refreshes records older than `--stale-days`.
- `--refresh-limit=100`: caps refresh work separately from new record work.
- `--retry-days=7`: skips TMDb IDs that failed recently until the retry cooldown expires.
- `--cache=read-write`: default; reads cached responses and writes misses.
- `--cache=read-only`: fails on cache misses, useful for offline rebuild checks.
- `--cache=off`: bypasses the local response cache.

Include OMDb for a local personal experiment:

```bash
bun run data:enrich -- --limit=250 --include-omdb
```

Do not use `--include-omdb` for public app data without confirming rights.

## Outputs

- `src/data/generated/movies.json`
- `src/data/generated/metadata.json`
- `src/data/generated/enrichment-manifest.json`

The generated movie records preserve the app-facing `Movie` shape while adding optional `tmdbId`, `imdbId`, `posterPath`, `backdropPath`, and source metadata.

## Scheduled Enrichment

`.github/workflows/enrich-movie-catalog.yml` runs weekly and can also be started manually. It:

1. Installs dependencies with Bun.
2. Runs the TMDb enrichment script with daily export discovery, changed-record refresh, and stale-record refresh.
3. Runs `bun run lint` and `bun run build`.
4. Commits generated catalog changes only when `src/data/generated` changed.

Configure the repository secret `TMDB_READ_TOKEN` before enabling scheduled runs. Do not commit `.env.local` or API credentials.
