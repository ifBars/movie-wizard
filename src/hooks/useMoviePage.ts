import { useMemo, useState } from "react";
import type { Movie } from "@/types";

export const moviePageSize = 48;

export function useMoviePage(movies: Movie[]) {
  const [requestedPage, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(movies.length / moviePageSize));
  const page = Math.min(requestedPage, pageCount - 1);
  const visibleMovies = useMemo(() => movies.slice(page * moviePageSize, (page + 1) * moviePageSize), [movies, page]);
  return { page, pageCount, setPage, visibleMovies };
}
