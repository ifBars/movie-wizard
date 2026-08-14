import { lazy } from "react";
import { preloadMovieDetails } from "@/lib/catalogRepository";

export const LazyMovieDetailsPage = lazy(() =>
  import("@/pages/MovieDetailsPage").then((module) => ({
    default: module.MovieDetailsPage,
  })),
);

export const LazySettingsPanel = lazy(() =>
  import("@/components/SettingsPanel").then((module) => ({
    default: module.SettingsPanel,
  })),
);

export function preloadMovieDetailsPage(movieId?: string) {
  void import("@/pages/MovieDetailsPage");
  if (movieId) {
    preloadMovieDetails(movieId);
  }
}

export function preloadSettingsPanel() {
  void import("@/components/SettingsPanel");
}
