import { describe, expect, test } from "vitest";
import generatedMovies from "@/data/generated/movies.json";
import { buildLinearMovieSearchCorpus, buildMovieSearchIndex, linearSearchMovieCorpus, searchMovieIndex } from "@/lib/movieSearch";
import type { Movie } from "@/types";

const realCatalog: Movie[] = generatedMovies;
const benchmarkQueries = [
  "mission impossible",
  "tom cruise",
  "science fiction",
  "animation",
  "batman",
  "2025",
  "quiet",
  "search",
];

describe("movie search index", () => {
  test("finds real catalog matches from title, people, genre, year, and synopsis fields", () => {
    const index = buildMovieSearchIndex(realCatalog);

    expect(searchMovieIndex(index, "mission impossible").some((movie) => movie.title.toLowerCase().includes("mission"))).toBe(true);
    expect(searchMovieIndex(index, "tom cruise").some((movie) => movie.cast.includes("Tom Cruise"))).toBe(true);
    expect(searchMovieIndex(index, "science fiction").some((movie) => movie.genres.includes("Science Fiction"))).toBe(true);
    expect(searchMovieIndex(index, "2025").some((movie) => movie.year === 2025)).toBe(true);
    expect(searchMovieIndex(index, "quiet").some((movie) => movie.synopsis.toLowerCase().includes("quiet") || movie.tags.includes("quiet"))).toBe(true);
  });

  test("keeps exact title prefix matches near the top", () => {
    const index = buildMovieSearchIndex(realCatalog);
    const results = searchMovieIndex(index, "mission impossible");

    expect(results.slice(0, 5).some((movie) => movie.title.toLowerCase().startsWith("mission"))).toBe(true);
  });

  test("searches the real catalog faster than a full string scan", () => {
    const index = buildMovieSearchIndex(realCatalog);
    const linearCorpus = buildLinearMovieSearchCorpus(realCatalog);
    const iterations = 80;

    const linearMs = medianTimedRun(iterations, () => {
      for (const query of benchmarkQueries) {
        linearSearchMovieCorpus(linearCorpus, query);
      }
    });
    const indexedMs = medianTimedRun(iterations, () => {
      for (const query of benchmarkQueries) {
        searchMovieIndex(index, query);
      }
    });

    console.info(
      [
        `movie search benchmark: ${realCatalog.length} movies`,
        `linear=${linearMs.toFixed(3)}ms`,
        `indexed=${indexedMs.toFixed(3)}ms`,
        `speedup=${(linearMs / indexedMs).toFixed(1)}x`,
      ].join(" | "),
    );

    expect(indexedMs).toBeLessThan(linearMs);
  });
});

function medianTimedRun(iterations: number, run: () => void) {
  const samples = Array.from({ length: iterations }, () => {
    const startedAt = performance.now();
    run();
    return performance.now() - startedAt;
  }).sort((a, b) => a - b);

  return samples[Math.floor(samples.length / 2)];
}
