import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Movie } from "../../src/types";

type TmdbLanguageRecord = {
  id: number;
  original_language: string;
};

const rootDir = process.cwd();
const cacheDir = path.join(rootDir, ".movie-wizard-cache", "tmdb");
const moviesPath = path.join(rootDir, "src", "data", "generated", "movies.json");

async function main() {
  const languageByTmdbId = await readCachedLanguages();
  const movies: Movie[] = JSON.parse(await readFile(moviesPath, "utf8"));
  let updatedCount = 0;

  const nextMovies = movies.map((movie) => {
    const originalLanguage = movie.tmdbId ? languageByTmdbId.get(movie.tmdbId) : undefined;
    const nextLanguage = originalLanguage ?? movie.originalLanguage ?? "en";

    if (movie.originalLanguage !== nextLanguage) {
      updatedCount += 1;
    }

    return {
      ...movie,
      originalLanguage: nextLanguage,
    };
  });

  await writeFile(moviesPath, `${JSON.stringify(nextMovies, null, 2)}\n`);
  console.log(`Backfilled originalLanguage for ${updatedCount} movies from ${languageByTmdbId.size} cached TMDB records.`);
}

async function readCachedLanguages() {
  const languageByTmdbId = new Map<number, string>();
  const files = await readdir(cacheDir, { recursive: true });

  for (const file of files) {
    if (typeof file !== "string" || !file.endsWith(".json")) {
      continue;
    }

    const filePath = path.join(cacheDir, file);
    const data: unknown = JSON.parse(await readFile(filePath, "utf8"));
    collectLanguages(data, languageByTmdbId);
  }

  return languageByTmdbId;
}

function collectLanguages(value: unknown, target: Map<number, string>) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectLanguages(item, target);
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  if (isTmdbLanguageRecord(value)) {
    target.set(value.id, value.original_language);
  }

  for (const child of Object.values(value)) {
    collectLanguages(child, target);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTmdbLanguageRecord(value: Record<string, unknown>): value is TmdbLanguageRecord {
  return typeof value.id === "number" && typeof value.original_language === "string";
}

await main();
