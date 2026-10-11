import { getAudienceScore } from "@/lib/audienceRatings";
import type { Movie, MovieStateMap } from "@/types";

export type LibrarySortOrder = "recent" | "rating-desc" | "rating-asc" | "audience-desc" | "year-desc" | "year-asc" | "title";

export const librarySortOptions: Array<{ value: LibrarySortOrder; label: string; needsRatings?: boolean }> = [
  { value: "recent", label: "Recently updated" },
  { value: "rating-desc", label: "Your rating: high to low", needsRatings: true },
  { value: "rating-asc", label: "Your rating: low to high", needsRatings: true },
  { value: "audience-desc", label: "Audience score" },
  { value: "year-desc", label: "Release: newest" },
  { value: "year-asc", label: "Release: oldest" },
  { value: "title", label: "Title A–Z" },
];

export function isLibrarySortOrder(value: unknown): value is LibrarySortOrder {
  return librarySortOptions.some((option) => option.value === value);
}

export function sortLibraryMovies(movies: Movie[], states: MovieStateMap, order: LibrarySortOrder): Movie[] {
  const updatedAt = (movie: Movie) => {
    const time = Date.parse(states[movie.id]?.updatedAt ?? "");
    return Number.isNaN(time) ? 0 : time;
  };
  const byRecent = (a: Movie, b: Movie) => updatedAt(b) - updatedAt(a);

  switch (order) {
    case "recent":
      return [...movies].sort(byRecent);
    case "rating-desc":
    case "rating-asc": {
      const direction = order === "rating-desc" ? -1 : 1;
      // Watched-but-unrated movies have no score to rank, so they trail either direction.
      return [...movies].sort((a, b) => {
        const left = states[a.id]?.rating ?? null;
        const right = states[b.id]?.rating ?? null;
        if (left === null || right === null) return left === right ? byRecent(a, b) : left === null ? 1 : -1;
        return (left - right) * direction || byRecent(a, b);
      });
    }
    case "audience-desc":
      return [...movies].sort((a, b) => getAudienceScore(b) - getAudienceScore(a) || byRecent(a, b));
    case "year-desc":
      return [...movies].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
    case "year-asc":
      return [...movies].sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
    case "title":
      return [...movies].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  }
}
