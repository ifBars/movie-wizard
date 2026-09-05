import type { CatalogSearchEntry, Movie, MovieStateMap, Rating } from "../../src/types";
import type { CollaborativeModel } from "../../src/lib/collaborativeRecommendations";

const genres = ["Drama", "Action", "Comedy", "Science Fiction", "Thriller", "Animation", "Documentary"];
const ratings: Rating[] = [0.5, 1, 2, 3, 3.5, 4, 4.5, 5];

export function createPerformanceFixture(movieCount: number, profileCount: number) {
  const movies: Movie[] = Array.from({ length: movieCount }, (_, i) => ({
    id: `synthetic-${i}`,
    title: `Synthetic Movie ${i}`,
    originalLanguage: i % 10 === 0 ? "fr" : "en",
    year: 1960 + i % 67,
    runtimeMinutes: 70 + i % 130,
    genres: [genres[i % genres.length], genres[(i + 1) % genres.length]],
    tags: [`theme ${i % 300}`, `setting ${i % 97}`, "friendship", "adventure", `topic ${i % 41}`],
    directors: [`Director ${i % 800}`],
    cast: Array.from({ length: 5 }, (_, j) => `Actor ${(i * 7 + j * 13) % 4000}`),
    synopsis: `A story of friendship and adventure in setting ${i % 97}. A family faces a mysterious challenge and discovers a new world.`,
    posterTone: "stone",
    popularity: (i * 17) % 100,
    criticalScore: 40 + i % 61,
    plexFit: "",
  }));
  const states: MovieStateMap = {};
  for (let i = 0; i < Math.min(profileCount, movieCount); i++) {
    const movieId = movies[i].id;
    states[movieId] = {
      movieId,
      rating: i % 5 === 0 ? null : ratings[i % ratings.length],
      watched: i % 5 !== 0,
      watchlist: i % 5 === 0,
      ignored: false,
      updatedAt: new Date(Date.UTC(2026, 0, 1 + i % 200)).toISOString(),
    };
  }
  const model: CollaborativeModel = new Map(movies.slice(0, profileCount).map((movie, i) => [movie.id,
    Array.from({ length: 16 }, (_, j) => ({ movieId: movies[(i * 31 + j * 101 + profileCount) % movieCount].id, similarity: 0.1 + j / 25, support: 3 + j })),
  ]));
  const entries: CatalogSearchEntry[] = movies.map((movie) => [movie.id,
    `${movie.title} ${movie.genres.join(" ")} ${movie.directors.join(" ")} ${movie.cast.join(" ")} ${movie.synopsis}`.toLowerCase(),
    movie.originalLanguage, 0, movie.year, movie.runtimeMinutes, movie.genres.join("|").toLowerCase(), movie.criticalScore, movie.popularity,
  ]);
  return { movies, states, model, entries };
}
