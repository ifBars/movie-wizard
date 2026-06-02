import { ListBullets, SquaresFour } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import type { PointerEvent } from "react";
import { DiscoverPage } from "@/components/DiscoverPage";
import { MovieGrid } from "@/components/MovieGrid";
import { MovieRow } from "@/components/MovieRow";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";
import type { DiscoverSection } from "@/lib/discoverSections";
import type { ViewId } from "@/lib/navigation";
import { pageFade } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types";

type CatalogLayout = "grid" | "row";

type CatalogViewProps = {
  activeView: ViewId;
  search: string;
  discoverSections: DiscoverSection[];
  filteredCatalog: Movie[];
  library: MovieLibrary;
  onOpenMovie: (movieId: string) => void;
  onPreloadMovieDetails?: () => void;
};

export function CatalogView({
  activeView,
  search,
  discoverSections,
  filteredCatalog,
  library,
  onOpenMovie,
  onPreloadMovieDetails,
}: CatalogViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const trimmedSearch = search.trim();

  return (
    <div className="catalog-motion-grid">
      <section className="catalog-main">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={`${activeView}-${trimmedSearch ? "search" : "default"}`} className="catalog-view-panel" {...pageFade(shouldReduceMotion)}>
            {activeView === "discover" ? (
              <DiscoverPage
                search={trimmedSearch}
                filteredCatalog={filteredCatalog}
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

function WatchlistMovies({
  movies,
  library,
  onOpenMovie,
  onPreloadMovieDetails,
}: {
  movies: Movie[];
  library: MovieLibrary;
  onOpenMovie: (movieId: string) => void;
  onPreloadMovieDetails?: () => void;
}) {
  const [layout, setLayout] = useState<CatalogLayout>("row");
  const headerAction = <MovieLayoutToggle layout={layout} onLayoutChange={setLayout} label="Watchlist layout" />;
  const sharedProps = {
    title: "watchlist",
    subtitle: "Saved movies to consider next",
    movies,
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
  onPreloadMovieDetails?: () => void;
}) {
  const [layout, setLayout] = useState<CatalogLayout>("grid");
  const headerAction = <MovieLayoutToggle layout={layout} onLayoutChange={setLayout} label="History layout" />;
  const subtitle =
    movies.length === 1 ? "1 watched or rated movie" : `${movies.length} watched or rated movies`;
  const sharedProps = {
    title: "history",
    subtitle,
    movies,
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
