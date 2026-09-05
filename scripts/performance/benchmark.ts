import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { createPerformanceFixture } from "./fixtures";
import { runRecommendationJob } from "../../src/lib/recommendationJob";
import { searchCatalogEntries } from "../../src/lib/catalogSearch";
import { buildLibraryCollections } from "../../src/lib/libraryCollections";

const results = [];
for (const [movieCount, profileCount] of [[10_000, 1000], [50_000, 10_000], [100_000, 50_000]]) {
  const fixture = createPerformanceFixture(movieCount, profileCount);
  const started = performance.now();
  const result = runRecommendationJob({ ...fixture, minimumMovieYear: 1990 });
  const recommendationMs = performance.now() - started;
  const searchStart = performance.now();
  const search = searchCatalogEntries(fixture.entries, { query: "synthetic", genre: "", era: "", runtime: "", sort: "top-rated", languageCodes: ["en", "fr"], showAdultMovies: false, excludedMovieIds: Object.keys(fixture.states), limit: 48 });
  const searchMs = performance.now() - searchStart;
  const collectionStart = performance.now();
  buildLibraryCollections(fixture.movies, fixture.states);
  const collectionMs = performance.now() - collectionStart;
  const row = { movieCount, profileCount, recommendationMs: Math.round(recommendationMs), searchMs: Math.round(searchMs), collectionMs: Math.round(collectionMs), recommendationCount: result.recommendations.length, sectionCount: result.sections.length, searchCount: search.movieIds.length };
  results.push(row);
  console.log(JSON.stringify(row));
  if (result.recommendations.length > 240 || result.sections.some((section) => section.movieIds.length > 240) || search.movieIds.length > 48) throw new Error("Output size budget exceeded");
}
await mkdir('.artifacts/performance', { recursive: true });
await writeFile('.artifacts/performance/synthetic-results.json', JSON.stringify({ runtime: process.version, results }, null, 2));
if (process.argv.includes('--check') && results.some((row) => row.recommendationMs > 8000 || row.searchMs > 1000 || row.collectionMs > 1000)) {
  throw new Error('Performance budget exceeded; run in isolation and inspect .artifacts/performance/synthetic-results.json');
}
