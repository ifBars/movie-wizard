import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Movie } from "../../src/types";
import { readCatalogIndexByMovieLensId, getDatasetDir } from "./movielens";

const minimumSupport = 20;
const neighborsPerMovie = 20;
const minimumSimilarity = 0.06;
// Shrink correlations measured on few co-raters toward zero so niche pairs can't outrank well-supported ones.
const supportShrinkage = 100;
// Pair work grows with the square of each user's rating count; a deterministic sample keeps power users from dominating.
const maxRatingsPerUser = 320;

const rootDir = process.cwd();
const datasetDir = getDatasetDir(rootDir);
const catalogPath = path.join(rootDir, "src", "data", "generated", "movies.json");
const outputPath = path.join(rootDir, "src", "data", "generated", "movielens-neighbors.json");
const licensePath = path.join(rootDir, "src", "data", "generated", "movielens-README.txt");

type UserRatings = {
  offsets: Int32Array;
  items: Int32Array;
  values: Float32Array;
  userCount: number;
};

async function main() {
  const startedAt = performance.now();
  const movies: Movie[] = JSON.parse(await readFile(catalogPath, "utf8"));
  const catalogIndexByMovieLensId = await readCatalogIndexByMovieLensId(datasetDir, movies);
  const users = await readCenteredRatings(catalogIndexByMovieLensId);
  log(startedAt, `Loaded ${users.offsets[users.userCount]} centered ratings from ${users.userCount} users`);

  const neighbors = buildNeighbors(users, movies.length, startedAt);
  const participatingIndexes = [...new Set([...neighbors.keys(), ...[...neighbors.values()].flatMap((rows) => rows.map((row) => row[0]))])].sort(
    (left, right) => left - right,
  );
  const positionByCatalogIndex = new Map(participatingIndexes.map((catalogIndex, position) => [catalogIndex, position]));

  const payload = {
    version: 2,
    source: "MovieLens 32M",
    generatedAt: new Date().toISOString(),
    minimumSupport,
    neighborsPerMovie,
    matchedMovieCount: new Set(catalogIndexByMovieLensId.values()).size,
    movieIds: participatingIndexes.map((catalogIndex) => movies[catalogIndex].id),
    // Flat [neighborPosition, similarity × 1000, support, ...] rows aligned with movieIds keep the payload compact.
    neighbors: participatingIndexes.map((catalogIndex) =>
      (neighbors.get(catalogIndex) ?? []).flatMap(([neighborIndex, similarity, support]) => [
        positionByCatalogIndex.get(neighborIndex) ?? -1,
        Math.round(similarity * 1000),
        support,
      ]),
    ),
  };

  await writeFile(outputPath, JSON.stringify(payload));
  await copyFile(path.join(datasetDir, "README.txt"), licensePath);

  const edgeCount = payload.neighbors.reduce((total, row) => total + row.length / 3, 0);
  log(startedAt, `Matched ${payload.matchedMovieCount} catalog movies; ${neighbors.size} have neighbors (${edgeCount} edges).`);
}

async function readCenteredRatings(catalogIndexByMovieLensId: Map<number, number>): Promise<UserRatings> {
  const offsets: number[] = [0];
  let items = new Int32Array(1 << 24);
  let values = new Float32Array(1 << 24);
  let length = 0;

  const pendingItems: number[] = [];
  const pendingRatings: number[] = [];
  let currentUserId = -1;

  const flushUser = () => {
    if (pendingItems.length >= 2) {
      const mean = pendingRatings.reduce((total, rating) => total + rating, 0) / pendingRatings.length;
      const order = pendingItems.map((_, index) => index);
      if (order.length > maxRatingsPerUser) {
        order.sort((left, right) => sampleRank(currentUserId, pendingItems[left]) - sampleRank(currentUserId, pendingItems[right]));
        order.length = maxRatingsPerUser;
      }

      const hasVariance = pendingRatings.some((rating) => rating !== mean);
      if (hasVariance) {
        if (length + order.length > items.length) {
          items = grow(items, length + order.length, (size) => new Int32Array(size));
          values = grow(values, length + order.length, (size) => new Float32Array(size));
        }
        for (const index of order) {
          items[length] = pendingItems[index];
          values[length] = pendingRatings[index] - mean;
          length += 1;
        }
        offsets.push(length);
      }
    }
    pendingItems.length = 0;
    pendingRatings.length = 0;
  };

  await forEachRatingRow(path.join(datasetDir, "ratings.csv"), (userId, movieLensId, rating) => {
    if (userId !== currentUserId) {
      if (userId < currentUserId) {
        throw new Error("ratings.csv must be sorted by userId.");
      }
      flushUser();
      currentUserId = userId;
    }

    const catalogIndex = catalogIndexByMovieLensId.get(movieLensId);
    if (catalogIndex !== undefined) {
      pendingItems.push(catalogIndex);
      pendingRatings.push(rating);
    }
  });
  flushUser();

  return {
    offsets: Int32Array.from(offsets),
    items: items.subarray(0, length),
    values: values.subarray(0, length),
    userCount: offsets.length - 1,
  };
}

function buildNeighbors(users: UserRatings, catalogSize: number, startedAt: number) {
  // Invert user → items into item → (user, value) so each movie's co-rating row is accumulated in one dense pass.
  const raterOffsets = new Int32Array(catalogSize + 1);
  for (const item of users.items) raterOffsets[item + 1] += 1;
  for (let index = 0; index < catalogSize; index += 1) raterOffsets[index + 1] += raterOffsets[index];

  const raterUsers = new Int32Array(users.items.length);
  const raterValues = new Float32Array(users.items.length);
  const cursor = raterOffsets.slice(0, catalogSize);
  for (let user = 0; user < users.userCount; user += 1) {
    for (let position = users.offsets[user]; position < users.offsets[user + 1]; position += 1) {
      const item = users.items[position];
      raterUsers[cursor[item]] = user;
      raterValues[cursor[item]] = users.values[position];
      cursor[item] += 1;
    }
  }

  const counts = new Int32Array(catalogSize);
  const dotProducts = new Float64Array(catalogSize);
  const leftSquares = new Float64Array(catalogSize);
  const rightSquares = new Float64Array(catalogSize);
  const touched = new Int32Array(catalogSize);
  const neighbors = new Map<number, Array<[neighborIndex: number, similarity: number, support: number]>>();

  for (let item = 0; item < catalogSize; item += 1) {
    if (item % 2000 === 0) log(startedAt, `Scoring movie ${item} of ${catalogSize}`);
    if (raterOffsets[item + 1] - raterOffsets[item] < minimumSupport) continue;

    let touchedCount = 0;
    for (let rater = raterOffsets[item]; rater < raterOffsets[item + 1]; rater += 1) {
      const user = raterUsers[rater];
      const left = raterValues[rater];
      const leftSquare = left * left;
      for (let position = users.offsets[user]; position < users.offsets[user + 1]; position += 1) {
        const other = users.items[position];
        if (other === item) continue;
        const right = users.values[position];
        if (counts[other] === 0) touched[touchedCount++] = other;
        counts[other] += 1;
        dotProducts[other] += left * right;
        leftSquares[other] += leftSquare;
        rightSquares[other] += right * right;
      }
    }

    const rows: Array<[number, number, number]> = [];
    for (let index = 0; index < touchedCount; index += 1) {
      const other = touched[index];
      const support = counts[other];
      const denominator = Math.sqrt(leftSquares[other] * rightSquares[other]);
      if (support >= minimumSupport && denominator > 0) {
        const similarity = (dotProducts[other] / denominator) * (support / (support + supportShrinkage));
        if (similarity >= minimumSimilarity) rows.push([other, similarity, support]);
      }
      counts[other] = 0;
      dotProducts[other] = 0;
      leftSquares[other] = 0;
      rightSquares[other] = 0;
    }

    if (rows.length > 0) {
      rows.sort((left, right) => right[1] - left[1] || right[2] - left[2]);
      neighbors.set(item, rows.slice(0, neighborsPerMovie));
    }
  }

  return neighbors;
}

async function forEachRatingRow(filePath: string, onRow: (userId: number, movieId: number, rating: number) => void) {
  const reader = Bun.file(filePath).stream().getReader();
  // Parse bytes directly: the file is ~900 MB, too large to decode into one string.
  let field = 0;
  let userId = 0;
  let movieId = 0;
  let ratingWhole = 0;
  let ratingFraction = 0;
  let ratingScale = 0;
  let isHeader = true;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    for (let index = 0; index < value.length; index += 1) {
      const byte = value[index];
      if (byte === 10) {
        if (!isHeader && field === 3) {
          onRow(userId, movieId, ratingWhole + (ratingScale > 0 ? ratingFraction / ratingScale : 0));
        }
        isHeader = false;
        field = 0;
        userId = 0;
        movieId = 0;
        ratingWhole = 0;
        ratingFraction = 0;
        ratingScale = 0;
      } else if (isHeader) {
        continue;
      } else if (byte === 44) {
        field += 1;
      } else if (byte >= 48 && byte <= 57) {
        const digit = byte - 48;
        if (field === 0) userId = userId * 10 + digit;
        else if (field === 1) movieId = movieId * 10 + digit;
        else if (field === 2) {
          if (ratingScale > 0) {
            ratingFraction = ratingFraction * 10 + digit;
            ratingScale *= 10;
          } else {
            ratingWhole = ratingWhole * 10 + digit;
          }
        }
      } else if (byte === 46 && field === 2) {
        ratingScale = 1;
      }
    }
  }
}

function sampleRank(userId: number, item: number) {
  // Deterministic hash so rebuilding the model from the same data yields the same sample.
  let hash = Math.imul(userId ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(item + 0x632be5ab, 0xc2b2ae35);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2c1b3c6d);
  return (hash ^ (hash >>> 12)) >>> 0;
}

function grow<T extends Int32Array | Float32Array>(array: T, minimumLength: number, allocate: (length: number) => T): T {
  const next = allocate(Math.max(minimumLength, array.length * 2));
  next.set(array);
  return next;
}

function log(startedAt: number, message: string) {
  console.log(`[${((performance.now() - startedAt) / 1000).toFixed(1)}s] ${message}`);
}

await main();
