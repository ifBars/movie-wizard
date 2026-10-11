import { halfStarRatings } from "@/lib/ratings";
import type { Rating, TasteProfile, TasteSignal } from "@/types";

export type TasteSignalShare = TasteSignal & {
  // Rounded share of all listed signal strength, so the shown percentages describe the list as a whole.
  share: number;
  // Strength relative to the strongest signal, for bar widths.
  relative: number;
};

export function toSignalShares(signals: TasteSignal[]): TasteSignalShare[] {
  const strengths = signals.map((signal) => Math.abs(signal.weight));
  const total = strengths.reduce((sum, strength) => sum + strength, 0);
  const strongest = Math.max(0, ...strengths);

  return signals.map((signal, index) => ({
    ...signal,
    share: total > 0 ? Math.round((strengths[index] / total) * 100) : 0,
    relative: strongest > 0 ? strengths[index] / strongest : 0,
  }));
}

export function getMostCommonRating(profile: TasteProfile): Rating | null {
  let bestIndex = -1;
  profile.ratingCounts.forEach((count, index) => {
    // Ties go to the higher rating, which reads more naturally ("mostly 4s" over "mostly 3.5s").
    if (count > 0 && (bestIndex === -1 || count >= profile.ratingCounts[bestIndex])) bestIndex = index;
  });
  return bestIndex === -1 ? null : halfStarRatings[bestIndex];
}

export function describeRatingStyle(profile: TasteProfile) {
  if (profile.ratedCount < 5) return "Rate a few more movies to see how you score.";
  if (profile.averageRating >= 4) return "You rate generously, so a lower score is a strong signal.";
  if (profile.averageRating <= 2.75) return "You're a tough critic, so high scores carry extra weight.";
  return "You use the whole scale, which gives recommendations clear signals.";
}

export function catalogSearchPath(term: string) {
  return `/?${new URLSearchParams({ q: term }).toString()}`;
}
