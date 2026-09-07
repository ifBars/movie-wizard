import { describe, expect, test } from "vitest";
import {
  getCollaborativeMovieIds,
  parseCollaborativeModel,
} from "@/lib/collaborativeRecommendations";
import type { MovieStateMap, Rating } from "@/types";

describe("collaborative recommendation artifacts", () => {
  test("does not spend candidate slots on disliked neighbors or unavailable movies", () => {
    const model = parseCollaborativeModel({ version: 1, neighbors: {
      disliked: [["bad-fit", 0.9, 30]],
      favorite: [["saved", 0.9, 30], ["good-fit", 0.5, 20]],
    } });
    const states: MovieStateMap = {
      disliked: createState("disliked", 0.5),
      favorite: createState("favorite", 5),
      saved: { ...createState("saved", 5), watched: false, rating: null, watchlist: true },
    };
    expect(getCollaborativeMovieIds(model, states, 1)).toEqual(["good-fit"]);
  });

  test("combines agreement across favorites and subtracts contradictory ratings", () => {
    const model = parseCollaborativeModel({ version: 1, neighbors: {
      first: [["consistent", 0.5, 20], ["mixed", 0.8, 20]],
      second: [["consistent", 0.5, 20]],
      disliked: [["mixed", 0.8, 20]],
    } });
    expect(getCollaborativeMovieIds(model, {
      first: createState("first", 5), second: createState("second", 5), disliked: createState("disliked", 1),
    }, 1)).toEqual(["consistent"]);
  });

  test("ignores nonfinite similarities and invalid support counts", () => {
    const model = parseCollaborativeModel({ version: 1, neighbors: { source: [
      ["nan", NaN, 10], ["infinite", Infinity, 10], ["range", 2, 10],
      ["no-support", 0.5, 0], ["fraction", 0.5, 1.5], ["valid", 0.5, 20],
    ] } });
    expect(model.get("source")).toEqual([{ movieId: "valid", similarity: 0.5, support: 20 }]);
  });

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

function createState(movieId: string, rating: Rating): MovieStateMap[string] {
  return {
    movieId,
    watched: true,
    watchlist: false,
    ignored: false,
    rating,
    updatedAt: "2026-08-14T00:00:00.000Z",
  };
}
