export type Rating = 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5;

export type Movie = {
  id: string;
  tmdbId?: number;
  imdbId?: string;
  title: string;
  originalTitle?: string;
  year: number;
  releaseDate?: string;
  runtimeMinutes: number;
  genres: string[];
  tags: string[];
  directors: string[];
  cast: string[];
  synopsis: string;
  posterPath?: string;
  backdropPath?: string;
  posterTone: string;
  popularity: number;
  criticalScore: number;
  plexFit: string;
  source?: {
    tmdbUpdatedAt?: string;
    omdbUpdatedAt?: string;
    tmdbVoteAverage?: number;
    tmdbVoteCount?: number;
    omdbImdbRating?: number;
    omdbImdbVotes?: number;
    omdbMetascore?: number;
  };
};

export type UserMovieState = {
  movieId: string;
  watched: boolean;
  watchlist: boolean;
  ignored: boolean;
  rating: Rating | null;
  updatedAt: string;
};

export type MovieStateMap = Record<string, UserMovieState>;

export type TasteProfile = {
  ratedCount: number;
  watchedCount: number;
  averageRating: number;
  topGenres: Array<{ name: string; weight: number }>;
  topTags: Array<{ name: string; weight: number }>;
};

export type Recommendation = {
  movie: Movie;
  score: number;
  confidence: "low" | "medium" | "high";
  reasons: string[];
};
