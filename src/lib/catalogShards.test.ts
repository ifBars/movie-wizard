import { describe, expect, test } from "vitest";
import {
  getMovieCatalogShard,
  getMovieCatalogShardFileName,
  getMovieDetailShard,
  getMovieDetailShardFileName,
  movieCatalogShardCount,
  movieDetailShardCount,
} from "@/lib/catalogShards";

describe("catalog detail shards", () => {
  test("maps movie ids to a stable bounded shard", () => {
    expect(getMovieDetailShard("arrival-2016")).toBe(getMovieDetailShard("arrival-2016"));
    expect(getMovieDetailShard("arrival-2016")).toBeGreaterThanOrEqual(0);
    expect(getMovieDetailShard("arrival-2016")).toBeLessThan(movieDetailShardCount);
    expect(getMovieDetailShardFileName("arrival-2016")).toMatch(/^\d{2}\.json$/);
  });

  test("distributes representative ids across shards", () => {
    const shards = new Set([
      "arrival-2016",
      "heat-1995",
      "parasite-2019",
      "the-handmaiden-2016",
      "edge-of-tomorrow-2014",
    ].map(getMovieDetailShard));

    expect(shards.size).toBeGreaterThan(1);
  });

  test("uses smaller catalog shards for saved-movie startup hydration", () => {
    const shard = getMovieCatalogShard("the-godfather-1972");

    expect(shard).toBeGreaterThanOrEqual(0);
    expect(shard).toBeLessThan(movieCatalogShardCount);
    expect(getMovieCatalogShardFileName("the-godfather-1972")).toMatch(/^\d{3}\.json$/);
  });
});
