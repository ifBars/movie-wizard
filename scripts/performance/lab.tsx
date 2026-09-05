import { Profiler, useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { MovieGrid } from "../../src/components/MovieGrid";
import { MovieRow } from "../../src/components/MovieRow";
import { useRecommendations } from "../../src/hooks/useRecommendations";
import { createPerformanceFixture } from "./fixtures";
import type { MovieStateMap, Rating } from "../../src/types";
import "../../src/index.css";

const requestedCount = Number(new URLSearchParams(location.search).get("movies")) || 10_000;
const fixture = createPerformanceFixture(Math.min(100_000, Math.max(100, requestedCount)), Math.min(50_000, Math.floor(requestedCount / 2)));
const noop = () => {};

export function PerformanceLab() {
  const [states, setStates] = useState<MovieStateMap>(fixture.states);
  const [layout, setLayout] = useState("grid");
  const [query, setQuery] = useState("");
  const profileCount = useMemo(() => Object.keys(states).length, [states]);
  const job = useMemo(() => ({ movies: fixture.movies, states, minimumMovieYear: 1990, model: fixture.model }), [states]);
  const recommendations = useRecommendations(job);
  const rateMovie = useCallback((movieId: string, rating: Rating) => setStates((current) => ({ ...current, [movieId]: { ...current[movieId], movieId, rating, watched: true, watchlist: false, ignored: false, updatedAt: new Date().toISOString() } })), []);
  const library = useMemo(() => ({
    states,
    rateMovie,
    toggleIgnored: noop, toggleWatched: noop, toggleWatchlist: noop,
  }), [states, rateMovie]);
  const Collection = layout === "grid" ? MovieGrid : MovieRow;
  return <main style={{ padding: "24px" }}>
    <h1>Movie Wizard performance lab</h1>
    <p>Synthetic data only. {fixture.movies.length} movies / {profileCount} profile entries.</p>
    <p><a href="?movies=10000">10k movies</a> · <a href="?movies=50000">50k movies</a> · <a href="?movies=100000">100k movies</a></p>
    <label>Responsiveness probe <input aria-label="Responsiveness probe" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <p>Typed: {query}</p>
    <button onClick={() => setLayout(layout === "grid" ? "row" : "grid")}>Switch layout</button>
    <button onClick={() => library.rateMovie("synthetic-1", states["synthetic-1"].rating === 5 ? 1 : 5)}>Change synthetic rating</button>
    <p role="status">{recommendations.recommendationError ?? (recommendations.isRecommendationsLoading ? "Computing recommendations" : `Ready: ${recommendations.recommendations.length} picks / ${recommendations.discoverSections.length} shelves`)}</p>
    <Profiler id="synthetic-library" onRender={(_id, phase, duration) => performance.measure(`movie-wizard:render:${phase}`, { start: performance.now() - duration, duration })}>
      <Collection title="synthetic library" subtitle={`${fixture.movies.length} movies`} movies={fixture.movies} library={library} onOpenMovie={noop} />
    </Profiler>
  </main>;
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<PerformanceLab />);
