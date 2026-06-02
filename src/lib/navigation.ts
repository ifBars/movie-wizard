export const views = [
  { id: "discover", label: "Discover", path: "/" },
  { id: "rated", label: "Rated", path: "/rated" },
  { id: "watchlist", label: "Watchlist", path: "/watchlist" },
  { id: "history", label: "History", path: "/history" },
] as const;

export type ViewId = (typeof views)[number]["id"] | "settings";

export const settingsPath = "/settings";

const viewByPath = new Map<string, ViewId>([
  ...views.map((view) => [view.path, view.id] as const),
  [settingsPath, "settings"],
]);

export function viewPath(viewId: ViewId) {
  if (viewId === "settings") {
    return settingsPath;
  }

  return views.find((view) => view.id === viewId)?.path ?? "/";
}

export function viewFromPath(pathname: string): ViewId {
  return viewByPath.get(pathname) ?? "discover";
}

export function movieDetailPath(movieId: string) {
  return `/movie/${encodeURIComponent(movieId)}`;
}
