import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MovieGrid } from "@/components/MovieGrid";
import { MovieRow } from "@/components/MovieRow";
import { createPerformanceFixture } from "../../scripts/performance/fixtures";

const fixture = createPerformanceFixture(10_000, 0);
const library = { states: {}, rateMovie: vi.fn(), toggleIgnored: vi.fn(), toggleWatched: vi.fn(), toggleWatchlist: vi.fn() };
let intersectionCallbacks: Array<(entries: Array<{ isIntersecting: boolean }>) => void> = [];

beforeEach(() => {
  intersectionCallbacks = [];
  sessionStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
        intersectionCallbacks.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

function reachGridEnd() {
  act(() => intersectionCallbacks.at(-1)?.([{ isIntersecting: true }]));
}

function reachRowEnd() {
  const row = document.querySelector<HTMLElement>(".movie-row");
  if (!row) throw new Error("row not rendered");
  // Like a real row, the scrollable width grows as cards are appended.
  Object.defineProperty(row, "scrollWidth", { configurable: true, get: () => row.children.length * 200 });
  Object.defineProperty(row, "clientWidth", { configurable: true, value: 1000 });
  row.scrollLeft = row.scrollWidth - row.clientWidth;
  fireEvent.scroll(row);
}

describe.each([
  ["grid", MovieGrid, reachGridEnd],
  ["row", MovieRow, reachRowEnd],
] as const)("bounded %s collections", (_name, Collection, reachEnd) => {
  test("mounts at most 48 cards from a large library and loads more at the end", () => {
    const props = { title: "history", subtitle: "10,000 movies", movies: fixture.movies, library, onOpenMovie: vi.fn() };
    const { rerender } = render(<Collection {...props} />);
    expect(screen.getAllByRole("article")).toHaveLength(48);
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();

    reachEnd();
    expect(screen.getAllByRole("article")).toHaveLength(96);
    expect(screen.getByRole("link", { name: "Open Synthetic Movie 0 details" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Synthetic Movie 95 details" })).toBeInTheDocument();

    rerender(<Collection {...props} movies={fixture.movies.slice(0, 1)} />);
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });
});

describe("grid end of list", () => {
  test("asks the caller for more once every loaded movie is shown", () => {
    const onReachEnd = vi.fn();
    render(
      <MovieGrid title="search results" subtitle="" movies={fixture.movies.slice(0, 30)} library={library} onOpenMovie={vi.fn()} onReachEnd={onReachEnd} />,
    );

    reachGridEnd();
    expect(onReachEnd).toHaveBeenCalledTimes(1);
  });

  test("shows a loading status while the next batch is fetched", () => {
    render(
      <MovieGrid title="search results" subtitle="" movies={fixture.movies.slice(0, 30)} library={library} onOpenMovie={vi.fn()} isLoadingMore />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading more movies…");
  });
});
