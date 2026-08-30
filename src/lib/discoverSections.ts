import type { Movie, MovieStateMap, Recommendation } from "@/types";
import { createRecommendationSelector } from "@/lib/recommendations";
import type { RecommendationSelector } from "@/lib/recommendations";

export type DiscoverSectionKey =
  | "top-picks"
  | "recent-releases"
  | "comedy"
  | "sad-movies"
  | "action"
  | "science-fiction"
  | "thrillers"
  | "animation"
  | "documentaries"
  | "nostalgic"
  | "nineties"
  | "hidden-gems"
  | "highly-rated"
  | "quick-watches";

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

const sadMovieTags = new Set([
  "bereavement",
  "bittersweet",
  "child loss",
  "dark and emotional tone",
  "death in family",
  "death of a child",
  "death of family",
  "death of friend",
  "death of lover",
  "death of parent",
  "death of pet",
  "death of sibling",
  "death of son",
  "death of spouse",
  "death of wife",
  "emotional journey",
  "emotional trauma",
  "family tragedy",
  "grief",
  "heartbreak",
  "life after personal tragedy",
  "loss of child",
  "loss of family",
  "loss of loved one",
  "loss of mother",
  "loss of son",
  "love and loss",
  "melancholy",
  "sadness",
  "terminal illness",
  "tragedy",
  "tragic love",
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
      key: "sad-movies",
      title: "sad movies",
      subtitle: "Bittersweet stories for when you need a good cry",
      movies: recommendSectionMovies(isSadMovie),
      rowLimit,
    },
    {
      key: "action",
      title: "action",
      subtitle: "Big momentum, close calls, and crowd-pleasing set pieces",
      movies: recommendSectionMovies((movie) => hasGenre(movie, "Action")),
      rowLimit,
    },
    {
      key: "science-fiction",
      title: "science fiction",
      subtitle: "Future worlds, strange ideas, and speculative stories",
      movies: recommendSectionMovies((movie) => hasGenre(movie, "Science Fiction")),
      rowLimit,
    },
    {
      key: "thrillers",
      title: "thrillers",
      subtitle: "Tense mysteries and stories that keep moving",
      movies: recommendSectionMovies((movie) => hasGenre(movie, "Thriller")),
      rowLimit,
    },
    {
      key: "animation",
      title: "animation",
      subtitle: "Hand-drawn, stop-motion, and digital worlds",
      movies: recommendSectionMovies((movie) => hasGenre(movie, "Animation")),
      rowLimit,
    },
    {
      key: "documentaries",
      title: "documentaries",
      subtitle: "Remarkable people, places, and true stories",
      movies: recommendSectionMovies((movie) => hasGenre(movie, "Documentary")),
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
      key: "nineties",
      title: "the ’90s",
      subtitle: "A decade of indies, blockbusters, and enduring favorites",
      movies: recommendSectionMovies((movie) => movie.year >= 1990 && movie.year <= 1999),
      rowLimit,
    },
    {
      key: "hidden-gems",
      title: "hidden gems",
      subtitle: "Strong reviews without the biggest spotlight",
      movies: recommendSectionMovies((movie) => movie.criticalScore >= 78 && movie.popularity <= 35),
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

function isSadMovie(movie: Movie) {
  return movie.tags.some((tag) => sadMovieTags.has(tag.toLowerCase()));
}
