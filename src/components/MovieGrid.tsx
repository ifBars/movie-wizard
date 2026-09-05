import { BookmarkSimple } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { MoviePosterCard } from "@/components/MoviePosterCard";
import { MoviePagination } from "@/components/MoviePagination";
import { useMoviePage } from "@/hooks/useMoviePage";
import { SectionHeader } from "@/components/SectionHeader";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";
import { fadeScale, fadeSlide, softSpring } from "@/lib/motion";
import type { Movie } from "@/types";
import type { ReactNode } from "react";

type MovieGridProps = {
  title: string;
  subtitle: string;
  movies: Movie[];
  library: Pick<MovieLibrary, "states" | "rateMovie" | "toggleIgnored" | "toggleWatched" | "toggleWatchlist">;
  animateCardsOnMount?: boolean;
  enableLayoutAnimation?: boolean;
  onOpenMovie: (movieId: string) => void;
  onMovieIntent?: (movieId: string) => void;
  headerAction?: ReactNode;
};

export function MovieGrid({
  title,
  subtitle,
  movies,
  library,
  animateCardsOnMount = true,
  enableLayoutAnimation = true,
  onOpenMovie,
  onMovieIntent,
  headerAction,
}: MovieGridProps) {
  const shouldReduceMotion = useReducedMotion();
  const { page, pageCount, setPage, visibleMovies } = useMoviePage(movies);

  if (movies.length === 0) {
    return (
      <motion.section className="movie-section" layout {...fadeSlide(shouldReduceMotion, 10)}>
        <SectionHeader title={title} subtitle={subtitle} action={headerAction} />
        <motion.div className="empty-catalog" layout {...fadeScale(shouldReduceMotion)}>
          <BookmarkSimple />
          <h3>No movies found</h3>
          <p>Try a different title, actor, director, genre, or release year.</p>
        </motion.div>
      </motion.section>
    );
  }

  return (
    <motion.section className="movie-section" layout={enableLayoutAnimation} {...fadeSlide(shouldReduceMotion, 10)}>
      <SectionHeader title={title} subtitle={subtitle} action={headerAction} />
      <MoviePagination title={title} page={page} pageCount={pageCount} onPageChange={setPage} />
      <motion.div className="movie-grid" layout={enableLayoutAnimation} transition={softSpring}>
        {visibleMovies.map((movie) => (
          <MoviePosterCard
            key={movie.id}
            animateOnMount={animateCardsOnMount}
            enableLayoutAnimation={enableLayoutAnimation}
            movie={movie}
            state={library.states[movie.id]}
            onRate={library.rateMovie}
            onToggleIgnored={library.toggleIgnored}
            onToggleWatched={library.toggleWatched}
            onToggleWatchlist={library.toggleWatchlist}
            onOpen={onOpenMovie}
            onPreviewIntent={onMovieIntent}
          />
        ))}
      </motion.div>
    </motion.section>
  );
}
