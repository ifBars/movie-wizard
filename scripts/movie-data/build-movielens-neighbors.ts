import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Movie } from "../../src/types";

type Rating = {
  movieId: number;
  rating: number;
};

type PairStats = {
  count: number;
  dotProduct: number;
  leftSquares: number;
  rightSquares: number;
};

type Neighbor = [movieId: string, similarity: number, support: number];

const minimumSupport = 3;
const neighborsPerMovie = 16;
const minimumSimilarity = 0.08;

const rootDir = process.cwd();
const datasetDir = getDatasetDir();
const catalogPath = path.join(rootDir, "src", "data", "generated", "movies.json");
const outputPath = path.join(rootDir, "src", "data", "generated", "movielens-neighbors.json");
const licensePath = path.join(rootDir, "src", "data", "generated", "movielens-README.txt");

async function main() {
  const movies: Movie[] = JSON.parse(await readFile(catalogPath, "utf8"));
  const catalogIndexByMovieLensId = await buildCatalogIndexByMovieLensId(movies);
  const users = await readRatings(catalogIndexByMovieLensId);
  const pairStats = buildPairStats(users, movies.length);
  const neighbors = buildNeighbors(pairStats, movies);

  const payload = {
    version: 1,
    source: "MovieLens latest-small",
    generatedAt: new Date().toISOString(),
    minimumSupport,
    neighborsPerMovie,
    matchedMovieCount: new Set(catalogIndexByMovieLensId.values()).size,
    neighbors,
  };

  await writeFile(outputPath, JSON.stringify(payload));
  await copyFile(path.join(datasetDir, "README.txt"), licensePath);

  const edgeCount = Object.values(neighbors).reduce((total, rows) => total + rows.length, 0);
  console.log(`Matched ${payload.matchedMovieCount} catalog movies and wrote ${edgeCount} collaborative edges.`);
}

function getDatasetDir() {
  const datasetArgument = process.argv.find((argument) => argument.startsWith("--dataset="));
  if (!datasetArgument) {
    throw new Error("Pass the extracted MovieLens latest-small directory with --dataset=<path>.");
  }

  const datasetPath = datasetArgument.slice("--dataset=".length);
  return path.resolve(rootDir, datasetPath);
}

async function buildCatalogIndexByMovieLensId(movies: Movie[]) {
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

  const links = parseCsv(await readFile(path.join(datasetDir, "links.csv"), "utf8"));
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

async function readRatings(catalogIndexByMovieLensId: Map<number, number>) {
  const rows = parseCsv(await readFile(path.join(datasetDir, "ratings.csv"), "utf8"));
  const ratingsByUser = new Map<number, Rating[]>();

  for (const [userIdValue, movieIdValue, ratingValue] of rows) {
    const catalogIndex = catalogIndexByMovieLensId.get(Number(movieIdValue));
    if (catalogIndex === undefined) {
      continue;
    }

    const userId = Number(userIdValue);
    const ratings = ratingsByUser.get(userId) ?? [];
    ratings.push({ movieId: catalogIndex, rating: Number(ratingValue) });
    ratingsByUser.set(userId, ratings);
  }

  return ratingsByUser.values();
}

function buildPairStats(users: Iterable<Rating[]>, catalogSize: number) {
  const statsByPair = new Map<number, PairStats>();

  for (const ratings of users) {
    if (ratings.length < 2) {
      continue;
    }

    const mean = ratings.reduce((total, rating) => total + rating.rating, 0) / ratings.length;
    const centered = ratings.map((rating) => ({ ...rating, value: rating.rating - mean }));

    for (let leftIndex = 0; leftIndex < centered.length - 1; leftIndex += 1) {
      const left = centered[leftIndex];
      for (let rightIndex = leftIndex + 1; rightIndex < centered.length; rightIndex += 1) {
        const right = centered[rightIndex];
        if (left.value === 0 && right.value === 0) {
          continue;
        }

        const first = left.movieId < right.movieId ? left : right;
        const second = left.movieId < right.movieId ? right : left;
        const pairKey = first.movieId * catalogSize + second.movieId;
        const stats = statsByPair.get(pairKey) ?? {
          count: 0,
          dotProduct: 0,
          leftSquares: 0,
          rightSquares: 0,
        };

        stats.count += 1;
        stats.dotProduct += first.value * second.value;
        stats.leftSquares += first.value ** 2;
        stats.rightSquares += second.value ** 2;
        statsByPair.set(pairKey, stats);
      }
    }
  }

  return statsByPair;
}

function buildNeighbors(statsByPair: Map<number, PairStats>, movies: Movie[]) {
  const neighborRows = new Map<number, Array<[catalogIndex: number, similarity: number, support: number]>>();

  for (const [pairKey, stats] of statsByPair) {
    if (stats.count < minimumSupport) {
      continue;
    }

    const denominator = Math.sqrt(stats.leftSquares * stats.rightSquares);
    if (denominator === 0) {
      continue;
    }

    const correlation = stats.dotProduct / denominator;
    const similarity = correlation * (stats.count / (stats.count + 8));
    if (similarity < minimumSimilarity) {
      continue;
    }

    const leftIndex = Math.floor(pairKey / movies.length);
    const rightIndex = pairKey % movies.length;
    addNeighbor(neighborRows, leftIndex, [rightIndex, similarity, stats.count]);
    addNeighbor(neighborRows, rightIndex, [leftIndex, similarity, stats.count]);
  }

  return Object.fromEntries(
    [...neighborRows.entries()].map(([catalogIndex, rows]) => [
      movies[catalogIndex].id,
      rows
        .sort((left, right) => right[1] - left[1] || right[2] - left[2])
        .slice(0, neighborsPerMovie)
        .map<Neighbor>(([neighborIndex, similarity, support]) => [
          movies[neighborIndex].id,
          Math.round(similarity * 10_000) / 10_000,
          support,
        ]),
    ]),
  );
}

function addNeighbor(
  rowsByMovie: Map<number, Array<[catalogIndex: number, similarity: number, support: number]>>,
  movieIndex: number,
  neighbor: [catalogIndex: number, similarity: number, support: number],
) {
  const rows = rowsByMovie.get(movieIndex) ?? [];
  rows.push(neighbor);
  rowsByMovie.set(movieIndex, rows);
}

function parseCsv(rawCsv: string) {
  return rawCsv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((row) => row.split(","));
}

await main();
