import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Movie } from "../../src/types";
import { getDatasetDir, readCatalogIndexByMovieLensId } from "./movielens";

// A tag must be applied to a movie by several people, and used across many movies, to count as taste vocabulary
// rather than one person's note.
const minimumTaggersPerMovie = 3;
const minimumMoviesPerTag = 15;
const tagsPerMovie = 6;
// Keep tags that at least this share of the movie's most-applied tag's taggers agreed on.
const minimumShareOfTopTag = 0.15;

// Genres already score through genre weights; repeating them as tags would double count.
const genreDuplicates = new Set([
  "action", "adventure", "animation", "animated", "comedy", "crime", "documentary", "drama", "family", "fantasy",
  "history", "historical", "horror", "music", "musical", "mystery", "romance", "romantic", "sci-fi", "scifi",
  "science fiction", "thriller", "war", "western", "tv movie",
]);

// Opinions, collection notes, awards, and explicit-content flags describe the tagger, not the movie's character.
const excludedTags = new Set([
  "boring", "predictable", "overrated", "stupid", "bad acting", "too long", "plot holes", "long", "bad", "awful",
  "underrated", "seen more than once", "seen", "watched", "to see", "in netflix queue", "netflix", "dvd", "own",
  "owned", "criterion", "imdb top 250", "national film registry", "afi 100", "oscar (best picture)", "classic",
  "oscar nominee: best picture", "remake", "sequel", "franchise", "great acting", "good acting", "great movie",
  "nudity (topless)", "nudity (full frontal)", "nudity (rear)", "nudity", "sex", "rape", "sexualized violence",
  "masterpiece", "excellent", "good", "great", "amazing", "overlong", "cheesy", "bad plot", "waste of time",
  "slow", "pretentious", "disappointing", "unfunny", "annoying", "clv", "r", "pg-13", "bd-r", "erlend's dvds",
]);

// Fold near-duplicates so one idea isn't split across several weaker signals.
const tagAliases = new Map([
  ["mindfuck", "mind-bending"],
  ["mind bending", "mind-bending"],
  ["hilarious", "funny"],
  ["humorous", "funny"],
  ["plot twist", "twist ending"],
  ["twist", "twist ending"],
  ["true story", "based on a true story"],
  ["based on true story", "based on a true story"],
  ["black comedy", "dark comedy"],
  ["dark humor", "dark comedy"],
  ["soundtrack", "great soundtrack"],
  ["psychology", "psychological"],
  ["beautiful", "visually appealing"],
  ["beautifully filmed", "visually appealing"],
  ["violent", "violence"],
  ["comic book", "based on a comic"],
  ["superheroes", "superhero"],
  ["zombie", "zombies"],
  ["thought provoking", "thought-provoking"],
  ["feel good movie", "feel-good"],
  ["feel-good movie", "feel-good"],
  ["heartwarming", "feel-good"],
]);

const rootDir = process.cwd();
const datasetDir = getDatasetDir(rootDir);
const catalogPath = path.join(rootDir, "src", "data", "generated", "movies.json");
const outputPath = path.join(rootDir, "src", "data", "generated", "movielens-tags.json");

async function main() {
  const movies: Movie[] = JSON.parse(await readFile(catalogPath, "utf8"));
  const catalogIndexByMovieLensId = await readCatalogIndexByMovieLensId(datasetDir, movies);
  const peopleNames = new Set(movies.flatMap((movie) => [...movie.directors, ...movie.cast]).map((name) => name.toLowerCase()));

  const taggersByMovieTag = new Map<number, Map<string, Set<number>>>();
  for (const [userId, movieLensId, rawTag] of readTagRows(await readFile(path.join(datasetDir, "tags.csv"), "utf8"))) {
    const catalogIndex = catalogIndexByMovieLensId.get(movieLensId);
    const tag = normalizeTag(rawTag);
    if (catalogIndex === undefined || !tag || peopleNames.has(tag)) continue;

    const movieTags = taggersByMovieTag.get(catalogIndex) ?? new Map<string, Set<number>>();
    const taggers = movieTags.get(tag) ?? new Set<number>();
    taggers.add(userId);
    movieTags.set(tag, taggers);
    taggersByMovieTag.set(catalogIndex, movieTags);
  }

  const movieCountByTag = new Map<string, number>();
  for (const movieTags of taggersByMovieTag.values()) {
    for (const [tag, taggers] of movieTags) {
      if (taggers.size >= minimumTaggersPerMovie) movieCountByTag.set(tag, (movieCountByTag.get(tag) ?? 0) + 1);
    }
  }

  const tags: Record<string, string[]> = {};
  for (const [catalogIndex, movieTags] of [...taggersByMovieTag].sort((left, right) => left[0] - right[0])) {
    const ranked = [...movieTags]
      .map(([tag, taggers]) => ({ tag, count: taggers.size }))
      .filter(({ tag, count }) => count >= minimumTaggersPerMovie && (movieCountByTag.get(tag) ?? 0) >= minimumMoviesPerTag)
      .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));
    const topCount = ranked[0]?.count ?? 0;
    const selected = ranked.filter(({ count }) => count >= topCount * minimumShareOfTopTag).slice(0, tagsPerMovie);
    if (selected.length > 0) tags[movies[catalogIndex].id] = selected.map(({ tag }) => tag);
  }

  await writeFile(
    outputPath,
    `${JSON.stringify({ version: 1, source: "MovieLens 32M", generatedAt: new Date().toISOString(), tags })}\n`,
  );

  const vocabulary = new Set(Object.values(tags).flat());
  console.log(`Wrote community tags for ${Object.keys(tags).length} catalog movies (${vocabulary.size} distinct tags).`);
}

function normalizeTag(rawTag: string) {
  const tag = rawTag.trim().toLowerCase().replace(/\s+/g, " ");
  const aliased = tagAliases.get(tag) ?? tag;
  if (aliased.length < 3 || aliased.length > 32 || genreDuplicates.has(aliased) || excludedTags.has(aliased)) return undefined;
  // Ratings-as-tags ("4/5", "seen 2019") and bare years carry no taste signal.
  if (/\d/.test(aliased) && !/^\d{4}s$/.test(aliased)) return undefined;
  return aliased;
}

function* readTagRows(rawCsv: string): Generator<[userId: number, movieId: number, tag: string]> {
  const rowPattern = /^(\d+),(\d+),("(?:[^"]|"")*"|[^,]*),\d+$/;
  for (const line of rawCsv.split(/\r?\n/).slice(1)) {
    const match = rowPattern.exec(line);
    if (!match) continue;
    const tag = match[3].startsWith('"') ? match[3].slice(1, -1).replace(/""/g, '"') : match[3];
    yield [Number(match[1]), Number(match[2]), tag];
  }
}

await main();
