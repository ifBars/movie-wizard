import { useCallback } from "react";
import { useNavigate } from "react-router";
import { movieDetailPath, viewPath } from "@/lib/navigation";
import { preloadMovieDetailsPage } from "@/routes/lazyRoutes";

export function useMovieNavigation() {
  const navigate = useNavigate();

  const openMovie = useCallback(
    (movieId: string) => {
      preloadMovieDetailsPage();
      navigate(movieDetailPath(movieId));
      window.scrollTo({ top: 0 });
    },
    [navigate],
  );

  const closeMovie = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }

    navigate(viewPath("discover"), { replace: true });
  }, [navigate]);

  return {
    closeMovie,
    openMovie,
  };
}
