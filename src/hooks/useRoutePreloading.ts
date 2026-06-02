import { useExternalSyncEffect } from "@/hooks/useExternalSyncEffect";
import type { ViewId } from "@/lib/navigation";
import { preloadMovieDetailsPage, preloadSettingsPanel } from "@/routes/lazyRoutes";

type RoutePreloadingOptions = {
  activeView: ViewId;
  catalogError: string | null;
  isCatalogLoading: boolean;
};

export function useRoutePreloading({ activeView, catalogError, isCatalogLoading }: RoutePreloadingOptions) {
  useExternalSyncEffect(() => {
    if (activeView === "settings") {
      preloadSettingsPanel();
    }
  }, [activeView]);

  useExternalSyncEffect(() => {
    if (!isCatalogLoading && !catalogError) {
      preloadMovieDetailsPage();
    }
  }, [catalogError, isCatalogLoading]);
}
