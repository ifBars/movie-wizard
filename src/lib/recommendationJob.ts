import { buildTasteSnapshot } from "@/lib/recommendations";
import { buildDiscoverSections } from "@/lib/discoverSections";
import type { DiscoverSection } from "@/lib/discoverSections";
import type { CollaborativeModel } from "@/lib/collaborativeRecommendations";
import type { Movie, MovieStateMap, Recommendation, TasteProfile } from "@/types";

export type RecommendationJob = {
  movies: Movie[];
  states: MovieStateMap;
  minimumMovieYear: number | null;
  model?: CollaborativeModel;
};

export type RecommendationJobResult = {
  profile: TasteProfile;
  recommendations: Array<Omit<Recommendation, "movie"> & { movieId: string }>;
  sections: Array<Omit<DiscoverSection, "movies"> & { movieIds: string[] }>;
};

export type RecommendationWorkerRequest = Omit<RecommendationJob, "movies"> & {
  requestId: number;
  movies?: Movie[];
  modelChanged: boolean;
  replaceStates: boolean;
  removedMovieIds: string[];
};

export type RecommendationWorkerResponse =
  | { requestId: number; result: RecommendationJobResult }
  | { requestId: number; error: string };

export function runRecommendationJob({ movies, states, minimumMovieYear, model }: RecommendationJob): RecommendationJobResult {
  const snapshot = buildTasteSnapshot(movies, states, { minimumMovieYear }, model);
  const sections = buildDiscoverSections({
    visibleMovies: movies,
    states,
    recommendations: snapshot.recommendations,
    selectRecommendations: snapshot.selectRecommendations,
    minimumRecommendationYear: minimumMovieYear,
  });
  return {
    profile: snapshot.profile,
    recommendations: snapshot.recommendations.map(({ movie, ...recommendation }) => ({ ...recommendation, movieId: movie.id })),
    sections: sections.map(({ movies: sectionMovies, ...section }) => ({ ...section, movieIds: sectionMovies.map((movie) => movie.id) })),
  };
}
