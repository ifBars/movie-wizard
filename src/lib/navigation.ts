export const views = [
  { id: "discover", label: "Discover" },
  { id: "rated", label: "Rated" },
  { id: "watchlist", label: "Watchlist" },
  { id: "history", label: "History" },
] as const;

export type ViewId = (typeof views)[number]["id"] | "settings";
