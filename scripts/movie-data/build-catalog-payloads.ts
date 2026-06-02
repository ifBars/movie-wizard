import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CatalogIndexMovie, CatalogIndexPayload, CatalogManifestPayload, Movie, MovieDetails, MovieDetailsPayload } from "../../src/types";

const rootDir = process.cwd();
const generatedDir = path.join(rootDir, "src", "data", "generated");
const sourcePath = path.join(generatedDir, "movies.json");
const indexPath = path.join(generatedDir, "catalog-index.json");
const detailsPath = path.join(generatedDir, "movie-details.json");
const manifestPath = path.join(generatedDir, "catalog-manifest.json");

const synopsisPreviewLength = 220;

async function main() {
  const movies: Movie[] = JSON.parse(await readFile(sourcePath, "utf8"));
  const generatedAt = new Date().toISOString();

  const indexPayload: CatalogIndexPayload = {
    version: 1,
    generatedAt,
    movies: movies.map(toCatalogIndexMovie),
  };

  const detailsPayload: MovieDetailsPayload = {
    version: 1,
    generatedAt,
    movies: Object.fromEntries(movies.map((movie) => [movie.id, toMovieDetails(movie)])),
  };

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
      "synopsisPreview",
    ],
    detailFields: ["id", "crew", "source", "synopsis"],
  };

  await mkdir(generatedDir, { recursive: true });
  await writeJson(indexPath, indexPayload);
  await writeJson(detailsPath, detailsPayload);
  await writeJson(manifestPath, manifestPayload);
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

await main();
