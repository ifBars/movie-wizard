import { useEffect } from "react";
import type { ViewId } from "@/lib/navigation";
import { preloadMovieDetailsPage, preloadSettingsPanel } from "@/routes/lazyRoutes";

type RoutePreloadingOptions = {
  activeView: ViewId;
  catalogError: string | null;
  isCatalogLoading: boolean;
};

export function useRoutePreloading({ activeView, catalogError, isCatalogLoading }: RoutePreloadingOptions) {
  useEffect(() => {
    if (activeView === "settings") {
      preloadSettingsPanel();
    }
  }, [activeView]);

  useEffect(() => {
    if (!isCatalogLoading && !catalogError) {
      preloadMovieDetailsPage();
    }
  }, [catalogError, isCatalogLoading]);
}
