import collaborativeModelUrl from "@/data/generated/movielens-neighbors.json?url";
import { getNeighborWeight } from "@/lib/collaborativeWeights";
import type { MovieStateMap } from "@/types";

export type CollaborativeNeighbor = {
  movieId: string;
  similarity: number;
  support: number;
};

export type CollaborativeModel = ReadonlyMap<string, readonly CollaborativeNeighbor[]>;

let collaborativeModelPromise: Promise<CollaborativeModel> | undefined;

export function loadCollaborativeModel() {
  collaborativeModelPromise ??= fetch(collaborativeModelUrl)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load collaborative recommendations (${response.status})`);
      }

      return parseCollaborativeModel(await response.json());
    })
    .catch((error: unknown) => {
      collaborativeModelPromise = undefined;
      throw error;
    });

  return collaborativeModelPromise;
}

export function parseCollaborativeModel(payload: unknown): CollaborativeModel {
  const model = new Map<string, CollaborativeNeighbor[]>();
  for (const [movieId, rawNeighbors] of readNeighborRows(payload)) {
    if (!Array.isArray(rawNeighbors)) {
      continue;
    }

    const neighbors = rawNeighbors.flatMap((rawNeighbor) => {
      if (
        !Array.isArray(rawNeighbor) ||
        typeof rawNeighbor[0] !== "string" ||
        typeof rawNeighbor[1] !== "number" ||
        typeof rawNeighbor[2] !== "number" ||
        !Number.isFinite(rawNeighbor[1]) || Math.abs(rawNeighbor[1]) > 1 || rawNeighbor[1] === 0 ||
        !Number.isSafeInteger(rawNeighbor[2]) || rawNeighbor[2] < 1
      ) {
        return [];
      }

      return [{ movieId: rawNeighbor[0], similarity: rawNeighbor[1], support: rawNeighbor[2] }];
    });

    if (neighbors.length > 0) {
      model.set(movieId, neighbors);
    }
  }

  return model;
}

export function getCollaborativeMovieIds(
  model: CollaborativeModel,
  states: MovieStateMap,
  limit = 32,
) {
  const candidateStrength = new Map<string, number>();

  for (const state of Object.values(states)) {
    if (state.rating === null) {
      continue;
    }

    const ratingStrength = state.rating - 3.5;
    const seen = new Set<string>();
    for (const neighbor of model.get(state.movieId) ?? []) {
      if (seen.has(neighbor.movieId)) continue;
      seen.add(neighbor.movieId);
      const candidateState = states[neighbor.movieId];
      if (candidateState && (candidateState.watched || candidateState.watchlist || candidateState.ignored || candidateState.rating !== null)) continue;
      const strength = getNeighborWeight(neighbor) * ratingStrength;
      candidateStrength.set(neighbor.movieId, (candidateStrength.get(neighbor.movieId) ?? 0) + strength);
    }
  }

  return [...candidateStrength.entries()]
    .filter(([, strength]) => strength > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([movieId]) => movieId);
}

function readNeighborRows(payload: unknown): Array<[movieId: string, rawNeighbors: unknown]> {
  if (isRecord(payload) && payload.version === 1 && isRecord(payload.neighbors)) {
    return Object.entries(payload.neighbors);
  }

  // Version 2 stores flat [neighborIndex, similarity × 1000, support] rows aligned with movieIds to stay compact.
  if (
    isRecord(payload) &&
    payload.version === 2 &&
    Array.isArray(payload.movieIds) &&
    Array.isArray(payload.neighbors) &&
    payload.movieIds.length === payload.neighbors.length
  ) {
    const movieIds = payload.movieIds;
    return payload.neighbors.map((flatRow, index) => {
      const rawNeighbors: unknown[] = [];
      if (Array.isArray(flatRow)) {
        for (let offset = 0; offset + 2 < flatRow.length; offset += 3) {
          const neighborIndex = flatRow[offset];
          const similarity = flatRow[offset + 1];
          rawNeighbors.push([
            typeof neighborIndex === "number" ? movieIds[neighborIndex] : undefined,
            typeof similarity === "number" ? similarity / 1000 : similarity,
            flatRow[offset + 2],
          ]);
        }
      }
      return [String(movieIds[index]), rawNeighbors];
    });
  }

  throw new Error("Collaborative recommendation model is invalid");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
