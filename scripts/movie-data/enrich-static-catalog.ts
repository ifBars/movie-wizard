import { createReadStream } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { createGunzip } from "node:zlib";
import readline from "node:readline";

type SeedMovie = {
  tmdbId?: number;
  imdbId?: string;
  title: string;
  year?: number;
  tags?: string[];
  plexFit?: string;
  refresh?: boolean;
};

type MovieRecord = {
  id: string;
  tmdbId?: number;
  imdbId?: string;
  title: string;
  originalTitle?: string;
  originalLanguage: string;
  year: number;
  releaseDate?: string;
  runtimeMinutes: number;
  genres: string[];
  tags: string[];
  directors: string[];
  cast: string[];
  crew?: Array<{ name: string; job: string }>;
  synopsis: string;
  posterPath?: string;
  backdropPath?: string;
  posterTone: string;
  popularity: number;
  criticalScore: number;
  plexFit: string;
  trailerUrl?: string;
  source?: {
    tmdbUpdatedAt?: string;
    omdbUpdatedAt?: string;
    tmdbVoteAverage?: number;
    tmdbVoteCount?: number;
    omdbImdbRating?: number;
    omdbImdbVotes?: number;
    omdbMetascore?: number;
  };
};

type TmdbListItem = {
  id: number;
  title?: string;
  release_date?: string;
  popularity?: number;
  vote_count?: number;
  adult?: boolean;
  video?: boolean;
};

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

type OmdbMovie = {
  Response: "True" | "False";
  imdbRating?: string;
  imdbVotes?: string;
  Metascore?: string;
  Plot?: string;
  Director?: string;
  Actors?: string;
  Runtime?: string;
};

type CliOptions = {
  limit: number;
  pages: number;
  pageMode: "sequential" | "random";
  pageMax: number;
  discoverSort: "popularity" | "mixed";
  includeTmdbExport: boolean;
  includeOmdb: boolean;
  seedOnly: boolean;
  refreshStale: boolean;
  refreshChanges: boolean;
  staleDays: number;
  retryDays: number;
  refreshLimit: number;
  cacheMode: "read-write" | "read-only" | "off";
  progress: "auto" | "bar" | "plain" | "off";
};

type EnrichmentSummary = {
  output: string;
  records: number;
  existing: number;
  newRecords: number;
  refreshed: number;
  processed: number;
  accepted: number;
  rejected: number;
  tmdbRequests: number;
  tmdbCacheHits: number;
  skippedFresh: number;
  retryCooldownSkips: number;
  failures: number;
};

type ProgressReporter = ReturnType<typeof createProgressReporter>;

type EnrichmentManifest = {
  version: 1;
  generatedAt?: string;
  sourceFingerprint: string;
  tmdbIds: Record<
    string,
    {
      recordId: string;
      lastFetchedAt: string;
      sourceFingerprint: string;
      status: "ok";
    }
  >;
  failedTmdbIds: Record<
    string,
    {
      lastTriedAt: string;
      reason: string;
      retryAfter: string;
    }
  >;
};

const rootDir = process.cwd();
const seedPath = path.join(rootDir, "src", "data", "curated", "movies.seed.json");
const outputPath = path.join(rootDir, "src", "data", "generated", "movies.json");
const metadataPath = path.join(rootDir, "src", "data", "generated", "metadata.json");
const manifestPath = path.join(rootDir, "src", "data", "generated", "enrichment-manifest.json");
const cacheDir = path.join(rootDir, ".movie-wizard-cache", "tmdb");
const sourceFingerprint = "tmdb-v3:movie-details:credits,crew,external_ids,keywords,videos";
const requestKeysThisRun = new Set<string>();
const runStats = {
  tmdbCacheHits: 0,
  tmdbRequests: 0,
  tmdbSkippedFresh: 0,
  tmdbSkippedRetryCooldown: 0,
  tmdbFailures: 0,
  refreshedRecordCount: 0,
  processedCandidateCount: 0,
  acceptedRecordCount: 0,
  rejectedRecordCount: 0,
};

function hasErrorCode(error: unknown, code: string) {
  return error instanceof Error && "code" in error && error.code === code;
}

function createProgressReporter(options: CliOptions) {
  const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
  const isTty = Boolean(process.stdout.isTTY);
  const mode = options.progress === "auto" ? (isGitHubActions || !isTty ? "plain" : "bar") : options.progress;
  const startedAt = Date.now();
  let lastProgressAt = 0;
  let lastProgressPercent = -1;
  let hasOpenBar = false;

  const writeLine = (message: string) => {
    if (mode === "off") {
      return;
    }

    if (hasOpenBar) {
      process.stdout.write("\n");
      hasOpenBar = false;
    }

    console.log(message);
  };

  const elapsed = () => `${Math.round((Date.now() - startedAt) / 1000)}s`;

  return {
    group(label: string) {
      if (mode === "off") {
        return;
      }

      if (isGitHubActions) {
        console.log(`::group::${escapeGitHubCommand(label)}`);
        return;
      }

      writeLine(label);
    },
    endGroup() {
      if (mode === "off") {
        return;
      }

      if (hasOpenBar) {
        process.stdout.write("\n");
        hasOpenBar = false;
      }

      if (isGitHubActions) {
        console.log("::endgroup::");
      }
    },
    phase(label: string) {
      writeLine(`[${elapsed()}] ${label}`);
    },
    info(message: string, details?: Record<string, string>) {
      const suffix = details ? ` (${Object.entries(details).map(([key, value]) => `${key}: ${value}`).join(", ")})` : "";
      writeLine(`[${elapsed()}] ${message}${suffix}`);
    },
    progress(current: number, total: number, label: string) {
      if (mode === "off" || total === 0) {
        return;
      }

      const percent = Math.floor((current / total) * 100);
      const now = Date.now();
      const shouldPrint = current === 0 || current >= total || percent !== lastProgressPercent || now - lastProgressAt >= 5000;

      if (!shouldPrint) {
        return;
      }

      lastProgressAt = now;
      lastProgressPercent = percent;

      if (mode === "bar") {
        const width = 28;
        const filled = Math.round((percent / 100) * width);
        const bar = `${"#".repeat(filled)}${"-".repeat(width - filled)}`;
        process.stdout.write(`\r[${bar}] ${percent}% ${current}/${total} ${truncate(label, 48)}`);
        hasOpenBar = true;
        return;
      }

      writeLine(`[${elapsed()}] Progress ${percent}% (${current}/${total}) - ${truncate(label, 72)}`);
    },
    finishProgress(current: number, total: number) {
      if (mode === "bar" && hasOpenBar) {
        const safeTotal = total === 0 ? current : total;
        const percent = safeTotal === 0 ? 100 : Math.floor((current / safeTotal) * 100);
        const width = 28;
        const filled = Math.round((percent / 100) * width);
        process.stdout.write(`\r[${"#".repeat(filled)}${"-".repeat(width - filled)}] ${percent}% ${current}/${safeTotal}\n`);
        hasOpenBar = false;
      }
    },
    async summary(summary: EnrichmentSummary) {
      writeLine(
        [
          `Wrote ${summary.records} movies to ${summary.output}`,
          `${summary.newRecords} new`,
          `${summary.refreshed} refreshed`,
          `${summary.existing} existing`,
          `${summary.tmdbRequests} TMDb requests`,
          `${summary.tmdbCacheHits} cache hits`,
          `${summary.failures} failures`,
        ].join(" | "),
      );

      if (isGitHubActions && summary.failures > 0) {
        console.log(`::warning::${escapeGitHubCommand(`${summary.failures} TMDb enrichment requests failed; failed IDs were kept in the enrichment manifest for retry cooldowns.`)}`);
      }

      const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY;
      if (!stepSummaryPath) {
        return;
      }

      await appendFile(
        stepSummaryPath,
        [
          "## Movie catalog enrichment",
          "",
          `- Output: \`${summary.output}\``,
          `- Records: ${summary.records} (${summary.newRecords} new, ${summary.refreshed} refreshed, ${summary.existing} existing)`,
          `- Candidates: ${summary.processed} processed, ${summary.accepted} accepted, ${summary.rejected} rejected`,
          `- TMDb: ${summary.tmdbRequests} live requests, ${summary.tmdbCacheHits} cache hits`,
          `- Skips: ${summary.skippedFresh} fresh records, ${summary.retryCooldownSkips} retry cooldowns`,
          `- Failures: ${summary.failures}`,
          "",
        ].join("\n"),
      );
    },
  };
}

function escapeGitHubCommand(value: string) {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
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

async function main() {
  await loadEnvFiles([".env.local", ".env"]);

  const options = parseArgs(process.argv.slice(2));
  const reporter = createProgressReporter(options);
  const tmdbToken = process.env.TMDB_READ_TOKEN;
  const tmdbApiKey = process.env.TMDB_API_KEY;
  const omdbApiKey = process.env.OMDB_API_KEY;

  if (!tmdbToken && !tmdbApiKey && !options.seedOnly) {
    throw new Error(
      "Missing TMDB_READ_TOKEN or TMDB_API_KEY. Add one to .env.local, or run with --seed-only to emit curated seeds only.",
    );
  }

  reporter.group("Movie catalog enrichment");
  reporter.info("Starting enrichment", {
    limit: String(options.limit),
    pages: String(options.pages),
    pageMode: options.pageMode,
    pageMax: String(options.pageMax),
    discoverSort: options.discoverSort,
    mode: options.seedOnly ? "seed-only" : "tmdb",
    cache: options.cacheMode,
    omdb: options.includeOmdb && Boolean(omdbApiKey) ? "enabled" : "disabled",
  });

  reporter.phase("Loading seeds and existing catalog");
  const seeds = await readJson<SeedMovie[]>(seedPath);
  const existingRecords = options.seedOnly ? [] : await readExistingRecords(outputPath);
  const manifest = options.seedOnly ? createManifest() : await readManifest(existingRecords);
  const existingKeys = new Set(existingRecords.flatMap(recordKeys));
  const candidates = new Map<number | string, SeedMovie>();
  reporter.info(`Loaded ${seeds.length} curated seeds and ${existingRecords.length} existing generated records.`);

  for (const seed of seeds) {
    candidates.set(seed.tmdbId ?? seed.imdbId ?? seedKey(seed), seed);
  }

  if (!options.seedOnly) {
    reporter.phase(`Fetching TMDb popular pages (${options.pages})`);
    for (const movie of await fetchTmdbList("/movie/popular", options.pages, options, tmdbToken, tmdbApiKey, reporter)) {
      if (isUsefulListItem(movie)) {
        candidates.set(movie.id, { tmdbId: movie.id, title: movie.title ?? `tmdb-${movie.id}`, year: parseYear(movie.release_date) });
      }
    }
    reporter.info(`Candidate pool after popular titles: ${candidates.size}`);

    reporter.phase(`Fetching TMDb top-rated pages (${options.pages})`);
    for (const movie of await fetchTmdbList("/movie/top_rated", options.pages, options, tmdbToken, tmdbApiKey, reporter)) {
      if (isUsefulListItem(movie)) {
        candidates.set(movie.id, { tmdbId: movie.id, title: movie.title ?? `tmdb-${movie.id}`, year: parseYear(movie.release_date) });
      }
    }
    reporter.info(`Candidate pool after top-rated titles: ${candidates.size}`);

    reporter.phase(`Fetching TMDb discover pages (${options.pages})`);
    for (const movie of await fetchTmdbDiscover(options.pages, options, tmdbToken, tmdbApiKey, reporter)) {
      candidates.set(movie.id, { tmdbId: movie.id, title: movie.title ?? `tmdb-${movie.id}`, year: parseYear(movie.release_date) });
    }
    reporter.info(`Candidate pool after discover titles: ${candidates.size}`);

    if (options.includeTmdbExport) {
      reporter.phase("Reading recent TMDb daily export IDs");
      const exportReadLimit = Math.min(20000, Math.max(options.limit, options.limit * 4));
      const excludedExportKeys = new Set([...existingKeys, ...Array.from(candidates.keys()).map((key) => `tmdb:${key}`)]);
      for (const movie of await fetchRecentTmdbExportIds(exportReadLimit, excludedExportKeys)) {
        candidates.set(movie.id, { tmdbId: movie.id, title: movie.title ?? `tmdb-${movie.id}` });
      }
      reporter.info(`Candidate pool after daily export IDs: ${candidates.size}`);
    }

    if (options.refreshChanges) {
      reporter.phase("Checking TMDb changed movie IDs");
      for (const movie of await fetchChangedTmdbIds(options, tmdbToken, tmdbApiKey)) {
        const existing = existingRecords.find((record) => record.tmdbId === movie.id);
        if (existing) {
          candidates.set(`refresh:${movie.id}`, { tmdbId: movie.id, title: existing.title, year: existing.year, refresh: true });
        }
      }
      reporter.info(`Candidate pool after changed-record refresh checks: ${candidates.size}`);
    }

    if (options.refreshStale) {
      reporter.phase(`Selecting stale records older than ${options.staleDays} days`);
      const staleRecords = existingRecords
        .filter((record) => record.tmdbId && shouldRefreshRecord(record, manifest, options.staleDays))
        .slice(0, options.refreshLimit);

      for (const record of staleRecords) {
        candidates.set(`refresh:${record.tmdbId}`, { tmdbId: record.tmdbId, title: record.title, year: record.year, refresh: true });
      }
      reporter.info(`Queued ${staleRecords.length} stale refresh candidates.`);
    }
  }

  const newRecords: MovieRecord[] = [];
  const processableCandidates = Array.from(candidates.values()).filter((seed) => shouldProcessCandidate(seed, existingKeys, manifest, options));
  const newCandidates = processableCandidates.filter((seed) => !isRefreshCandidate(seed, existingKeys)).slice(0, Math.max(options.limit * 2, options.limit));
  const refreshCandidates = processableCandidates.filter((seed) => isRefreshCandidate(seed, existingKeys)).slice(0, options.refreshLimit);
  const values = [...newCandidates, ...refreshCandidates];
  const targetExistingKeys = new Set(existingRecords.flatMap(recordKeys));
  reporter.phase(`Enriching ${values.length} processable candidates (${newCandidates.length} new candidates, ${refreshCandidates.length} refresh candidates)`);
  reporter.progress(0, values.length, "Ready");

  for (const seed of values) {
    runStats.processedCandidateCount += 1;
    const refreshCandidate = isRefreshCandidate(seed, existingKeys);
    const record = options.seedOnly ? recordFromSeed(seed) : await recordFromTmdb(seed, manifest, options, tmdbToken, tmdbApiKey, options.includeOmdb ? omdbApiKey : undefined);

    if (record && isUsefulRecord(record) && (refreshCandidate || !recordKeys(record).some((key) => existingKeys.has(key)))) {
      newRecords.push(record);
      runStats.acceptedRecordCount += 1;
      for (const key of recordKeys(record)) {
        existingKeys.add(key);
      }

      if (refreshCandidate) {
        runStats.refreshedRecordCount += 1;
      }
    } else {
      runStats.rejectedRecordCount += 1;
    }

    reporter.progress(runStats.processedCandidateCount, values.length, record ? record.title : seed.title);

    if (!refreshCandidate && newRecords.filter((record) => !hasKnownRecord(record, targetExistingKeys)).length >= options.limit) {
      break;
    }
  }
  reporter.finishProgress(runStats.processedCandidateCount, values.length);

  const records = dedupeRecords([...existingRecords, ...newRecords]);
  records.sort((a, b) => b.popularity - a.popularity || b.criticalScore - a.criticalScore || a.title.localeCompare(b.title));

  reporter.phase("Writing generated catalog files");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(records, null, 2)}\n`);
  await writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        recordCount: records.length,
        addedRecordCount: records.length - existingRecords.length,
        existingRecordCount: existingRecords.length,
        refreshedRecordCount: runStats.refreshedRecordCount,
        processedCandidateCount: runStats.processedCandidateCount,
        acceptedRecordCount: runStats.acceptedRecordCount,
        rejectedRecordCount: runStats.rejectedRecordCount,
        tmdbRequests: runStats.tmdbRequests,
        tmdbCacheHits: runStats.tmdbCacheHits,
        tmdbSkippedFresh: runStats.tmdbSkippedFresh,
        tmdbSkippedRetryCooldown: runStats.tmdbSkippedRetryCooldown,
        tmdbFailures: runStats.tmdbFailures,
        sources: {
          curatedSeeds: seeds.length,
          tmdb: !options.seedOnly,
          tmdbDailyExport: options.includeTmdbExport,
          omdb: options.includeOmdb && Boolean(omdbApiKey),
        },
      },
      null,
      2,
    )}\n`,
  );
  manifest.generatedAt = new Date().toISOString();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  await reporter.summary({
    output: path.relative(rootDir, outputPath),
    records: records.length,
    existing: existingRecords.length,
    newRecords: records.length - existingRecords.length,
    refreshed: runStats.refreshedRecordCount,
    processed: runStats.processedCandidateCount,
    accepted: runStats.acceptedRecordCount,
    rejected: runStats.rejectedRecordCount,
    tmdbRequests: runStats.tmdbRequests,
    tmdbCacheHits: runStats.tmdbCacheHits,
    skippedFresh: runStats.tmdbSkippedFresh,
    retryCooldownSkips: runStats.tmdbSkippedRetryCooldown,
    failures: runStats.tmdbFailures,
  });
  reporter.endGroup();
}

function parseArgs(args: string[]): CliOptions {
  const fallbackLimit = Number(process.env.MOVIE_WIZARD_DATA_LIMIT ?? 250);
  const options: CliOptions = {
    limit: Number.isFinite(fallbackLimit) ? fallbackLimit : 250,
    pages: 3,
    pageMode: "sequential",
    pageMax: 500,
    discoverSort: "popularity",
    includeTmdbExport: false,
    includeOmdb: false,
    seedOnly: false,
    refreshStale: false,
    refreshChanges: false,
    staleDays: 90,
    retryDays: 7,
    refreshLimit: 100,
    cacheMode: "read-write",
    progress: "auto",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--limit") {
      options.limit = Number(args[index + 1] ?? options.limit);
      index += 1;
    } else if (arg.startsWith("--limit=")) {
      options.limit = Number(arg.slice("--limit=".length));
    } else if (arg === "--pages") {
      options.pages = Number(args[index + 1] ?? options.pages);
      index += 1;
    } else if (arg.startsWith("--pages=")) {
      options.pages = Number(arg.slice("--pages=".length));
    } else if (arg === "--page-mode") {
      options.pageMode = parsePageMode(args[index + 1] ?? options.pageMode);
      index += 1;
    } else if (arg.startsWith("--page-mode=")) {
      options.pageMode = parsePageMode(arg.slice("--page-mode=".length));
    } else if (arg === "--page-max") {
      options.pageMax = Number(args[index + 1] ?? options.pageMax);
      index += 1;
    } else if (arg.startsWith("--page-max=")) {
      options.pageMax = Number(arg.slice("--page-max=".length));
    } else if (arg === "--discover-sort") {
      options.discoverSort = parseDiscoverSort(args[index + 1] ?? options.discoverSort);
      index += 1;
    } else if (arg.startsWith("--discover-sort=")) {
      options.discoverSort = parseDiscoverSort(arg.slice("--discover-sort=".length));
    } else if (arg === "--include-tmdb-export") {
      options.includeTmdbExport = true;
    } else if (arg === "--include-omdb") {
      options.includeOmdb = true;
    } else if (arg === "--no-omdb") {
      options.includeOmdb = false;
    } else if (arg === "--seed-only") {
      options.seedOnly = true;
    } else if (arg === "--refresh-stale") {
      options.refreshStale = true;
    } else if (arg === "--refresh-changes") {
      options.refreshChanges = true;
    } else if (arg === "--stale-days") {
      options.staleDays = Number(args[index + 1] ?? options.staleDays);
      index += 1;
    } else if (arg.startsWith("--stale-days=")) {
      options.staleDays = Number(arg.slice("--stale-days=".length));
    } else if (arg === "--retry-days") {
      options.retryDays = Number(args[index + 1] ?? options.retryDays);
      index += 1;
    } else if (arg.startsWith("--retry-days=")) {
      options.retryDays = Number(arg.slice("--retry-days=".length));
    } else if (arg === "--refresh-limit") {
      options.refreshLimit = Number(args[index + 1] ?? options.refreshLimit);
      index += 1;
    } else if (arg.startsWith("--refresh-limit=")) {
      options.refreshLimit = Number(arg.slice("--refresh-limit=".length));
    } else if (arg === "--cache") {
      options.cacheMode = parseCacheMode(args[index + 1] ?? options.cacheMode);
      index += 1;
    } else if (arg.startsWith("--cache=")) {
      options.cacheMode = parseCacheMode(arg.slice("--cache=".length));
    } else if (arg === "--progress") {
      options.progress = parseProgressMode(args[index + 1] ?? options.progress);
      index += 1;
    } else if (arg.startsWith("--progress=")) {
      options.progress = parseProgressMode(arg.slice("--progress=".length));
    } else if (arg === "--no-progress") {
      options.progress = "off";
    }
  }

  options.limit = Math.max(1, Math.min(options.limit, 20000));
  options.pages = Math.max(1, Math.min(options.pages, 500));
  options.pageMax = Math.max(options.pages, Math.min(options.pageMax, 500));
  options.staleDays = Math.max(1, Math.min(options.staleDays, 3650));
  options.retryDays = Math.max(1, Math.min(options.retryDays, 365));
  options.refreshLimit = Math.max(0, Math.min(options.refreshLimit, 20000));
  return options;
}

function parseCacheMode(value: string): CliOptions["cacheMode"] {
  if (value === "read-only" || value === "off") {
    return value;
  }
  return "read-write";
}

function parsePageMode(value: string): CliOptions["pageMode"] {
  if (value === "random") {
    return value;
  }
  return "sequential";
}

function parseDiscoverSort(value: string): CliOptions["discoverSort"] {
  if (value === "mixed") {
    return value;
  }
  return "popularity";
}

function parseProgressMode(value: string): CliOptions["progress"] {
  if (value === "bar" || value === "plain" || value === "off") {
    return value;
  }
  return "auto";
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
    } catch (error) {
      if (!hasErrorCode(error, "ENOENT")) {
        throw error;
      }
    }
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readExistingRecords(filePath: string) {
  try {
    const records = await readJson<MovieRecord[]>(filePath);
    return dedupeRecords(records.filter(isUsefulRecord));
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return [];
    }
    throw error;
  }
}

async function readManifest(existingRecords: MovieRecord[]) {
  try {
    const manifest = await readJson<EnrichmentManifest>(manifestPath);
    return normalizeManifest(manifest, existingRecords);
  } catch (error) {
    if (!hasErrorCode(error, "ENOENT")) {
      throw error;
    }
    return normalizeManifest(createManifest(), existingRecords);
  }
}

function createManifest(): EnrichmentManifest {
  return {
    version: 1,
    sourceFingerprint,
    tmdbIds: {},
    failedTmdbIds: {},
  };
}

function normalizeManifest(manifest: EnrichmentManifest, existingRecords: MovieRecord[]) {
  const normalized = manifest.version === 1 ? manifest : createManifest();
  normalized.sourceFingerprint = sourceFingerprint;
  normalized.tmdbIds ??= {};
  normalized.failedTmdbIds ??= {};

  for (const record of existingRecords) {
    if (!record.tmdbId || !record.source?.tmdbUpdatedAt) {
      continue;
    }

    normalized.tmdbIds[String(record.tmdbId)] ??= {
      recordId: record.id,
      lastFetchedAt: record.source.tmdbUpdatedAt,
      sourceFingerprint,
      status: "ok",
    };
  }

  return normalized;
}

function hasKnownRecord(seed: SeedMovie, existingKeys: Set<string>) {
  return candidateKeys(seed).some((key) => existingKeys.has(key));
}

function shouldProcessCandidate(seed: SeedMovie, existingKeys: Set<string>, manifest: EnrichmentManifest, options: CliOptions) {
  if (options.seedOnly) {
    return !hasKnownRecord(seed, existingKeys);
  }

  if (isRefreshCandidate(seed, existingKeys)) {
    return shouldFetchTmdbId(seed.tmdbId, manifest, options, true);
  }

  if (hasKnownRecord(seed, existingKeys)) {
    runStats.tmdbSkippedFresh += 1;
    return false;
  }

  return shouldFetchTmdbId(seed.tmdbId, manifest, options, false);
}

function isRefreshCandidate(seed: SeedMovie, existingKeys: Set<string>) {
  return Boolean(seed.refresh && seed.tmdbId && existingKeys.has(`tmdb:${seed.tmdbId}`));
}

function shouldFetchTmdbId(tmdbId: number | undefined, manifest: EnrichmentManifest, options: CliOptions, isRefresh: boolean) {
  if (!tmdbId) {
    return true;
  }

  const failure = manifest.failedTmdbIds[String(tmdbId)];
  if (failure && Date.parse(failure.retryAfter) > Date.now()) {
    runStats.tmdbSkippedRetryCooldown += 1;
    return false;
  }

  const current = manifest.tmdbIds[String(tmdbId)];
  if (!isRefresh && current?.sourceFingerprint === sourceFingerprint && !isStale(current.lastFetchedAt, options.staleDays)) {
    runStats.tmdbSkippedFresh += 1;
    return false;
  }

  return true;
}

function shouldRefreshRecord(record: MovieRecord, manifest: EnrichmentManifest, staleDays: number) {
  if (!record.tmdbId) {
    return false;
  }

  const current = manifest.tmdbIds[String(record.tmdbId)];
  return !current || current.sourceFingerprint !== sourceFingerprint || isStale(current.lastFetchedAt, staleDays);
}

function isStale(date: string, staleDays: number) {
  return Date.now() - Date.parse(date) >= staleDays * 24 * 60 * 60 * 1000;
}

function candidateKeys(seed: SeedMovie) {
  return [
    seed.tmdbId ? `tmdb:${seed.tmdbId}` : undefined,
    seed.imdbId ? `imdb:${seed.imdbId}` : undefined,
    `seed:${seedKey(seed)}`,
  ].filter((key): key is string => Boolean(key));
}

function recordKeys(record: MovieRecord) {
  return [
    record.tmdbId ? `tmdb:${record.tmdbId}` : undefined,
    record.imdbId ? `imdb:${record.imdbId}` : undefined,
    `id:${record.id}`,
    `seed:${seedKey(record)}`,
  ].filter((key): key is string => Boolean(key));
}

function dedupeRecords(records: MovieRecord[]) {
  const deduped: MovieRecord[] = [];
  const keyToIndex = new Map<string, number>();

  for (const record of records) {
    const keys = recordKeys(record);
    const existingIndex = keys.map((key) => keyToIndex.get(key)).find((index): index is number => index !== undefined);

    if (existingIndex === undefined) {
      const index = deduped.push(record) - 1;
      for (const key of keys) {
        keyToIndex.set(key, index);
      }
      continue;
    }

    deduped[existingIndex] = preferRecord(deduped[existingIndex], record);
    for (const key of recordKeys(deduped[existingIndex])) {
      keyToIndex.set(key, existingIndex);
    }
  }

  return deduped;
}

function preferRecord(current: MovieRecord, candidate: MovieRecord) {
  const candidateScore = recordCompletenessScore(candidate);
  const currentScore = recordCompletenessScore(current);
  if (candidateScore > currentScore) {
    return candidate;
  }

  if (candidateScore === currentScore && sourceUpdatedAt(candidate) > sourceUpdatedAt(current)) {
    return candidate;
  }

  return current;
}

function sourceUpdatedAt(record: MovieRecord) {
  return Date.parse(record.source?.tmdbUpdatedAt ?? record.source?.omdbUpdatedAt ?? "") || 0;
}

function recordCompletenessScore(record: MovieRecord) {
  return [
    record.source ? 20 : 0,
    record.tmdbId ? 10 : 0,
    record.imdbId ? 8 : 0,
    record.posterPath ? 6 : 0,
    record.backdropPath ? 4 : 0,
    record.runtimeMinutes > 0 ? 3 : 0,
    record.synopsis && !record.synopsis.startsWith("Run the enrichment script") ? 3 : 0,
    record.genres.length,
    record.tags.length,
    record.directors.length,
    record.cast.length,
    record.crew?.length ?? 0,
  ].reduce((total, value) => total + value, 0);
}

function pageSample(options: CliOptions) {
  if (options.pageMode === "sequential") {
    return Array.from({ length: options.pages }, (_, index) => index + 1);
  }

  const pages = new Set<number>();
  while (pages.size < options.pages) {
    pages.add(1 + Math.floor(Math.random() * options.pageMax));
  }
  return Array.from(pages).sort((a, b) => a - b);
}

function discoverParamsForPage(options: CliOptions, page: number) {
  const baseParams = {
    page: String(page),
    language: "en-US",
    include_adult: "false",
    include_video: "false",
  };

  const sortOptions = [
    { sort_by: "popularity.desc", "vote_count.gte": "100" },
    { sort_by: "vote_count.desc", "vote_count.gte": "100" },
    { sort_by: "revenue.desc", "vote_count.gte": "100" },
    { sort_by: "vote_average.desc", "vote_count.gte": "500" },
    { sort_by: "primary_release_date.desc", "vote_count.gte": "50" },
  ];
  const sortParams = options.discoverSort === "mixed" ? sortOptions[Math.floor(Math.random() * sortOptions.length)] : sortOptions[0];

  return { ...baseParams, ...sortParams };
}

async function fetchTmdbList(pathname: string, pages: number, options: CliOptions, token?: string, apiKey?: string, reporter?: ProgressReporter) {
  const movies: TmdbListItem[] = [];
  const selectedPages = pageSample(options);
  reporter?.info(`${pathname} selected pages: ${selectedPages.join(", ")}`);
  for (let index = 0; index < selectedPages.length; index += 1) {
    const page = selectedPages[index];
    const response = await tmdbFetch<{ results?: TmdbListItem[] }>(pathname, { page: String(page), language: "en-US" }, options, token, apiKey);
    movies.push(...(response.results ?? []));
    reporter?.progress(index + 1, pages, `${pathname} page ${page}`);
  }
  return movies;
}

async function fetchTmdbDiscover(pages: number, options: CliOptions, token?: string, apiKey?: string, reporter?: ProgressReporter) {
  const movies: TmdbListItem[] = [];
  const selectedPages = pageSample(options);
  reporter?.info(`/discover/movie selected pages: ${selectedPages.join(", ")}`);
  for (let index = 0; index < selectedPages.length; index += 1) {
    const page = selectedPages[index];
    const params = discoverParamsForPage(options, page);
    const response = await tmdbFetch<{ results?: TmdbListItem[] }>("/discover/movie", params, options, token, apiKey);
    movies.push(...(response.results ?? []));
    reporter?.progress(index + 1, pages, `/discover/movie page ${page} ${params.sort_by}`);
  }
  return movies;
}

async function fetchChangedTmdbIds(options: CliOptions, token?: string, apiKey?: string) {
  const movies: TmdbListItem[] = [];
  const response = await tmdbFetch<{ results?: TmdbListItem[]; total_pages?: number }>(
    "/movie/changes",
    {
      page: "1",
    },
    options,
    token,
    apiKey,
  );
  movies.push(...(response.results ?? []));
  return movies.filter((movie) => !movie.adult);
}

async function fetchRecentTmdbExportIds(limit: number, excludedKeys: Set<string>) {
  const today = new Date();

  for (let daysBack = 0; daysBack < 7; daysBack += 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - daysBack);
    const fileName = `movie_ids_${String(date.getUTCMonth() + 1).padStart(2, "0")}_${String(date.getUTCDate()).padStart(2, "0")}_${date.getUTCFullYear()}.json.gz`;
    const url = `https://files.tmdb.org/p/exports/${fileName}`;
    const tempPath = path.join(rootDir, ".movie-wizard-cache", fileName);

    try {
      await mkdir(path.dirname(tempPath), { recursive: true });
      const response = await fetch(url);
      if (!response.ok || !response.body) {
        continue;
      }

      await writeFile(tempPath, Buffer.from(await response.arrayBuffer()));
      return await readTmdbExport(tempPath, limit, excludedKeys);
    } catch {
      continue;
    }
  }

  return [];
}

async function readTmdbExport(filePath: string, limit: number, excludedKeys: Set<string>) {
  const movies: TmdbListItem[] = [];
  const stream = createReadStream(filePath).pipe(createGunzip());
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    if (movies.length >= limit) {
      break;
    }

    const item: TmdbListItem = JSON.parse(line);
    if (isUsefulListItem(item) && !excludedKeys.has(`tmdb:${item.id}`)) {
      movies.push(item);
      excludedKeys.add(`tmdb:${item.id}`);
    }
  }

  return movies;
}

async function recordFromTmdb(seed: SeedMovie, manifest: EnrichmentManifest, options: CliOptions, token?: string, apiKey?: string, omdbApiKey?: string): Promise<MovieRecord | null> {
  const tmdbId = seed.tmdbId ?? (await findTmdbId(seed, options, token, apiKey));
  if (!tmdbId) {
    return recordFromSeed(seed);
  }

  let details: TmdbMovieDetails;
  const fetchedAt = new Date().toISOString();
  try {
    details = await tmdbFetch<TmdbMovieDetails>(
      `/movie/${tmdbId}`,
      { language: "en-US", append_to_response: "credits,external_ids,keywords,videos" },
      options,
      token,
      apiKey,
    );
  } catch (error) {
    manifest.failedTmdbIds[String(tmdbId)] = {
      lastTriedAt: fetchedAt,
      reason: error instanceof Error ? error.message : "Unknown TMDb request failure",
      retryAfter: new Date(Date.now() + options.retryDays * 24 * 60 * 60 * 1000).toISOString(),
    };
    runStats.tmdbFailures += 1;
    return null;
  }

  delete manifest.failedTmdbIds[String(tmdbId)];
  const imdbId = details.external_ids?.imdb_id ?? details.imdb_id ?? seed.imdbId;
  const omdb = imdbId && omdbApiKey ? await fetchOmdb(imdbId, omdbApiKey) : undefined;
  const year = parseYear(details.release_date) ?? seed.year ?? 0;
  const genres = unique((details.genres ?? []).map((genre) => genre.name));
  const directors = unique((details.credits?.crew ?? []).filter((person) => person.job === "Director").map((person) => person.name)).slice(0, 3);
  const cast = unique((details.credits?.cast ?? []).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)).map((person) => person.name)).slice(0, 6);
  const crew = notableCrew(details.credits?.crew ?? [], directors);
  const keywordTags = unique((details.keywords?.keywords ?? []).map((keyword) => keyword.name).filter(isTagLike)).slice(0, 8);
  const tags = unique([...(seed.tags ?? []), ...keywordTags]).slice(0, 10);
  const runtimeMinutes = details.runtime ?? parseRuntime(omdb?.Runtime) ?? 0;
  const criticalScore = bestScore(details.vote_average, omdb);

  const record = {
    id: slugify(`${details.title}-${year || tmdbId}`),
    tmdbId,
    imdbId: imdbId ?? undefined,
    title: details.title,
    originalTitle: details.original_title && details.original_title !== details.title ? details.original_title : undefined,
    originalLanguage: details.original_language ?? "en",
    year,
    releaseDate: details.release_date || undefined,
    runtimeMinutes,
    genres,
    tags,
    directors: directors.length > 0 ? directors : splitPeople(omdb?.Director).slice(0, 3),
    cast: cast.length > 0 ? cast : splitPeople(omdb?.Actors).slice(0, 6),
    crew,
    synopsis: details.overview || omdb?.Plot || "No synopsis is available yet.",
    posterPath: details.poster_path ?? undefined,
    backdropPath: details.backdrop_path ?? undefined,
    posterTone: toneForGenres(genres),
    popularity: normalizePopularity(details.popularity),
    criticalScore,
    plexFit: seed.plexFit ?? fitLine(genres, runtimeMinutes, criticalScore),
    trailerUrl: extractTrailerUrl(details.videos?.results ?? []),
    source: {
      tmdbUpdatedAt: fetchedAt,
      omdbUpdatedAt: omdb ? new Date().toISOString() : undefined,
      tmdbVoteAverage: details.vote_average,
      tmdbVoteCount: details.vote_count,
      omdbImdbRating: numberOrUndefined(omdb?.imdbRating),
      omdbImdbVotes: parseVotes(omdb?.imdbVotes),
      omdbMetascore: numberOrUndefined(omdb?.Metascore),
    },
  };

  manifest.tmdbIds[String(tmdbId)] = {
    recordId: record.id,
    lastFetchedAt: fetchedAt,
    sourceFingerprint,
    status: "ok",
  };

  return record;
}

async function findTmdbId(seed: SeedMovie, options: CliOptions, token?: string, apiKey?: string) {
  const response = await tmdbFetch<{ results?: TmdbListItem[] }>(
    "/search/movie",
    {
      query: seed.title,
      year: seed.year ? String(seed.year) : "",
      include_adult: "false",
      language: "en-US",
    },
    options,
    token,
    apiKey,
  );

  return response.results?.find((result) => !result.adult && (!seed.year || parseYear(result.release_date) === seed.year))?.id;
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
  if (requestKeysThisRun.has(requestKey)) {
    const cached = await readTmdbCache<T>(requestKey);
    if (cached) {
      runStats.tmdbCacheHits += 1;
      return cached;
    }
  }
  requestKeysThisRun.add(requestKey);

  if (options.cacheMode !== "off") {
    const cached = await readTmdbCache<T>(requestKey);
    if (cached) {
      runStats.tmdbCacheHits += 1;
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
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return undefined;
    }
    throw error;
  }
}

async function writeTmdbCache(requestKey: string, data: unknown) {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(path.join(cacheDir, `${requestKey}.json`), `${JSON.stringify(data)}\n`);
}

async function fetchOmdb(imdbId: string, apiKey: string) {
  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("i", imdbId);
  url.searchParams.set("plot", "short");

  const response = await fetch(url);
  if (!response.ok) {
    return undefined;
  }

  const data: OmdbMovie = await response.json();
  return data.Response === "True" ? data : undefined;
}

function recordFromSeed(seed: SeedMovie): MovieRecord {
  const year = seed.year ?? 0;
  return {
    id: slugify(`${seed.title}-${year || seed.tmdbId || seed.imdbId || "movie"}`),
    tmdbId: seed.tmdbId,
    imdbId: seed.imdbId,
    title: seed.title,
    originalLanguage: "en",
    year,
    runtimeMinutes: 0,
    genres: [],
    tags: seed.tags ?? [],
    directors: [],
    cast: [],
    synopsis: "Run the enrichment script with TMDb credentials to fill this movie's metadata.",
    posterTone: "from-stone-100 via-slate-600 to-neutral-950",
    popularity: 1,
    criticalScore: 1,
    plexFit: seed.plexFit ?? "A curated catalog seed awaiting enrichment.",
  };
}

function isUsefulListItem(movie: TmdbListItem) {
  return !movie.adult && !movie.video && Boolean(movie.id) && (movie.vote_count ?? 0) >= 10;
}

function isUsefulRecord(movie: MovieRecord) {
  return movie.title && movie.year >= 1878 && movie.synopsis && movie.runtimeMinutes >= 0;
}

function parseYear(date?: string | null) {
  if (!date) {
    return undefined;
  }
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
}

function parseRuntime(value?: string) {
  const match = value?.match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function parseVotes(value?: string) {
  if (!value || value === "N/A") {
    return undefined;
  }
  const votes = Number(value.replaceAll(",", ""));
  return Number.isFinite(votes) ? votes : undefined;
}

function bestScore(tmdbVoteAverage?: number, omdb?: OmdbMovie) {
  const metascore = numberOrUndefined(omdb?.Metascore);
  if (metascore) {
    return Math.round(metascore);
  }

  const imdbRating = numberOrUndefined(omdb?.imdbRating);
  if (imdbRating) {
    return Math.round(imdbRating * 10);
  }

  return Math.round((tmdbVoteAverage ?? 0) * 10);
}

function normalizePopularity(value?: number) {
  if (!value) {
    return 1;
  }
  return Math.max(1, Math.min(100, Math.round(value)));
}

function numberOrUndefined(value?: string | number) {
  if (value === undefined || value === "N/A") {
    return undefined;
  }

  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function splitPeople(value?: string) {
  return value && value !== "N/A" ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
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
  const trailers = videos.filter(
    (video) => video.site === "YouTube" && video.type === "Trailer" && video.key,
  );

  const official = trailers.find((video) => video.official);
  const chosen = official ?? trailers[0];

  if (chosen) {
    return `https://www.youtube-nocookie.com/embed/${chosen.key}`;
  }

  return undefined;
}

function seedKey(seed: SeedMovie) {
  return `${seed.title.toLowerCase()}-${seed.year ?? "unknown"}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

await main();
