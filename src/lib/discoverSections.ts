import type { Movie, MovieStateMap, Recommendation } from "@/types";
import { createRecommendationSelector } from "@/lib/recommendations";
import type { RecommendationSelector } from "@/lib/recommendations";

export type DiscoverSectionKey = "top-picks" | "recent-releases" | "comedy" | "nostalgic" | "highly-rated" | "quick-watches";

export type DiscoverSection = {
  key: DiscoverSectionKey;
  title: string;
  subtitle: string;
  movies: Movie[];
  rowLimit: number;
};

type DiscoverSectionInput = {
  visibleMovies: Movie[];
  states: MovieStateMap;
  recommendations: Recommendation[];
  minimumRecommendationYear?: number | null;
  selectRecommendations?: RecommendationSelector;
};

const recentReleaseYear = new Date().getFullYear() - 5;
const nostalgicYear = 2005;
const quickRuntimeMinutes = 105;
const rowLimit = 14;

const nostalgicTags = new Set([
  "classic",
  "cult",
  "coming of age",
  "friendship",
  "high school",
  "teen",
  "road movie",
  "nostalgic",
  "retro",
]);

export function buildDiscoverSections({ visibleMovies, states, recommendations, minimumRecommendationYear, selectRecommendations }: DiscoverSectionInput): DiscoverSection[] {
  const selectMovies = selectRecommendations ?? createRecommendationSelector(visibleMovies, states);
  const recommendSectionMovies = (candidateFilter: (movie: Movie) => boolean) =>
    selectMovies({
      minimumMovieYear: minimumRecommendationYear,
      candidateFilter,
    }).map((recommendation) => recommendation.movie);

  const sections: DiscoverSection[] = [
    {
      key: "top-picks",
      title: "top picks",
      subtitle: "Recommended from your ratings",
      movies: recommendations.map((recommendation) => recommendation.movie),
      rowLimit,
    },
    {
      key: "recent-releases",
      title: "recent releases",
      subtitle: "Newer movies ready for your watchlist",
      movies: recommendSectionMovies(isRecentRelease),
      rowLimit,
    },
    {
      key: "comedy",
      title: "comedy",
      subtitle: "Lighter picks from the filtered catalog",
      movies: recommendSectionMovies((movie) => hasGenre(movie, "Comedy")),
      rowLimit,
    },
    {
      key: "nostalgic",
      title: "nostalgic",
      subtitle: "Older favorites, cult picks, and coming-of-age staples",
      movies: recommendSectionMovies(isNostalgicMovie),
      rowLimit,
    },
    {
      key: "highly-rated",
      title: "highly rated",
      subtitle: "Critic-friendly movies with broad catalog appeal",
      movies: recommendSectionMovies((movie) => movie.criticalScore >= 86),
      rowLimit,
    },
    {
      key: "quick-watches",
      title: "quick watches",
      subtitle: "Shorter runtimes for low-friction browsing",
      movies: recommendSectionMovies((movie) => movie.runtimeMinutes <= quickRuntimeMinutes),
      rowLimit,
    },
  ];

  return sections.filter((section) => section.movies.length > 0);
}

export function findDiscoverSection(sections: DiscoverSection[], key: string | null) {
  if (key === null) {
    return undefined;
  }

  return sections.find((section) => section.key === key);
}

function isRecentRelease(movie: Movie) {
  return movie.year >= recentReleaseYear;
}

function hasGenre(movie: Movie, genre: string) {
  return movie.genres.some((movieGenre) => movieGenre.toLowerCase() === genre.toLowerCase());
}

function isNostalgicMovie(movie: Movie) {
  if (movie.year <= nostalgicYear) {
    return true;
  }

  return movie.tags.some((tag) => nostalgicTags.has(tag.toLowerCase()));
}
