import catalogBootstrapUrl from "@/data/generated/catalog-bootstrap.json?url";
import catalogManifest from "@/data/generated/catalog-manifest.json";
import { createCatalogMovie } from "@/lib/catalogPayload";
import { getMovieCatalogShardFileName, getMovieDetailShardFileName } from "@/lib/catalogShards";
import { normalizeLanguageCodes } from "@/lib/languagePreferences";
import type { CatalogIndexPayload, LibrarySettings, Movie, MovieDetails, MovieDetailsPayload } from "@/types";

const movieCatalogShardUrls: Record<string, string> = import.meta.glob("/src/data/generated/catalog-index-shards/*.json", {
  query: "?url",
  import: "default",
  eager: true,
});

const movieDetailShardUrls: Record<string, string> = import.meta.glob("/src/data/generated/movie-details-shards/*.json", {
  query: "?url",
  import: "default",
  eager: true,
});

const movieDetailShardPromises = new Map<string, Promise<MovieDetailsPayload>>();
const movieCatalogShardPromises = new Map<string, Promise<Movie[]>>();

export function getCatalogSummary(settings: LibrarySettings) {
  const allowedLanguages = new Set(normalizeLanguageCodes(settings.languageCodes));
  let visibleMovieCount = 0;
  let hiddenLanguageMovieCount = 0;

  for (const [languageCode, counts] of Object.entries(catalogManifest.languageCounts)) {
    const availableCount = settings.showAdultMovies ? counts.total : counts.total - counts.adult;
    if (allowedLanguages.has(languageCode)) {
      visibleMovieCount += availableCount;
    } else {
      hiddenLanguageMovieCount += availableCount;
    }
  }

  return {
    totalMovieCount: catalogManifest.movieCount,
    visibleMovieCount,
    hiddenAdultMovieCount: settings.showAdultMovies ? 0 : catalogManifest.adultMovieCount,
    hiddenLanguageMovieCount,
  };
}

export async function loadInitialMovieCatalog(userMovieIds: string[]) {
  const [bootstrapMovies, ...userMovieShards] = await Promise.all([
    loadCatalogPayload(catalogBootstrapUrl),
    ...getUniqueCatalogShardFileNames(userMovieIds).map(loadMovieCatalogShard),
  ]);

  return mergeMovieCatalogs(bootstrapMovies, userMovieShards.flat());
}

async function loadCatalogPayload(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load movie catalog (${response.status})`);
  }

  const payload: unknown = await response.json();
  if (!isCatalogIndexPayload(payload)) {
    throw new Error("Movie catalog index is invalid");
  }

  return payload.movies.map(createCatalogMovie);
}

export async function loadMovieDetails(movieId: string): Promise<MovieDetails | undefined> {
  const payload = await loadMovieDetailsShard(movieId);
  return payload.movies[movieId];
}

export function preloadMovieDetails(movieId: string) {
  void loadMovieDetailsShard(movieId).catch(() => {
    // Intent preloading is opportunistic; the detail page keeps its compact fallback.
  });
}

export async function loadMoviesByIds(movieIds: string[]) {
  const shardMovies = await Promise.all(getUniqueCatalogShardFileNames(movieIds).map(loadMovieCatalogShard));
  const moviesById = new Map(shardMovies.flat().map((movie) => [movie.id, movie]));

  return movieIds.flatMap((movieId) => {
    const movie = moviesById.get(movieId);
    return movie ? [movie] : [];
  });
}

function getUniqueCatalogShardFileNames(movieIds: string[]) {
  return [...new Set(movieIds.map(getMovieCatalogShardFileName))];
}

function loadMovieCatalogShard(fileName: string) {
  const existingPromise = movieCatalogShardPromises.get(fileName);
  if (existingPromise) {
    return existingPromise;
  }

  const url = movieCatalogShardUrls[`/src/data/generated/catalog-index-shards/${fileName}`];
  if (!url) {
    return Promise.reject(new Error(`Missing movie catalog shard ${fileName}`));
  }

  const shardPromise = loadCatalogPayload(url);
  movieCatalogShardPromises.set(fileName, shardPromise);
  return shardPromise;
}

function mergeMovieCatalogs(primaryMovies: Movie[], additionalMovies: Movie[]) {
  const moviesById = new Map(primaryMovies.map((movie) => [movie.id, movie]));

  for (const movie of additionalMovies) {
    moviesById.set(movie.id, movie);
  }

  return [...moviesById.values()];
}

function loadMovieDetailsShard(movieId: string) {
  const fileName = getMovieDetailShardFileName(movieId);
  const url = movieDetailShardUrls[`/src/data/generated/movie-details-shards/${fileName}`];
  if (!url) {
    return Promise.reject(new Error(`Missing movie detail shard ${fileName}`));
  }

  const existingPromise = movieDetailShardPromises.get(fileName);
  if (existingPromise) {
    return existingPromise;
  }

  const shardPromise = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load movie details (${response.status})`);
    }

    const payload: unknown = await response.json();
    if (!isMovieDetailsPayload(payload)) {
      throw new Error("Movie details payload is invalid");
    }

    return payload;
  });

  movieDetailShardPromises.set(fileName, shardPromise);
  return shardPromise;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCatalogIndexPayload(value: unknown): value is CatalogIndexPayload {
  return isRecord(value) && value.version === 1 && typeof value.generatedAt === "string" && Array.isArray(value.movies);
}

function isMovieDetailsPayload(value: unknown): value is MovieDetailsPayload {
  return isRecord(value) && value.version === 1 && typeof value.generatedAt === "string" && isRecord(value.movies);
}
