import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { isAdultMovie } from "../../src/lib/adultMovies";
import {
  getMovieCatalogShard,
  getMovieDetailShard,
  movieCatalogShardCount,
  movieDetailShardCount,
} from "../../src/lib/catalogShards";
import { getSearchableMovieText } from "../../src/lib/movieSearch";
import type {
  CatalogIndexMovie,
  CatalogIndexPayload,
  CatalogManifestPayload,
  CatalogSearchPayload,
  Movie,
  MovieDetails,
  MovieDetailsPayload,
} from "../../src/types";

const rootDir = process.cwd();
const generatedDir = path.join(rootDir, "src", "data", "generated");
const sourcePath = path.join(generatedDir, "movies.json");
const indexPath = path.join(generatedDir, "catalog-index.json");
const bootstrapPath = path.join(generatedDir, "catalog-bootstrap.json");
const indexShardsDir = path.join(generatedDir, "catalog-index-shards");
const searchPath = path.join(generatedDir, "catalog-search.json");
const detailsPath = path.join(generatedDir, "movie-details.json");
const detailsShardsDir = path.join(generatedDir, "movie-details-shards");
const manifestPath = path.join(generatedDir, "catalog-manifest.json");

const synopsisPreviewLength = 220;
const bootstrapMovieCount = 480;

async function main() {
  const movies: Movie[] = JSON.parse(await readFile(sourcePath, "utf8"));
  const generatedAt = new Date().toISOString();

  if (process.argv.includes("--search-only")) {
    await writeCompactJson(searchPath, buildSearchPayload(movies, generatedAt));
    return;
  }

  const indexPayload: CatalogIndexPayload = {
    version: 1,
    generatedAt,
    movies: movies.map(toCatalogIndexMovie),
  };

  const bootstrapPayload: CatalogIndexPayload = {
    version: 1,
    generatedAt,
    movies: selectBootstrapMovies(movies).map(toCatalogIndexMovie),
  };

  const detailsPayload: MovieDetailsPayload = {
    version: 1,
    generatedAt,
    movies: Object.fromEntries(movies.map((movie) => [movie.id, toMovieDetails(movie)])),
  };

  const searchPayload = buildSearchPayload(movies, generatedAt);

  const manifestPayload: CatalogManifestPayload = {
    version: 1,
    generatedAt,
    movieCount: movies.length,
    indexFields: [
      "id",
      "tmdbId",
      "imdbId",
      "title",
      "originalTitle",
      "originalLanguage",
      "year",
      "releaseDate",
      "runtimeMinutes",
      "genres",
      "tags",
      "directors",
      "cast",
      "posterPath",
      "backdropPath",
      "posterTone",
      "popularity",
      "criticalScore",
      "plexFit",
      "trailerUrl",
      "synopsisPreview",
    ],
    detailFields: ["id", "crew", "source", "synopsis"],
    adultMovieCount: movies.filter(isAdultMovie).length,
    languageCounts: buildLanguageCounts(movies),
  };

  await mkdir(generatedDir, { recursive: true });
  await mkdir(indexShardsDir, { recursive: true });
  await mkdir(detailsShardsDir, { recursive: true });
  await writeJson(indexPath, indexPayload);
  await writeCompactJson(bootstrapPath, bootstrapPayload);
  await writeMovieCatalogShards(movies, generatedAt);
  await writeCompactJson(searchPath, searchPayload);
  await writeJson(detailsPath, detailsPayload);
  await writeMovieDetailShards(movies, generatedAt);
  await writeJson(manifestPath, manifestPayload);
}

function buildSearchPayload(movies: Movie[], generatedAt: string): CatalogSearchPayload {
  return {
    version: 1,
    generatedAt,
    movies: movies.map((movie) => [
      movie.id,
      getSearchableMovieText(movie, false),
      movie.originalLanguage,
      isAdultMovie(movie) ? 1 : 0,
      movie.year,
      movie.runtimeMinutes,
      movie.genres.map((genre) => genre.toLowerCase()).join("|"),
      movie.criticalScore,
      movie.popularity,
    ]),
  };
}

function buildLanguageCounts(movies: Movie[]) {
  const counts: Record<string, { total: number; adult: number }> = {};

  for (const movie of movies) {
    const current = counts[movie.originalLanguage] ?? { total: 0, adult: 0 };
    current.total += 1;
    if (isAdultMovie(movie)) {
      current.adult += 1;
    }
    counts[movie.originalLanguage] = current;
  }

  return counts;
}

async function writeMovieCatalogShards(movies: Movie[], generatedAt: string) {
  const shards = Array.from({ length: movieCatalogShardCount }, () => new Array<CatalogIndexMovie>());

  for (const movie of movies) {
    shards[getMovieCatalogShard(movie.id)].push(toCatalogIndexMovie(movie));
  }

  await Promise.all(
    shards.map((shardMovies, shard) =>
      writeCompactJson(path.join(indexShardsDir, `${shard.toString().padStart(3, "0")}.json`), {
        version: 1,
        generatedAt,
        movies: shardMovies,
      } satisfies CatalogIndexPayload),
    ),
  );
}

function selectBootstrapMovies(movies: Movie[]) {
  return movies
    .slice()
    .sort((a, b) => getBootstrapScore(b) - getBootstrapScore(a) || b.year - a.year || a.title.localeCompare(b.title))
    .slice(0, bootstrapMovieCount);
}

function getBootstrapScore(movie: Movie) {
  return movie.criticalScore * 0.72 + Math.log1p(Math.max(0, movie.popularity)) * 6;
}

async function writeMovieDetailShards(movies: Movie[], generatedAt: string) {
  const shards = Array.from({ length: movieDetailShardCount }, () => new Map<string, MovieDetails>());

  for (const movie of movies) {
    shards[getMovieDetailShard(movie.id)].set(movie.id, toMovieDetails(movie));
  }

  await Promise.all(
    shards.map((moviesById, shard) =>
      writeCompactJson(
        path.join(detailsShardsDir, `${shard.toString().padStart(2, "0")}.json`),
        {
          version: 1,
          generatedAt,
          movies: Object.fromEntries(moviesById),
        } satisfies MovieDetailsPayload,
      ),
    ),
  );
}

function toCatalogIndexMovie(movie: Movie): CatalogIndexMovie {
  return {
    id: movie.id,
    tmdbId: movie.tmdbId,
    imdbId: movie.imdbId,
    title: movie.title,
    originalTitle: movie.originalTitle,
    originalLanguage: movie.originalLanguage,
    year: movie.year,
    releaseDate: movie.releaseDate,
    runtimeMinutes: movie.runtimeMinutes,
    genres: movie.genres,
    tags: movie.tags,
    directors: movie.directors,
    cast: movie.cast,
    posterPath: movie.posterPath,
    backdropPath: movie.backdropPath,
    posterTone: movie.posterTone,
    popularity: movie.popularity,
    criticalScore: movie.criticalScore,
    plexFit: movie.plexFit,
    trailerUrl: movie.trailerUrl,
    synopsisPreview: createSynopsisPreview(movie.synopsis),
  };
}

function toMovieDetails(movie: Movie): MovieDetails {
  return {
    id: movie.id,
    crew: movie.crew,
    source: movie.source,
    synopsis: movie.synopsis,
  };
}

function createSynopsisPreview(synopsis: string) {
  if (synopsis.length <= synopsisPreviewLength) {
    return synopsis;
  }

  return `${synopsis.slice(0, synopsisPreviewLength).trimEnd()}...`;
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeCompactJson(filePath: string, value: unknown) {
  await writeFile(filePath, JSON.stringify(value));
}

await main();
