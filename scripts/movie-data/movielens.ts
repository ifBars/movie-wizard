import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Movie } from "../../src/types";

// Download https://files.grouplens.org/datasets/movielens/ml-32m.zip and extract it to tmp/, or pass --dataset=<path>.
const defaultDatasetDir = "tmp/ml-32m";

export function getDatasetDir(rootDir: string) {
  const datasetArgument = process.argv.find((argument) => argument.startsWith("--dataset="));
  const datasetDir = path.resolve(rootDir, datasetArgument?.slice("--dataset=".length) ?? defaultDatasetDir);
  if (!existsSync(path.join(datasetDir, "links.csv"))) {
    throw new Error(`No MovieLens dataset at ${datasetDir}. Extract ml-32m there or pass --dataset=<path>.`);
  }

  return datasetDir;
}

export async function readCatalogIndexByMovieLensId(datasetDir: string, movies: Movie[]) {
  const catalogIndexByTmdbId = new Map<string, number>();
  const catalogIndexByImdbId = new Map<string, number>();

  movies.forEach((movie, index) => {
    if (movie.tmdbId !== undefined) {
      catalogIndexByTmdbId.set(String(movie.tmdbId), index);
    }
    if (movie.imdbId) {
      catalogIndexByImdbId.set(movie.imdbId.replace(/^tt/, "").padStart(7, "0"), index);
    }
  });

  const links = parseSimpleCsv(await readFile(path.join(datasetDir, "links.csv"), "utf8"));
  const catalogIndexByMovieLensId = new Map<number, number>();

  for (const [movieId, imdbId, tmdbId] of links) {
    const catalogIndex =
      (tmdbId ? catalogIndexByTmdbId.get(tmdbId) : undefined) ??
      (imdbId ? catalogIndexByImdbId.get(imdbId.padStart(7, "0")) : undefined);

    if (catalogIndex !== undefined) {
      catalogIndexByMovieLensId.set(Number(movieId), catalogIndex);
    }
  }

  return catalogIndexByMovieLensId;
}

function parseSimpleCsv(rawCsv: string) {
  return rawCsv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((row) => row.split(","));
}
