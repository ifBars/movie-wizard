import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MovieRow } from "@/components/MovieRow";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";
import type { ViewId } from "@/lib/navigation";
import { fadeSlide, softSpring } from "@/lib/motion";
import type { Movie } from "@/types";

type CatalogViewProps = {
  activeView: ViewId;
  search: string;
  topPicks: Movie[];
  recentReleases: Movie[];
  filteredCatalog: Movie[];
  library: MovieLibrary;
  onOpenMovie: (movieId: string) => void;
  onPreloadMovieDetails?: () => void;
};

export function CatalogView({
  activeView,
  search,
  topPicks,
  recentReleases,
  filteredCatalog,
  library,
  onOpenMovie,
  onPreloadMovieDetails,
}: CatalogViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const trimmedSearch = search.trim();

  return (
    <div className="catalog-motion-grid">
      <motion.section className="catalog-main" layout transition={softSpring}>
        <AnimatePresence initial={false}>
          <motion.div key={`${activeView}-${trimmedSearch ? "search" : "default"}`} {...fadeSlide(shouldReduceMotion, 10)}>
            {activeView === "discover" ? (
              <DiscoverRows
                search={trimmedSearch}
                filteredCatalog={filteredCatalog}
                topPicks={topPicks}
                recentReleases={recentReleases}
                library={library}
                onOpenMovie={onOpenMovie}
                onPreloadMovieDetails={onPreloadMovieDetails}
              />
            ) : activeView === "rated" || activeView === "history" ? (
              <MovieRow
                title="rated movies"
                subtitle="Your watched history"
                movies={library.ratedMovies}
                library={library}
                onOpenMovie={onOpenMovie}
                onMovieIntent={onPreloadMovieDetails}
              />
            ) : (
              <MovieRow
                title="watchlist"
                subtitle="Candidates for your Plex server"
                movies={library.watchlistMovies}
                library={library}
                onOpenMovie={onOpenMovie}
                onMovieIntent={onPreloadMovieDetails}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.section>
    </div>
  );
}

function DiscoverRows({
  search,
  filteredCatalog,
  topPicks,
  recentReleases,
  library,
  onOpenMovie,
  onPreloadMovieDetails,
}: {
  search: string;
  filteredCatalog: Movie[];
  topPicks: Movie[];
  recentReleases: Movie[];
  library: MovieLibrary;
  onOpenMovie: (movieId: string) => void;
  onPreloadMovieDetails?: () => void;
}) {
  if (search) {
    return (
      <MovieRow
        title="search results"
        subtitle={`${filteredCatalog.length} matches in the local catalog`}
        movies={filteredCatalog}
        library={library}
        onOpenMovie={onOpenMovie}
        onMovieIntent={onPreloadMovieDetails}
      />
    );
  }

  return (
    <>
      <MovieRow
        title="top picks"
        subtitle="Recommended for you"
        movies={topPicks}
        library={library}
        onOpenMovie={onOpenMovie}
        onMovieIntent={onPreloadMovieDetails}
      />
      <MovieRow
        title="recent releases"
        subtitle="New and noteworthy"
        movies={recentReleases}
        library={library}
        onOpenMovie={onOpenMovie}
        onMovieIntent={onPreloadMovieDetails}
      />
      <PrivacyNote />
    </>
  );
}

function PrivacyNote() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.p className="privacy-note" {...fadeSlide(shouldReduceMotion, 6)}>
      Your ratings stay private on this device. Movie data and images from TMDB. <button type="button">Learn more</button>
    </motion.p>
  );
}
