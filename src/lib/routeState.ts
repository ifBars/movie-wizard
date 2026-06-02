import { matchPath } from "react-router";
import { type ViewId, viewFromPath, viewPath } from "@/lib/navigation";

export type AppRouteState = {
  activeView: ViewId;
  isKnownRoute: boolean;
  selectedMovieId: string | null;
};

export function getAppRouteState(pathname: string): AppRouteState {
  const movieMatch = matchPath("/movie/:movieId", pathname);

  if (movieMatch?.params.movieId) {
    return {
      activeView: "discover",
      isKnownRoute: true,
      selectedMovieId: movieMatch.params.movieId,
    };
  }

  const activeView = viewFromPath(pathname);

  return {
    activeView,
    isKnownRoute: pathname === viewPath(activeView),
    selectedMovieId: null,
  };
}
