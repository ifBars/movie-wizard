import type { Rating } from "@/types";

export const starRatings = [1, 2, 3, 4, 5] satisfies readonly Rating[];

export function ratingFromPointerPosition(pointerX: number, width: number): Rating {
  const safeWidth = Math.max(width, 1);
  const boundedX = Math.min(Math.max(pointerX, 0), safeWidth);
  const starValue = Math.min(5, Math.max(1, Math.ceil((boundedX / safeWidth) * 5)));

  switch (starValue) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 3;
    case 4:
      return 4;
    default:
      return 5;
  }
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
