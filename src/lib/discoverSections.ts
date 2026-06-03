import type { Movie, MovieStateMap, Recommendation } from "@/types";
import { isAvailableMovieCandidate } from "@/lib/movieEligibility";

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

export function buildDiscoverSections({ visibleMovies, states, recommendations }: DiscoverSectionInput): DiscoverSection[] {
  const candidates = watchableCandidates(visibleMovies, states);
  const broadCandidates = candidates.length > 0 ? candidates : visibleMovies.filter((movie) => !states[movie.id]?.ignored && !states[movie.id]?.watchlist);

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
      movies: byRecentRelease(broadCandidates),
      rowLimit,
    },
    {
      key: "comedy",
      title: "comedy",
      subtitle: "Lighter picks from the filtered catalog",
      movies: byDiscoverScore(broadCandidates.filter((movie) => hasGenre(movie, "Comedy"))),
      rowLimit,
    },
    {
      key: "nostalgic",
      title: "nostalgic",
      subtitle: "Older favorites, cult picks, and coming-of-age staples",
      movies: byDiscoverScore(broadCandidates.filter(isNostalgicMovie)),
      rowLimit,
    },
    {
      key: "highly-rated",
      title: "highly rated",
      subtitle: "Critic-friendly movies with broad catalog appeal",
      movies: byDiscoverScore(broadCandidates.filter((movie) => movie.criticalScore >= 86)),
      rowLimit,
    },
    {
      key: "quick-watches",
      title: "quick watches",
      subtitle: "Shorter runtimes for low-friction browsing",
      movies: byDiscoverScore(broadCandidates.filter((movie) => movie.runtimeMinutes <= quickRuntimeMinutes)),
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

function watchableCandidates(movies: Movie[], states: MovieStateMap) {
  return movies.filter((movie) => isAvailableMovieCandidate(movie, states));
}

function byRecentRelease(movies: Movie[]) {
  return movies
    .filter((movie) => movie.year >= recentReleaseYear)
    .slice()
    .sort((a, b) => b.year - a.year || b.criticalScore - a.criticalScore || b.popularity - a.popularity);
}

function byDiscoverScore(movies: Movie[]) {
  return movies.slice().sort((a, b) => discoverScore(b) - discoverScore(a));
}

function discoverScore(movie: Movie) {
  return movie.criticalScore * 1.25 + movie.popularity * 0.55 + Math.max(0, movie.year - 1980) * 0.08;
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
