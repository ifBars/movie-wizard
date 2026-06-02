import { lazy } from "react";

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

export function preloadMovieDetailsPage() {
  void import("@/pages/MovieDetailsPage");
}

export function preloadSettingsPanel() {
  void import("@/components/SettingsPanel");
}
