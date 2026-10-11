export const views = [
  { id: "discover", label: "Discover", path: "/" },
  { id: "watchlist", label: "Watchlist", path: "/watchlist" },
  { id: "history", label: "History", path: "/history" },
] as const;

export type ViewId = (typeof views)[number]["id"] | "settings" | "profile";

export const settingsPath = "/settings";
export const profilePath = "/profile";

const viewByPath = new Map<string, ViewId>([
  ...views.map((view) => [view.path, view.id] as const),
  ["/rated", "history"],
  [settingsPath, "settings"],
  [profilePath, "profile"],
]);

export function viewPath(viewId: ViewId) {
  if (viewId === "settings") {
    return settingsPath;
  }

  if (viewId === "profile") {
    return profilePath;
  }

  return views.find((view) => view.id === viewId)?.path ?? "/";
}

export function viewFromPath(pathname: string): ViewId {
  return viewByPath.get(pathname) ?? "discover";
}

export function movieDetailPath(movieId: string) {
  return `/movie/${encodeURIComponent(movieId)}`;
}
