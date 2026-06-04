import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Movie } from "../../src/types";

type TmdbMovieSearchResult = {
  id: number;
  title?: string;
  original_title?: string;
  release_date?: string;
  adult?: boolean;
  popularity?: number;
  vote_count?: number;
};

type TmdbMovieDetails = {
  id: number;
  imdb_id?: string | null;
  title: string;
  original_title?: string;
  original_language?: string;
  release_date?: string;
  runtime?: number | null;
  genres?: Array<{ id: number; name: string }>;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
  credits?: {
    cast?: Array<{ name: string; order?: number }>;
    crew?: Array<{ name: string; job?: string }>;
  };
  keywords?: {
    keywords?: Array<{ name: string }>;
  };
  external_ids?: {
    imdb_id?: string | null;
  };
};

type ManifestEntry = {
  recordId: string;
  lastFetchedAt: string;
  sourceFingerprint: string;
  status: "ok";
};

type FailedEntry = {
  lastTriedAt: string;
  reason: string;
  retryAfter: string;
};

type EnrichmentManifest = {
  version: 1;
  generatedAt?: string;
  sourceFingerprint: string;
  tmdbIds: Record<string, ManifestEntry>;
  failedTmdbIds: Record<string, FailedEntry>;
};

type CliOptions = {
  limit: number;
  concurrency: number;
  retryDays: number;
  titles: string[];
  cacheMode: "read-write" | "read-only" | "off";
};

type BackfillResult =
  | { status: "updated"; movie: Movie; tmdbId: number; title: string }
  | { status: "unchanged"; movie: Movie; tmdbId?: number; title: string; reason: string }
  | { status: "failed"; movie: Movie; tmdbId?: number; title: string; reason: string };

const rootDir = process.cwd();
const generatedDir = path.join(rootDir, "src", "data", "generated");
const cacheDir = path.join(rootDir, ".movie-wizard-cache", "tmdb");
const moviesPath = path.join(generatedDir, "movies.json");
const manifestPath = path.join(generatedDir, "enrichment-manifest.json");
const metadataPath = path.join(generatedDir, "metadata.json");
const sourceFingerprint = "tmdb-v3:movie-details:credits,crew,external_ids,keywords:no-videos";

const genrePosterTones = new Map([
  ["Action", "from-orange-300 via-red-700 to-neutral-950"],
  ["Adventure", "from-yellow-200 via-sky-800 to-slate-950"],
  ["Animation", "from-sky-200 via-orange-400 to-stone-900"],
  ["Comedy", "from-amber-200 via-orange-600 to-neutral-950"],
  ["Crime", "from-cyan-300 via-blue-800 to-black"],
  ["Documentary", "from-stone-100 via-stone-500 to-neutral-950"],
  ["Drama", "from-stone-100 via-slate-600 to-neutral-950"],
  ["Horror", "from-red-300 via-stone-800 to-black"],
  ["Mystery", "from-violet-300 via-indigo-700 to-slate-950"],
  ["Romance", "from-orange-300 via-rose-600 to-stone-950"],
  ["Science Fiction", "from-teal-300 via-slate-700 to-black"],
  ["Thriller", "from-amber-200 via-stone-700 to-black"],
  ["War", "from-yellow-200 via-sky-800 to-slate-950"],
  ["Western", "from-yellow-200 via-orange-700 to-stone-950"],
]);

const runStats = {
  cacheHits: 0,
  tmdbRequests: 0,
  resolvedTmdbIds: 0,
  unchanged: 0,
  updated: 0,
  failed: 0,
};

async function main() {
  await loadEnvFiles([".env.local", ".env"]);

  const options = parseArgs(process.argv.slice(2));
  const token = process.env.TMDB_READ_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (!token && !apiKey) {
    throw new Error("Missing TMDB_READ_TOKEN or TMDB_API_KEY. Add one to .env.local.");
  }

  const movies = await readJson<Movie[]>(moviesPath);
  const manifest = await readManifest();
  const titleSet = new Set(options.titles.map((title) => title.toLowerCase()));
  const candidates = movies
    .filter((movie) => hasMissingNonTrailerMetadata(movie))
    .filter((movie) => titleSet.size === 0 || titleSet.has(movie.title.toLowerCase()))
    .sort(compareBackfillPriority)
    .slice(0, options.limit);

  console.log(`Local metadata backfill: ${candidates.length} candidates (${options.concurrency} concurrent, no trailers).`);

  const results = await mapConcurrent(candidates, options.concurrency, (movie) => backfillMovie(movie, options, token, apiKey));
  const nextById = new Map(results.map((result) => [result.movie.id, result.movie]));
  const nextMovies = movies.map((movie) => nextById.get(movie.id) ?? movie);
  const now = new Date().toISOString();

  for (const result of results) {
    if (result.status === "updated") {
      manifest.tmdbIds[String(result.tmdbId)] = {
        recordId: result.movie.id,
        lastFetchedAt: now,
        sourceFingerprint,
        status: "ok",
      };
      delete manifest.failedTmdbIds[String(result.tmdbId)];
      continue;
    }

    if (result.status === "failed" && result.tmdbId) {
      manifest.failedTmdbIds[String(result.tmdbId)] = {
        lastTriedAt: now,
        reason: result.reason,
        retryAfter: new Date(Date.now() + options.retryDays * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
  }

  manifest.generatedAt = now;
  await writeJson(moviesPath, nextMovies);
  await writeJson(manifestPath, manifest);

  const metadata = await readMetadata();
  metadata.localMetadataBackfillLastRun = now;
  metadata.localMetadataBackfillCandidates = candidates.length;
  metadata.localMetadataBackfillUpdated = runStats.updated;
  metadata.localMetadataBackfillUnchanged = runStats.unchanged;
  metadata.localMetadataBackfillFailures = runStats.failed;
  metadata.localMetadataBackfillResolvedTmdbIds = runStats.resolvedTmdbIds;
  metadata.localMetadataBackfillTmdbRequests = runStats.tmdbRequests;
  metadata.localMetadataBackfillCacheHits = runStats.cacheHits;
  metadata.localMetadataBackfillRemaining = nextMovies.filter(hasMissingNonTrailerMetadata).length;
  await writeJson(metadataPath, metadata);

  console.log(
    [
      `Local metadata backfill complete.`,
      `Updated: ${runStats.updated}`,
      `Unchanged: ${runStats.unchanged}`,
      `Failed: ${runStats.failed}`,
      `Resolved TMDb IDs: ${runStats.resolvedTmdbIds}`,
      `TMDb requests: ${runStats.tmdbRequests}`,
      `Cache hits: ${runStats.cacheHits}`,
      `Remaining: ${metadata.localMetadataBackfillRemaining}`,
    ].join(" "),
  );
}

async function backfillMovie(movie: Movie, options: CliOptions, token?: string, apiKey?: string): Promise<BackfillResult> {
  try {
    const tmdbId = movie.tmdbId ?? (await findTmdbId(movie, options, token, apiKey));
    if (!tmdbId) {
      runStats.unchanged += 1;
      return { status: "unchanged", movie, title: movie.title, reason: "No TMDb match found" };
    }

    if (!movie.tmdbId) {
      runStats.resolvedTmdbIds += 1;
    }

    const details = await tmdbFetch<TmdbMovieDetails>(
      `/movie/${tmdbId}`,
      { language: "en-US", append_to_response: "credits,external_ids,keywords" },
      options,
      token,
      apiKey,
    );

    const nextMovie = mergeMovieDetails(movie, details);
    const changed = JSON.stringify(nextMovie) !== JSON.stringify(movie);

    if (!changed) {
      runStats.unchanged += 1;
      return { status: "unchanged", movie, tmdbId, title: movie.title, reason: "Metadata already matched TMDb details" };
    }

    runStats.updated += 1;
    return { status: "updated", movie: nextMovie, tmdbId, title: nextMovie.title };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    runStats.failed += 1;
    return { status: "failed", movie, tmdbId: movie.tmdbId, title: movie.title, reason };
  }
}

function mergeMovieDetails(movie: Movie, details: TmdbMovieDetails): Movie {
  const year = parseYear(details.release_date) ?? movie.year;
  const genres = nonEmpty(unique((details.genres ?? []).map((genre) => genre.name)), movie.genres);
  const directors = nonEmpty(
    unique((details.credits?.crew ?? []).filter((person) => person.job === "Director").map((person) => person.name)).slice(0, 3),
    movie.directors,
  );
  const cast = nonEmpty(
    unique(
      (details.credits?.cast ?? [])
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        .map((person) => person.name),
    ).slice(0, 6),
    movie.cast,
  );
  const crew = nonEmpty(notableCrew(details.credits?.crew ?? [], directors), movie.crew ?? []);
  const keywordTags = unique((details.keywords?.keywords ?? []).map((keyword) => keyword.name).filter(isTagLike)).slice(0, 8);
  const tags = unique([...(movie.tags ?? []), ...keywordTags]).slice(0, 10);
  const runtimeMinutes = details.runtime ?? movie.runtimeMinutes;
  const criticalScore = details.vote_average === undefined ? movie.criticalScore : Math.round(details.vote_average * 10);

  return {
    ...movie,
    tmdbId: details.id,
    imdbId: details.external_ids?.imdb_id ?? details.imdb_id ?? movie.imdbId,
    title: details.title || movie.title,
    originalTitle: details.original_title && details.original_title !== details.title ? details.original_title : movie.originalTitle,
    originalLanguage: details.original_language ?? movie.originalLanguage ?? "en",
    year,
    releaseDate: details.release_date || movie.releaseDate,
    runtimeMinutes,
    genres,
    tags,
    directors,
    cast,
    crew,
    synopsis: details.overview || movie.synopsis,
    posterPath: details.poster_path ?? movie.posterPath,
    backdropPath: details.backdrop_path ?? movie.backdropPath,
    posterTone: toneForGenres(genres),
    popularity: normalizePopularity(details.popularity) ?? movie.popularity,
    criticalScore,
    trailerUrl: movie.trailerUrl,
    source: {
      ...movie.source,
      tmdbUpdatedAt: new Date().toISOString(),
      tmdbVoteAverage: details.vote_average,
      tmdbVoteCount: details.vote_count,
    },
  };
}

async function findTmdbId(movie: Movie, options: CliOptions, token?: string, apiKey?: string) {
  const response = await tmdbFetch<{ results?: TmdbMovieSearchResult[] }>(
    "/search/movie",
    {
      query: movie.title,
      year: movie.year > 0 ? String(movie.year) : "",
      include_adult: "false",
      language: "en-US",
    },
    options,
    token,
    apiKey,
  );

  const results = (response.results ?? []).filter((result) => !result.adult);
  const exactYear = results.find((result) => parseYear(result.release_date) === movie.year);
  if (exactYear) {
    return exactYear.id;
  }

  const normalizedTitle = normalizeTitle(movie.title);
  const exactTitle = results.find((result) => normalizeTitle(result.title ?? result.original_title ?? "") === normalizedTitle);
  return exactTitle?.id ?? results[0]?.id;
}

async function tmdbFetch<T>(pathname: string, params: Record<string, string>, options: CliOptions, token?: string, apiKey?: string): Promise<T> {
  const url = new URL(`https://api.themoviedb.org/3${pathname}`);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  if (apiKey && !token) {
    url.searchParams.set("api_key", apiKey);
  }

  const requestKey = cacheKeyForUrl(url);
  if (options.cacheMode !== "off") {
    const cached = await readTmdbCache<T>(requestKey);
    if (cached) {
      runStats.cacheHits += 1;
      return cached;
    }

    if (options.cacheMode === "read-only") {
      throw new Error(`TMDb cache miss in read-only mode: ${url.pathname}`);
    }
  }

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}`, accept: "application/json" } : { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`TMDb request failed ${response.status}: ${url.pathname}`);
  }

  runStats.tmdbRequests += 1;
  const data: T = await response.json();

  if (options.cacheMode === "read-write") {
    await writeTmdbCache(requestKey, data);
  }

  return data;
}

function hasMissingNonTrailerMetadata(movie: Movie) {
  return (
    !movie.tmdbId ||
    !movie.posterPath ||
    !movie.backdropPath ||
    !movie.synopsis ||
    movie.synopsis === "No synopsis is available yet." ||
    movie.synopsis.startsWith("Run the enrichment script") ||
    movie.genres.length === 0 ||
    movie.runtimeMinutes === 0 ||
    movie.cast.length === 0 ||
    movie.directors.length === 0 ||
    !movie.crew ||
    movie.crew.length === 0
  );
}

function compareBackfillPriority(a: Movie, b: Movie) {
  return backfillPriority(b) - backfillPriority(a) || b.popularity - a.popularity || a.title.localeCompare(b.title);
}

function backfillPriority(movie: Movie) {
  return [
    !movie.posterPath ? 50 : 0,
    !movie.tmdbId ? 40 : 0,
    !movie.backdropPath ? 20 : 0,
    !movie.crew || movie.crew.length === 0 ? 10 : 0,
    movie.cast.length === 0 ? 5 : 0,
    movie.directors.length === 0 ? 5 : 0,
    movie.runtimeMinutes === 0 ? 3 : 0,
    movie.genres.length === 0 ? 2 : 0,
  ].reduce((total, value) => total + value, 0);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    limit: Number.MAX_SAFE_INTEGER,
    concurrency: 8,
    retryDays: 7,
    titles: [],
    cacheMode: "read-write",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--limit") {
      options.limit = parsePositiveInteger(args[index + 1], options.limit);
      index += 1;
    } else if (arg.startsWith("--limit=")) {
      options.limit = parsePositiveInteger(arg.slice("--limit=".length), options.limit);
    } else if (arg === "--concurrency") {
      options.concurrency = parsePositiveInteger(args[index + 1], options.concurrency);
      index += 1;
    } else if (arg.startsWith("--concurrency=")) {
      options.concurrency = parsePositiveInteger(arg.slice("--concurrency=".length), options.concurrency);
    } else if (arg === "--titles") {
      options.titles = parseTitles(args[index + 1] ?? "");
      index += 1;
    } else if (arg.startsWith("--titles=")) {
      options.titles = parseTitles(arg.slice("--titles=".length));
    } else if (arg === "--cache") {
      options.cacheMode = parseCacheMode(args[index + 1] ?? options.cacheMode);
      index += 1;
    } else if (arg.startsWith("--cache=")) {
      options.cacheMode = parseCacheMode(arg.slice("--cache=".length));
    } else if (arg === "--retry-days") {
      options.retryDays = parsePositiveInteger(args[index + 1], options.retryDays);
      index += 1;
    } else if (arg.startsWith("--retry-days=")) {
      options.retryDays = parsePositiveInteger(arg.slice("--retry-days=".length), options.retryDays);
    }
  }

  return options;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseTitles(value: string) {
  return value
    .split(",")
    .map((title) => title.trim())
    .filter(Boolean);
}

function parseCacheMode(value: string): CliOptions["cacheMode"] {
  if (value === "read-only" || value === "off") {
    return value;
  }

  return "read-write";
}

async function mapConcurrent<T, U>(items: T[], concurrency: number, worker: (item: T) => Promise<U>) {
  const results: U[] = [];
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]);

      if ((index + 1) % 25 === 0 || index + 1 === items.length) {
        console.log(`Processed ${index + 1}/${items.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return results;
}

async function readManifest(): Promise<EnrichmentManifest> {
  try {
    const manifest = await readJson<EnrichmentManifest>(manifestPath);
    return {
      version: 1,
      sourceFingerprint: manifest.sourceFingerprint ?? sourceFingerprint,
      generatedAt: manifest.generatedAt,
      tmdbIds: manifest.tmdbIds ?? {},
      failedTmdbIds: manifest.failedTmdbIds ?? {},
    };
  } catch {
    return { version: 1, sourceFingerprint, tmdbIds: {}, failedTmdbIds: {} };
  }
}

async function readMetadata() {
  try {
    return await readJson<Record<string, unknown>>(metadataPath);
  } catch {
    return {};
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function loadEnvFiles(files: string[]) {
  for (const file of files) {
    const fullPath = path.join(rootDir, file);

    try {
      const raw = await readFile(fullPath, "utf8");

      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }

        const equalsIndex = trimmed.indexOf("=");
        if (equalsIndex === -1) {
          continue;
        }

        const key = trimmed.slice(0, equalsIndex).trim();
        const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");
        process.env[key] ??= value;
      }
    } catch {
      // Ignore missing env files.
    }
  }
}

function cacheKeyForUrl(url: URL) {
  const safeUrl = new URL(url);
  safeUrl.searchParams.delete("api_key");
  safeUrl.searchParams.sort();
  return createHash("sha256").update(safeUrl.toString()).digest("hex");
}

async function readTmdbCache<T>(requestKey: string) {
  try {
    const cachedData: T = JSON.parse(await readFile(path.join(cacheDir, `${requestKey}.json`), "utf8"));
    return cachedData;
  } catch {
    return undefined;
  }
}

async function writeTmdbCache(requestKey: string, data: unknown) {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(path.join(cacheDir, `${requestKey}.json`), `${JSON.stringify(data)}\n`);
}

function nonEmpty<T>(next: T[], fallback: T[]) {
  return next.length > 0 ? next : fallback;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function notableCrew(crew: Array<{ name: string; job?: string }>, directors: string[]) {
  const notableJobs = new Set([
    "Director",
    "Screenplay",
    "Writer",
    "Original Music Composer",
    "Director of Photography",
    "Editor",
    "Producer",
  ]);
  const seen = new Set<string>();

  return crew
    .filter((person) => person.name && person.job && notableJobs.has(person.job))
    .filter((person) => {
      const key = `${person.name}:${person.job}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((a, b) => crewJobRank(a.job ?? "", directors.includes(a.name)) - crewJobRank(b.job ?? "", directors.includes(b.name)))
    .slice(0, 10)
    .map((person) => ({ name: person.name, job: person.job ?? "Crew" }));
}

function crewJobRank(job: string, isDirector: boolean) {
  if (isDirector || job === "Director") {
    return 0;
  }

  switch (job) {
    case "Screenplay":
    case "Writer":
      return 1;
    case "Producer":
      return 2;
    case "Original Music Composer":
      return 3;
    case "Director of Photography":
      return 4;
    case "Editor":
      return 5;
    default:
      return 9;
  }
}

function isTagLike(value: string) {
  return value.length <= 28 && !/^\d+$/.test(value);
}

function toneForGenres(genres: string[]) {
  for (const genre of genres) {
    const tone = genrePosterTones.get(genre);
    if (tone) {
      return tone;
    }
  }
  return "from-stone-100 via-slate-600 to-neutral-950";
}

function normalizePopularity(value?: number) {
  if (!value) {
    return undefined;
  }

  return Math.max(1, Math.min(100, Math.round(value)));
}

function parseYear(date?: string | null) {
  if (!date) {
    return undefined;
  }

  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

await main();
