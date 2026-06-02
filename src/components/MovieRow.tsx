import { BookmarkSimple, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MoviePosterCard } from "@/components/MoviePosterCard";
import { SectionHeader } from "@/components/SectionHeader";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";
import { fadeScale, fadeSlide, quickSpring, softSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types";

type MovieRowProps = {
  title: string;
  subtitle: string;
  movies: Movie[];
  library: MovieLibrary;
  onOpenMovie: (movieId: string) => void;
  onMovieIntent?: () => void;
};

export function MovieRow({ title, subtitle, movies, library, onOpenMovie, onMovieIntent }: MovieRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const {
    canScrollLeft,
    canScrollRight,
    isDragging,
    onClickCapture,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onScroll,
    ref: rowRef,
    scrollByPage,
  } = useHorizontalScroll({
    itemCount: movies.length,
    shouldReduceMotion,
  });

  if (movies.length === 0) {
    return (
      <motion.section className="movie-section" layout {...fadeSlide(shouldReduceMotion, 10)}>
        <SectionHeader title={title} subtitle={subtitle} />
        <motion.div className="empty-catalog" layout {...fadeScale(shouldReduceMotion)}>
          <BookmarkSimple />
          <h3>No movies here yet</h3>
          <p>Rate movies or add titles to your watchlist to fill this row.</p>
        </motion.div>
      </motion.section>
    );
  }

  return (
    <motion.section className="movie-section" layout {...fadeSlide(shouldReduceMotion, 10)}>
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="movie-row-frame">
        <AnimatePresence initial={false}>
          {canScrollLeft ? (
            <motion.button
              key="left"
              type="button"
              className="row-edge row-edge--left"
              onClick={() => scrollByPage("left")}
              aria-label={`Scroll ${title} left`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
              transition={quickSpring}
            >
              <CaretLeft weight="bold" />
            </motion.button>
          ) : null}
        </AnimatePresence>
        <motion.div
          className={cn("movie-row", isDragging && "is-dragging")}
          ref={rowRef}
          layout
          transition={softSpring}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClickCapture={onClickCapture}
        >
          {movies.map((movie) => (
            <MoviePosterCard
              key={movie.id}
              movie={movie}
              state={library.states[movie.id]}
              onRate={library.rateMovie}
              onToggleWatched={library.toggleWatched}
              onToggleWatchlist={library.toggleWatchlist}
              onOpen={onOpenMovie}
              onPreviewIntent={onMovieIntent}
            />
          ))}
        </motion.div>
        <AnimatePresence initial={false}>
          {canScrollRight ? (
            <motion.button
              key="right"
              type="button"
              className="row-edge row-edge--right"
              onClick={() => scrollByPage("right")}
              aria-label={`Scroll ${title} right`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
              transition={quickSpring}
            >
              <CaretRight weight="bold" />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
