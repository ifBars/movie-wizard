import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MoviePosterCard } from "@/components/MoviePosterCard";
import type { Movie } from "@/types";

function createMovie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: "test-movie",
    title: "Test Movie",
    originalLanguage: "en",
    year: 2024,
    runtimeMinutes: 100,
    genres: ["Drama"],
    tags: [],
    directors: ["Director"],
    cast: ["Actor"],
    synopsis: "A test movie.",
    posterTone: "stone",
    popularity: 50,
    criticalScore: 70,
    plexFit: "",
    posterPath: "/test-poster.jpg",
    ...overrides,
  };
}

describe("MoviePosterCard", () => {
  const defaultProps = {
    movie: createMovie(),
    onRate: vi.fn(),
    onToggleIgnored: vi.fn(),
    onToggleWatched: vi.fn(),
    onToggleWatchlist: vi.fn(),
  };

  test("renders movie title and year", () => {
    render(<MoviePosterCard {...defaultProps} />);
    expect(screen.getByText("Test Movie")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
  });

  test("calls onRate when a star is clicked", () => {
    const onRate = vi.fn();
    render(<MoviePosterCard {...defaultProps} onRate={onRate} />);

    const starButton = screen.getByLabelText("Rate 3 stars");
    fireEvent.click(starButton);

    expect(onRate).toHaveBeenCalledWith("test-movie", 3);
  });

  test("rates in half-star steps from the left half of a star", () => {
    const onRate = vi.fn();
    render(<MoviePosterCard {...defaultProps} onRate={onRate} />);

    fireEvent.click(screen.getByLabelText("Rate 3.5 stars"));
    fireEvent.click(screen.getByLabelText("Rate 0.5 stars"));

    expect(onRate).toHaveBeenNthCalledWith(1, "test-movie", 3.5);
    expect(onRate).toHaveBeenNthCalledWith(2, "test-movie", 0.5);
  });

  test("keeps a single tab stop and moves between half stars with arrow keys", () => {
    render(<MoviePosterCard {...defaultProps} />);

    const firstHalf = screen.getByLabelText("Rate 0.5 stars");
    expect(screen.getAllByLabelText(/^Rate \d(\.5)? stars?$/).filter((button) => button.tabIndex === 0)).toEqual([firstHalf]);

    firstHalf.focus();
    fireEvent.keyDown(firstHalf, { key: "ArrowRight" });
    expect(screen.getByLabelText("Rate 1 star")).toHaveFocus();
    fireEvent.keyDown(document.activeElement ?? firstHalf, { key: "End" });
    expect(screen.getByLabelText("Rate 5 stars")).toHaveFocus();
  });

  test("calls onToggleWatched when watched button is clicked", () => {
    const onToggleWatched = vi.fn();
    render(<MoviePosterCard {...defaultProps} onToggleWatched={onToggleWatched} />);

    const watchedButton = screen.getByLabelText("Mark Test Movie watched");
    fireEvent.click(watchedButton);

    expect(onToggleWatched).toHaveBeenCalledWith("test-movie");
  });

  test("calls onToggleWatchlist when watchlist button is clicked", () => {
    const onToggleWatchlist = vi.fn();
    render(<MoviePosterCard {...defaultProps} onToggleWatchlist={onToggleWatchlist} />);

    const watchlistButton = screen.getByLabelText("Add Test Movie to watchlist");
    fireEvent.click(watchlistButton);

    expect(onToggleWatchlist).toHaveBeenCalledWith("test-movie");
  });

  test("calls onToggleIgnored when ignore button is clicked", () => {
    const onToggleIgnored = vi.fn();
    render(<MoviePosterCard {...defaultProps} onToggleIgnored={onToggleIgnored} />);

    const ignoreButton = screen.getByLabelText("Mark Test Movie not interested");
    fireEvent.click(ignoreButton);

    expect(onToggleIgnored).toHaveBeenCalledWith("test-movie");
  });

  test("renders ignored state", () => {
    render(
      <MoviePosterCard
        {...defaultProps}
        state={{
          movieId: "test-movie",
          watched: false,
          watchlist: false,
          ignored: true,
          rating: null,
          updatedAt: "",
        }}
      />,
    );

    expect(screen.getByLabelText("Show interest in Test Movie")).toBeInTheDocument();
  });

  test("renders watchlisted state", () => {
    render(
      <MoviePosterCard
        {...defaultProps}
        state={{
          movieId: "test-movie",
          watched: false,
          watchlist: true,
          ignored: false,
          rating: null,
          updatedAt: "",
        }}
      />,
    );

    expect(screen.getByLabelText("Remove Test Movie from watchlist")).toBeInTheDocument();
  });

  test("calls onOpen when poster or title is clicked", () => {
    const onOpen = vi.fn();
    render(<MoviePosterCard {...defaultProps} onOpen={onOpen} />);

    const posterButton = screen.getByLabelText("Open Test Movie details");
    fireEvent.click(posterButton);

    expect(onOpen).toHaveBeenCalledWith("test-movie");
  });
});
