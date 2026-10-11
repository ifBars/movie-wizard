import type { Rating } from "@/types";

export const starRatings = [1, 2, 3, 4, 5] satisfies readonly Rating[];

export const halfStarRatings = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] satisfies readonly Rating[];

export function ratingFromPointerPosition(pointerX: number, width: number): Rating {
  const safeWidth = Math.max(width, 1);
  const boundedX = Math.min(Math.max(pointerX, 0), safeWidth);
  const halfStepIndex = Math.min(halfStarRatings.length, Math.max(1, Math.ceil((boundedX / safeWidth) * halfStarRatings.length)));

  return halfStarRatings[halfStepIndex - 1];
}

export function stepRating(rating: Rating, steps: number): Rating {
  const index = halfStarRatings.indexOf(rating);
  return halfStarRatings[Math.min(halfStarRatings.length - 1, Math.max(0, index + steps))];
}

export function formatRating(rating: number) {
  return rating.toFixed(1);
}

export function isRating(value: unknown): value is Rating {
  return (
    value === 0.5 ||
    value === 1 ||
    value === 1.5 ||
    value === 2 ||
    value === 2.5 ||
    value === 3 ||
    value === 3.5 ||
    value === 4 ||
    value === 4.5 ||
    value === 5
  );
}
