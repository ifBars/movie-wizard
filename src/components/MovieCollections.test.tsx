import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MovieGrid } from "@/components/MovieGrid";
import { MovieRow } from "@/components/MovieRow";
import { createPerformanceFixture } from "../../scripts/performance/fixtures";

const fixture = createPerformanceFixture(10_000, 0);
const library = { states: {}, rateMovie: vi.fn(), toggleIgnored: vi.fn(), toggleWatched: vi.fn(), toggleWatchlist: vi.fn() };
afterEach(() => vi.unstubAllGlobals());

describe.each([MovieGrid, MovieRow])("bounded movie collections", (Collection) => {
  test("mounts at most 48 cards from a large library and makes later pages reachable", () => {
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    const props = { title: "history", subtitle: "10,000 movies", movies: fixture.movies, library, onOpenMovie: vi.fn() };
    const { rerender } = render(<Collection {...props} />);
    expect(screen.getAllByRole("article")).toHaveLength(48);
    expect(screen.getByRole("status")).toHaveTextContent("Page 1 of 209");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getAllByRole("article")).toHaveLength(48);
    expect(screen.getByRole("link", { name: "Open Synthetic Movie 48 details" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open Synthetic Movie 0 details" })).not.toBeInTheDocument();
    rerender(<Collection {...props} movies={fixture.movies.slice(0, 1)} />);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
