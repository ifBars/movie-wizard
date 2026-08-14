import { describe, expect, test } from "vitest";
import {
  getCollaborativeMovieIds,
  parseCollaborativeModel,
} from "@/lib/collaborativeRecommendations";
import type { MovieStateMap } from "@/types";

describe("collaborative recommendation artifacts", () => {
  test("parses supported neighbor rows and ignores malformed entries", () => {
    const model = parseCollaborativeModel({
      version: 1,
      neighbors: {
        source: [["strong-pick", 0.72, 18], ["missing-support", 0.5]],
      },
    });

    expect(model.get("source")).toEqual([
      { movieId: "strong-pick", similarity: 0.72, support: 18 },
    ]);
  });

  test("prioritizes neighbors connected to stronger rating opinions", () => {
    const model = parseCollaborativeModel({
      version: 1,
      neighbors: {
        favorite: [["favorite-neighbor", 0.5, 20]],
        neutral: [["neutral-neighbor", 0.9, 30]],
      },
    });
    const states: MovieStateMap = {
      favorite: createState("favorite", 5),
      neutral: createState("neutral", 3.5),
    };

    expect(getCollaborativeMovieIds(model, states)).toEqual(["favorite-neighbor"]);
  });

  test("rejects payloads without a versioned neighbor map", () => {
    expect(() => parseCollaborativeModel({ version: 2, neighbors: {} })).toThrow(
      "Collaborative recommendation model is invalid",
    );
  });
});

function createState(movieId: string, rating: 3.5 | 5): MovieStateMap[string] {
  return {
    movieId,
    watched: true,
    watchlist: false,
    ignored: false,
    rating,
    updatedAt: "2026-08-14T00:00:00.000Z",
  };
}
