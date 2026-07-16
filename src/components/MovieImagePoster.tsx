import { motion, useReducedMotion } from "framer-motion";
import type { MouseEvent } from "react";
import { movieDetailPath } from "@/lib/navigation";
import { fadeScale, softSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types";

type MovieImagePosterProps = {
  movie: Movie;
  onOpen: (movieId: string) => void;
};

const tmdbPosterBaseUrl = "https://image.tmdb.org/t/p/w500";

export function MovieImagePoster({ movie, onOpen }: MovieImagePosterProps) {
  const shouldReduceMotion = useReducedMotion();
  const posterUrl = movie.posterPath ? `${tmdbPosterBaseUrl}${movie.posterPath}` : undefined;

  function handleOpenClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    event.preventDefault();
    onOpen(movie.id);
  }

  return (
    <motion.article
      className="movie-image-poster"
      layout
      {...fadeScale(shouldReduceMotion)}
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      transition={softSpring}
    >
      <a href={movieDetailPath(movie.id)} onClick={handleOpenClick} aria-label={`Open ${movie.title} details`}>
        <div className="poster-art">
          <div className={cn("poster-art__wash bg-gradient-to-br", movie.posterTone)} />
          {posterUrl ? <img className="poster-art__image" src={posterUrl} alt={`${movie.title} poster`} loading="lazy" /> : null}
          <div className={cn("poster-art__grain", posterUrl && "poster-art__grain--image")} />
          {!posterUrl ? (
            <div className="poster-art__content">
              <p>{movie.title}</p>
              <span>{movie.year}</span>
            </div>
          ) : null}
        </div>
      </a>
    </motion.article>
  );
}
