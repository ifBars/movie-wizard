import { useMemo } from "react";
import { useLocation } from "react-router";
import { getAppRouteState } from "@/lib/routeState";

export function useAppRouteState() {
  const location = useLocation();
  const routeState = useMemo(() => getAppRouteState(location.pathname), [location.pathname]);

  return {
    ...routeState,
    pathname: location.pathname,
    locationKey: location.key,
  };
}
