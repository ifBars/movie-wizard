import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Movie } from "../../src/types";

type TmdbVideo = {
  id: string;
  iso_639_1?: string;
  iso_3166_1?: string;
  key: string;
  name?: string;
  site?: string;
  size?: number;
  type?: string;
  official?: boolean;
  published_at?: string;
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
  videos?: {
    results?: TmdbVideo[];
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

const rootDir = process.cwd();
const moviesPath = path.join(rootDir, "src", "data", "generated", "movies.json");
const manifestPath = path.join(rootDir, "src", "data", "generated", "enrichment-manifest.json");
const metadataPath = path.join(rootDir, "src", "data", "generated", "metadata.json");
const sourceFingerprint = "tmdb-v3:movie-details:credits,crew,external_ids,keywords,videos";

const limit = parseLimit(process.argv.slice(2));

await main();

async function main() {
  await loadEnvFiles([".env.local", ".env"]);

  const token = process.env.TMDB_READ_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (!token && !apiKey) {
    throw new Error("Missing TMDB_READ_TOKEN or TMDB_API_KEY. Add one to .env.local.");
  }

  const movies: Movie[] = JSON.parse(await readFile(moviesPath, "utf8"));

  let manifest: EnrichmentManifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    manifest = { version: 1, sourceFingerprint, tmdbIds: {}, failedTmdbIds: {} };
  }

  const candidates = movies
    .filter((movie) => shouldRefresh(movie, manifest))
    .sort((a, b) => b.popularity - a.popularity);

  const batch = candidates.slice(0, limit);

  console.log(`Backfilling metadata for ${batch.length} of ${candidates.length} stale candidates.`);

  let updatedCount = 0;
  let failureCount = 0;
  let skippedCount = 0;
  const now = new Date().toISOString();

  for (const movie of batch) {
    try {
      const fresh = await fetchMovieDetails(movie, token, apiKey);

      if (!fresh) {
        skippedCount += 1;
        continue;
      }

      const next: Movie = {
        ...fresh,
        id: movie.id,
        plexFit: movie.plexFit ?? fresh.plexFit,
      };

      const existingTags = new Set(movie.tags ?? []);
      const newTags = fresh.tags.filter((tag) => !existingTags.has(tag));
      next.tags = unique([...(movie.tags ?? []), ...newTags]).slice(0, 10);

      const index = movies.findIndex((m) => m.id === movie.id);
      if (index !== -1) {
        movies[index] = next;
        updatedCount += 1;
      }

      manifest.tmdbIds[String(movie.tmdbId!)] = {
        recordId: next.id,
        lastFetchedAt: now,
        sourceFingerprint,
        status: "ok",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to refresh ${movie.title} (tmdb:${movie.tmdbId}):`, message);
      failureCount += 1;

      if (movie.tmdbId) {
        manifest.failedTmdbIds[String(movie.tmdbId)] = {
          lastTriedAt: now,
          reason: message,
          retryAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
    }
  }

  await writeFile(moviesPath, `${JSON.stringify(movies, null, 2)}\n`);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  } catch {
    // metadata may not exist
  }

  metadata.backfillLastRun = now;
  metadata.backfillUpdated = updatedCount;
  metadata.backfillFailures = failureCount;
  metadata.backfillSkipped = skippedCount;
  metadata.backfillRemaining = candidates.length - batch.length;
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

  console.log(
    `Backfill complete. Updated: ${updatedCount}, Failures: ${failureCount}, Skipped: ${skippedCount}, Remaining: ${metadata.backfillRemaining}`,
  );
}

function shouldRefresh(movie: Movie, manifest: EnrichmentManifest): boolean {
  if (!movie.tmdbId) {
    return false;
  }

  const failure = manifest.failedTmdbIds[String(movie.tmdbId)];
  if (failure && Date.parse(failure.retryAfter) > Date.now()) {
    return false;
  }

  const current = manifest.tmdbIds[String(movie.tmdbId)];
  if (current?.sourceFingerprint === sourceFingerprint) {
    return false;
  }

  return true;
}

async function fetchMovieDetails(movie: Movie, token?: string, apiKey?: string): Promise<Movie | null> {
  const details = await tmdbFetch<TmdbMovieDetails>(
    `/movie/${movie.tmdbId}`,
    { language: "en-US", append_to_response: "credits,external_ids,keywords,videos" },
    token,
    apiKey,
  );

  if (!details || !details.id) {
    return null;
  }

  const year = parseYear(details.release_date) ?? movie.year ?? 0;
  const genres = unique((details.genres ?? []).map((genre) => genre.name));
  const directors = unique(
    (details.credits?.crew ?? [])
      .filter((person) => person.job === "Director")
      .map((person) => person.name),
  ).slice(0, 3);
  const cast = unique(
    (details.credits?.cast ?? [])
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .map((person) => person.name),
  ).slice(0, 6);
  const crew = notableCrew(details.credits?.crew ?? [], directors);
  const keywordTags = unique((details.keywords?.keywords ?? []).map((keyword) => keyword.name).filter(isTagLike)).slice(0, 8);
  const tags = unique([...(movie.tags ?? []), ...keywordTags]).slice(0, 10);
  const runtimeMinutes = details.runtime ?? movie.runtimeMinutes ?? 0;
  const criticalScore = Math.round((details.vote_average ?? 0) * 10);

  return {
    id: movie.id,
    tmdbId: details.id,
    imdbId: details.external_ids?.imdb_id ?? details.imdb_id ?? movie.imdbId,
    title: details.title,
    originalTitle: details.original_title && details.original_title !== details.title ? details.original_title : undefined,
    originalLanguage: details.original_language ?? movie.originalLanguage ?? "en",
    year,
    releaseDate: details.release_date || undefined,
    runtimeMinutes,
    genres,
    tags,
    directors: directors.length > 0 ? directors : movie.directors,
    cast: cast.length > 0 ? cast : movie.cast,
    crew,
    synopsis: details.overview || movie.synopsis || "No synopsis is available yet.",
    posterPath: details.poster_path ?? movie.posterPath,
    backdropPath: details.backdrop_path ?? movie.backdropPath,
    posterTone: toneForGenres(genres),
    popularity: normalizePopularity(details.popularity),
    criticalScore,
    plexFit: movie.plexFit ?? fitLine(genres, runtimeMinutes, criticalScore),
    trailerUrl: extractTrailerUrl(details.videos?.results ?? []),
    source: {
      tmdbUpdatedAt: new Date().toISOString(),
      tmdbVoteAverage: details.vote_average,
      tmdbVoteCount: details.vote_count,
    },
  };
}

async function tmdbFetch<T>(pathname: string, params: Record<string, string>, token?: string, apiKey?: string): Promise<T> {
  const url = new URL(`https://api.themoviedb.org/3${pathname}`);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  if (apiKey && !token) {
    url.searchParams.set("api_key", apiKey);
  }

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}`, accept: "application/json" } : { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`TMDb request failed ${response.status}: ${url.pathname}`);
  }

  const data: T = await response.json();
  return data;
}

function parseLimit(args: string[]): number {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--limit" && args[index + 1]) {
      return Math.max(1, Number(args[index + 1]));
    }

    if (args[index].startsWith("--limit=")) {
      return Math.max(1, Number(args[index].slice("--limit=".length)));
    }
  }

  return 100;
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
      // ignore missing env files
    }
  }
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

function toneForGenres(genres: string[]) {
  for (const genre of genres) {
    const tone = genrePosterTones.get(genre);
    if (tone) {
      return tone;
    }
  }
  return "from-stone-100 via-slate-600 to-neutral-950";
}

function fitLine(genres: string[], runtimeMinutes: number, criticalScore: number) {
  const primaryGenre = genres[0] ?? "catalog";
  if (criticalScore >= 85) {
    return `A high-signal ${primaryGenre.toLowerCase()} pick for the recommendation shelf.`;
  }
  if (runtimeMinutes > 0 && runtimeMinutes <= 105) {
    return `A compact ${primaryGenre.toLowerCase()} option for easier weeknight discovery.`;
  }
  return `A useful ${primaryGenre.toLowerCase()} title for broadening the local catalog.`;
}

function extractTrailerUrl(videos: TmdbVideo[]): string | undefined {
  const trailers = videos.filter((video) => video.site === "YouTube" && video.type === "Trailer" && video.key);
  const official = trailers.find((video) => video.official);
  const chosen = official ?? trailers[0];

  if (chosen) {
    return `https://www.youtube-nocookie.com/embed/${chosen.key}`;
  }

  return undefined;
}

function normalizePopularity(value?: number) {
  if (!value) {
    return 1;
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
