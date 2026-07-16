import { BookmarkSimple, CheckCircle, Prohibit, Star } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { memo, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { movieDetailPath } from "@/lib/navigation";
import { fadeScale, quickSpring, softSpring } from "@/lib/motion";
import { ratingFromPointerPosition, starRatings } from "@/lib/ratings";
import { cn } from "@/lib/utils";
import type { Movie, Rating, UserMovieState } from "@/types";

const tmdbPosterBaseUrl = "https://image.tmdb.org/t/p/w500";

type MoviePosterCardProps = {
  movie: Movie;
  state?: UserMovieState;
  animateOnMount?: boolean;
  enableLayoutAnimation?: boolean;
  onOpen?: (movieId: string) => void;
  onPreviewIntent?: () => void;
  onRate: (movieId: string, rating: Rating) => void;
  onToggleIgnored: (movieId: string) => void;
  onToggleWatched: (movieId: string) => void;
  onToggleWatchlist: (movieId: string) => void;
};

export const MoviePosterCard = memo(function MoviePosterCard({
  animateOnMount = true,
  enableLayoutAnimation = true,
  movie,
  state,
  onOpen,
  onPreviewIntent,
  onRate,
  onToggleIgnored,
  onToggleWatched,
  onToggleWatchlist,
}: MoviePosterCardProps) {
  const posterUrl = movie.posterPath ? `${tmdbPosterBaseUrl}${movie.posterPath}` : undefined;
  const shouldReduceMotion = useReducedMotion();
  const [previewRating, setPreviewRating] = useState<Rating | null>(null);
  const ratingValue = state?.rating ?? 0;
  const displayedRating = previewRating ?? ratingValue;

  function handleOpenClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!onOpen || event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    event.preventDefault();
    onOpen(movie.id);
  }

  function previewRatingFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPreviewRating(ratingFromPointerPosition(event.clientX - rect.left, rect.width));
  }

  return (
    <motion.article
      className={cn("movie-poster-card", onOpen && "movie-poster-card--clickable", state?.ignored && "is-ignored")}
      layout={enableLayoutAnimation}
      {...(animateOnMount ? fadeScale(shouldReduceMotion) : {})}
      onMouseEnter={onPreviewIntent}
      onFocusCapture={onPreviewIntent}
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      transition={softSpring}
    >
      <a
        className="poster-open-button poster-open-button--art"
        href={movieDetailPath(movie.id)}
        onClick={handleOpenClick}
        aria-label={`Open ${movie.title} details`}
      >
        <motion.div className="poster-art" layout={enableLayoutAnimation}>
          <div className={cn("poster-art__wash bg-gradient-to-br", movie.posterTone)} />
          {posterUrl ? <img className="poster-art__image" src={posterUrl} alt={`${movie.title} poster`} loading="lazy" /> : null}
          <div className={cn("poster-art__grain", posterUrl && "poster-art__grain--image")} />
          {!posterUrl ? (
            <div className="poster-art__content">
              <p>{movie.title}</p>
              <span>{movie.year}</span>
            </div>
          ) : null}
        </motion.div>
      </a>

      <div className="poster-meta">
        <div className="min-w-0">
          {onOpen ? (
            <h3>
              <a className="poster-open-button poster-open-button--title" href={movieDetailPath(movie.id)} onClick={handleOpenClick}>
                {movie.title}
              </a>
            </h3>
          ) : (
            <h3>{movie.title}</h3>
          )}
          <p>{movie.year}</p>
        </div>
        <div className="poster-meta-actions">
          <motion.button
            type="button"
            className={cn("mini-icon-button", state?.ignored && "is-muted-selected")}
            onClick={() => onToggleIgnored(movie.id)}
            aria-label={state?.ignored ? `Show interest in ${movie.title}` : `Mark ${movie.title} not interested`}
            title={state?.ignored ? "Undo not interested" : "Not interested"}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.86 }}
            animate={state?.ignored && !shouldReduceMotion ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={quickSpring}
          >
            <Prohibit weight={state?.ignored ? "fill" : "regular"} />
          </motion.button>
          <motion.button
            type="button"
            className={cn("mini-icon-button", state?.watchlist && "is-selected")}
            onClick={() => onToggleWatchlist(movie.id)}
            aria-label={state?.watchlist ? `Remove ${movie.title} from watchlist` : `Add ${movie.title} to watchlist`}
            title={state?.watchlist ? "Remove from watchlist" : "Add to watchlist"}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.86 }}
            animate={state?.watchlist && !shouldReduceMotion ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={quickSpring}
          >
            <BookmarkSimple weight={state?.watchlist ? "fill" : "regular"} />
          </motion.button>
        </div>
      </div>

      <div
        className={cn("rating-row", previewRating !== null && "is-previewing")}
        aria-label={`Rate ${movie.title}`}
        onPointerLeave={() => setPreviewRating(null)}
      >
        <div className="rating-stars" onPointerMove={previewRatingFromPointer}>
          {starRatings.map((rating) => (
            <motion.button
              key={rating}
              type="button"
              onClick={() => onRate(movie.id, rating)}
              onFocus={() => setPreviewRating(rating)}
              onBlur={() => setPreviewRating(null)}
              aria-label={`Rate ${rating} stars`}
              className={cn(rating <= displayedRating && "is-filled", previewRating === rating && "is-preview-target")}
              whileHover={shouldReduceMotion ? undefined : { y: -1, scale: 1.12 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.82 }}
              animate={
                displayedRating === rating && !shouldReduceMotion
                  ? { scale: [1, 1.22, 1], rotate: previewRating ? 0 : [0, -8, 0] }
                  : { scale: 1, rotate: 0 }
              }
              transition={{ duration: 0.18 }}
            >
              <Star weight={rating <= displayedRating ? "fill" : "regular"} />
            </motion.button>
          ))}
        </div>
        <motion.button
          type="button"
          className={cn("watched-toggle", state?.watched && "is-selected")}
          onClick={() => onToggleWatched(movie.id)}
          aria-label={state?.watched ? `Mark ${movie.title} unwatched` : `Mark ${movie.title} watched`}
          title={state?.watched ? "Watched" : "Mark watched"}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.84 }}
          animate={state?.watched && !shouldReduceMotion ? { scale: [1, 1.18, 1] } : { scale: 1 }}
          transition={quickSpring}
        >
          <CheckCircle weight={state?.watched ? "fill" : "regular"} />
        </motion.button>
      </div>
    </motion.article>
  );
});
