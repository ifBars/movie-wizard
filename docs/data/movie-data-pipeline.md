# Movie Data Pipeline

Movie Wizard should stay browser-only. Movie metadata is generated ahead of time by local Bun scripts, then the app reads static JSON from `src/data/generated`.

The runtime payloads are split by loading priority:

- `catalog-bootstrap.json` contains a compact high-signal shelf for the first useful paint.
- `catalog-index-shards/*.json` merges locally saved/rated movies into that first personalized catalog.
- `catalog-search.json` is a compact lazy search corpus parsed and queried in a Web Worker.
- `catalog-index.json` remains the complete validation/export index.
- `movie-details-shards/*.json` keeps the first detail-page request limited to one deterministic shard.
- `movie-details.json` remains the complete validation/export payload.

Search returns movie IDs off the main thread, then loads only the small catalog-index shards needed to render the current result page.

Catalog enrichment and seed commands rebuild these derived payloads automatically.

## API Keys

Create `.env.local` from `.env.example`.

Required:

- `TMDB_READ_TOKEN`: TMDb API Read Access Token from TMDb account settings. This is the preferred credential for enrichment.

Optional:

- `TMDB_API_KEY`: legacy TMDb v3 API key. The script supports it, but prefer `TMDB_READ_TOKEN`.

Do not expose these keys to the Vite app. Keep them in `.env.local` for local runs and, later, GitHub Actions secrets.

## Source Roles

- Curated seeds: `src/data/curated/movies.seed.json` keeps hand-picked titles and local recommendation tags.
- TMDb API: primary source for posters, backdrops, overview, runtime, genres, popularity, vote data, credits, keywords, and external IDs.
- TMDb daily exports: optional no-auth discovery list for valid TMDb IDs. The export is not a full metadata source.
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

Sample random TMDb page windows instead of always reading page 1..N:

```bash
bun run data:enrich -- --limit=250 --pages=20 --page-mode=random --page-max=500 --discover-sort=mixed
```

Enrichment is incremental. If `src/data/generated/movies.json` already exists, the script keeps those records and treats `--limit` as the maximum number of new records to add during that run. Existing records are skipped by TMDb ID, IMDb ID, record ID, and seed title/year so reruns do not spend API calls re-enriching the same catalog entries.

New-record discovery and refresh maintenance use separate budgets. The script chooses new candidates first, then appends refresh candidates up to `--refresh-limit`, so scheduled runs do not spend the new-record limit only refreshing movies already in the catalog. TMDb daily export discovery also scans past TMDb IDs that are already present before returning export candidates.

The script also writes `src/data/generated/enrichment-manifest.json`. The manifest tracks successful TMDb enrichments, recent failures, retry cooldowns, and the current source fingerprint. Local reruns and scheduled runs use it to avoid redundant requests for fresh records.

Raw TMDb API responses are cached under `.movie-wizard-cache/tmdb` and are intentionally not committed. Use `--cache=read-only` to rebuild from local cached responses only, or `--cache=off` to force live API reads.

The enrichment script prints phase-by-phase status, candidate counts, and per-candidate progress. It auto-selects a terminal progress bar for interactive TTY runs and plain timestamped progress lines for CI or redirected logs.

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
- `--page-mode=sequential`: default; reads TMDb pages 1 through `--pages`.
- `--page-mode=random`: samples unique TMDb pages from 1 through `--page-max`.
- `--page-max=500`: caps the random page window. TMDb list/discover endpoints are capped at 500 pages.
- `--discover-sort=popularity`: default; keeps discover sorted by popularity.
- `--discover-sort=mixed`: randomly rotates discover pages through popularity, vote count, revenue, vote average, and recent-release sort lanes.
- `--progress=auto`: default; uses a terminal progress bar locally and plain progress lines in CI.
- `--progress=plain`: emits one-line progress updates that display cleanly in GitHub Actions logs.
- `--progress=bar`: forces the local terminal progress bar.
- `--no-progress`: suppresses progress output while keeping errors visible.

## Outputs

- `src/data/generated/movies.json`
- `src/data/generated/metadata.json`
- `src/data/generated/enrichment-manifest.json`

The generated movie records preserve the app-facing `Movie` shape while adding optional `tmdbId`, `imdbId`, `posterPath`, `backdropPath`, and source metadata.

## Scheduled Enrichment

`.github/workflows/enrich-movie-catalog.yml` runs daily and can also be started manually. It:

1. Installs dependencies with Bun.
2. Runs the TMDb enrichment script with randomized TMDb page windows, mixed discover sort lanes, daily export discovery, changed-record refresh, and stale-record refresh.
3. Runs `bun run lint` and `bun run build`.
4. Commits generated catalog changes only when `src/data/generated` changed and at least one new record was added.

The workflow forces `--progress=plain`, groups the enrichment log in GitHub Actions, skips refresh-only commits, and writes a markdown run summary to the Actions step summary when `GITHUB_STEP_SUMMARY` is available. Configure the repository secret `TMDB_READ_TOKEN` before enabling scheduled runs. Do not commit `.env.local` or API credentials.

## GitHub Pages Deployment

`.github/workflows/deploy-pages.yml` deploys the static Vite build to GitHub Pages on commits to `main` and manual runs. It also listens for successful `Enrich movie catalog` workflow completions, then checks out the latest `main` before building so scheduled catalog commits are published even though commits pushed with the default `GITHUB_TOKEN` do not start a second push-triggered Pages workflow.
