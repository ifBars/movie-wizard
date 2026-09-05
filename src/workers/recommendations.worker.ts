import { runRecommendationJob } from "@/lib/recommendationJob";
import type { RecommendationWorkerRequest, RecommendationWorkerResponse } from "@/lib/recommendationJob";
import type { CollaborativeModel } from "@/lib/collaborativeRecommendations";
import type { Movie, MovieStateMap } from "@/types";

let movies: Movie[] = [];
let model: CollaborativeModel | undefined;
let states: MovieStateMap = {};

self.onmessage = ({ data }: MessageEvent<RecommendationWorkerRequest>) => {
  if (data.movies) movies = data.movies;
  if (data.modelChanged) model = data.model;
  if (data.replaceStates) states = data.states;
  else {
    for (const id of data.removedMovieIds) delete states[id];
    Object.assign(states, data.states);
  }
  try {
    self.postMessage({ requestId: data.requestId, result: runRecommendationJob({ ...data, movies, model, states }) } satisfies RecommendationWorkerResponse);
  } catch (error: unknown) {
    self.postMessage({ requestId: data.requestId, error: error instanceof Error ? error.message : "Recommendation calculation failed" } satisfies RecommendationWorkerResponse);
  }
};
