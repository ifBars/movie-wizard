import { ListBullets, SortAscending, SquaresFour } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import type { PointerEvent } from "react";
import { DiscoverPage, SearchResults } from "@/components/DiscoverPage";
import { MovieGrid } from "@/components/MovieGrid";
import { MovieRow } from "@/components/MovieRow";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";
import type { CatalogBrowseFilters } from "@/lib/catalogBrowse";
import type { DiscoverSection } from "@/lib/discoverSections";
import { isLibrarySortOrder, librarySortOptions, sortLibraryMovies } from "@/lib/librarySort";
import type { LibrarySortOrder } from "@/lib/librarySort";
import type { ViewId } from "@/lib/navigation";
import { pageFade } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types";

type CatalogLayout = "grid" | "row";

type CatalogViewProps = {
  activeView: ViewId;
  search: string;
  browseFilters: CatalogBrowseFilters;
  discoverSections: DiscoverSection[];
  filteredCatalog: Movie[];
  isSearchLoading: boolean;
  searchResultTotal: number;
  library: MovieLibrary;
  includeWatched: boolean;
  onIncludeWatchedChange: (includeWatched: boolean) => void;
  onLoadMoreSearch: () => void;
  onOpenMovie: (movieId: string) => void;
  onPreloadMovieDetails?: (movieId: string) => void;
};

export function CatalogView({
  activeView,
  browseFilters,
  search,
  discoverSections,
  filteredCatalog,
  isSearchLoading,
  searchResultTotal,
  library,
  includeWatched,
  onIncludeWatchedChange,
  onLoadMoreSearch,
  onOpenMovie,
  onPreloadMovieDetails,
}: CatalogViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const trimmedSearch = search.trim();
  const [searchLayout, setSearchLayout] = useState<CatalogLayout>("grid");

  return (
    <div className="catalog-motion-grid">
      <section className="catalog-main">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={`${activeView}-${trimmedSearch ? "search" : "default"}`} className="catalog-view-panel" {...pageFade(shouldReduceMotion)}>
            {trimmedSearch || catalogDataIsFiltered(browseFilters) ? (
              <SearchResults
                key={trimmedSearch}
                filteredCatalog={filteredCatalog}
                isLoading={isSearchLoading}
                layout={searchLayout}
                library={library}
                includeWatched={includeWatched}
                onIncludeWatchedChange={onIncludeWatchedChange}
                onLoadMore={onLoadMoreSearch}
                onLayoutChange={setSearchLayout}
                onOpenMovie={onOpenMovie}
                onPreloadMovieDetails={onPreloadMovieDetails}
                totalResults={searchResultTotal}
                browseFilters={browseFilters}
                search={trimmedSearch}
              />
            ) : activeView === "discover" ? (
              <DiscoverPage
                discoverSections={discoverSections}
                library={library}
                onOpenMovie={onOpenMovie}
                onPreloadMovieDetails={onPreloadMovieDetails}
              />
            ) : activeView === "history" ? (
              <HistoryMovies
                movies={library.historyMovies}
                library={library}
                onOpenMovie={onOpenMovie}
                onPreloadMovieDetails={onPreloadMovieDetails}
              />
            ) : (
              <WatchlistMovies
                movies={library.watchlistMovies}
                library={library}
                onOpenMovie={onOpenMovie}
                onPreloadMovieDetails={onPreloadMovieDetails}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

function catalogDataIsFiltered(filters: CatalogBrowseFilters) {
  return filters.genre !== "" || filters.era !== "" || filters.runtime !== "" || filters.sort !== "relevance";
}

function WatchlistMovies({
  movies,
  library,
  onOpenMovie,
  onPreloadMovieDetails,
}: {
  movies: Movie[];
  library: MovieLibrary;
  onOpenMovie: (movieId: string) => void;
  onPreloadMovieDetails?: (movieId: string) => void;
}) {
  const [layout, setLayout] = useState<CatalogLayout>("grid");
  const [sortOrder, setSortOrder] = useLibrarySortOrder("watchlist");
  const sortedMovies = useMemo(() => sortLibraryMovies(movies, library.states, sortOrder), [library.states, movies, sortOrder]);
  const headerAction = (
    <div className="library-view-controls">
      <LibrarySortSelect value={sortOrder} onChange={setSortOrder} label="Sort watchlist" includeRatingOrders={false} />
      <MovieLayoutToggle layout={layout} onLayoutChange={setLayout} label="Watchlist layout" />
    </div>
  );
  const sharedProps = {
    title: "watchlist",
    subtitle: "Saved movies to consider next",
    movies: sortedMovies,
    library,
    onOpenMovie,
    onMovieIntent: onPreloadMovieDetails,
    headerAction,
  };

  return layout === "row" ? (
    <MovieRow {...sharedProps} />
  ) : (
    <MovieGrid {...sharedProps} animateCardsOnMount={false} enableLayoutAnimation={false} />
  );
}

function HistoryMovies({
  movies,
  library,
  onOpenMovie,
  onPreloadMovieDetails,
}: {
  movies: Movie[];
  library: MovieLibrary;
  onOpenMovie: (movieId: string) => void;
  onPreloadMovieDetails?: (movieId: string) => void;
}) {
  const [layout, setLayout] = useState<CatalogLayout>("grid");
  const [sortOrder, setSortOrder] = useLibrarySortOrder("history");
  const sortedMovies = useMemo(() => sortLibraryMovies(movies, library.states, sortOrder), [library.states, movies, sortOrder]);
  const headerAction = (
    <div className="library-view-controls">
      <LibrarySortSelect value={sortOrder} onChange={setSortOrder} label="Sort history" includeRatingOrders />
      <MovieLayoutToggle layout={layout} onLayoutChange={setLayout} label="History layout" />
    </div>
  );
  const subtitle =
    movies.length === 1 ? "1 watched or rated movie" : `${movies.length} watched or rated movies`;
  const sharedProps = {
    title: "history",
    subtitle,
    movies: sortedMovies,
    library,
    onOpenMovie,
    onMovieIntent: onPreloadMovieDetails,
    headerAction,
  };

  return layout === "row" ? (
    <MovieRow {...sharedProps} />
  ) : (
    <MovieGrid {...sharedProps} animateCardsOnMount={false} enableLayoutAnimation={false} />
  );
}

const sortStoragePrefix = "movie-wizard:library-sort:";

function useLibrarySortOrder(view: "history" | "watchlist") {
  const storageKey = `${sortStoragePrefix}${view}`;
  const [sortOrder, setSortOrderState] = useState<LibrarySortOrder>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return isLibrarySortOrder(stored) ? stored : "recent";
    } catch {
      return "recent";
    }
  });

  function setSortOrder(order: LibrarySortOrder) {
    setSortOrderState(order);
    try {
      localStorage.setItem(storageKey, order);
    } catch {
      // The choice still applies for this visit when storage is unavailable.
    }
  }

  return [sortOrder, setSortOrder] as const;
}

function LibrarySortSelect({
  value,
  label,
  includeRatingOrders,
  onChange,
}: {
  value: LibrarySortOrder;
  label: string;
  includeRatingOrders: boolean;
  onChange: (order: LibrarySortOrder) => void;
}) {
  const options = librarySortOptions.filter((option) => includeRatingOrders || !option.needsRatings);

  return (
    <label className="library-sort">
      <SortAscending weight="bold" aria-hidden="true" />
      <select
        aria-label={label}
        value={options.some((option) => option.value === value) ? value : "recent"}
        onChange={(event) => {
          const order = event.target.value;
          if (isLibrarySortOrder(order)) onChange(order);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MovieLayoutToggle({
  layout,
  label,
  onLayoutChange,
}: {
  layout: CatalogLayout;
  label: string;
  onLayoutChange: (layout: CatalogLayout) => void;
}) {
  const shouldReduceMotion = useReducedMotion();

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, nextLayout: CatalogLayout) {
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      onLayoutChange(nextLayout);
    }
  }

  return (
    <div className="view-toggle search-results-view-toggle" role="group" aria-label={label}>
      <motion.button
        type="button"
        className={cn(layout === "grid" && "is-selected")}
        aria-pressed={layout === "grid"}
        onPointerDown={(event) => handlePointerDown(event, "grid")}
        onClick={() => onLayoutChange("grid")}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
      >
        <SquaresFour weight="bold" />
        <span>Grid</span>
      </motion.button>
      <motion.button
        type="button"
        className={cn(layout === "row" && "is-selected")}
        aria-pressed={layout === "row"}
        onPointerDown={(event) => handlePointerDown(event, "row")}
        onClick={() => onLayoutChange("row")}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
      >
        <ListBullets weight="bold" />
        <span>Row</span>
      </motion.button>
    </div>
  );
}
