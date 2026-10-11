import { useExternalSyncEffect } from "@/hooks/useExternalSyncEffect";
import type { ViewId } from "@/lib/navigation";
import { preloadMovieDetailsPage, preloadSettingsPanel, preloadTasteProfilePage } from "@/routes/lazyRoutes";

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
    if (activeView === "profile") {
      preloadTasteProfilePage();
    }
  }, [activeView]);

  useExternalSyncEffect(() => {
    if (!isCatalogLoading && !catalogError) {
      preloadMovieDetailsPage();
    }
  }, [catalogError, isCatalogLoading]);
}
