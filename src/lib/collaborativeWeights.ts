import type { CollaborativeNeighbor } from "@/lib/collaborativeRecommendations";

// Most MovieLens edges come from a handful of co-raters, so trust each edge in proportion to its support.
const NEIGHBOR_SUPPORT_PRIOR = 8;

export function getNeighborWeight(neighbor: CollaborativeNeighbor) {
  return neighbor.similarity * (neighbor.support / (neighbor.support + NEIGHBOR_SUPPORT_PRIOR));
}
