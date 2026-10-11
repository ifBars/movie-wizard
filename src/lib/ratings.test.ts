import { describe, expect, test } from "vitest";
import { formatRating, halfStarRatings, isRating, ratingFromPointerPosition, starRatings, stepRating } from "@/lib/ratings";

describe("ratingFromPointerPosition", () => {
  test("returns half a star for the leftmost portion", () => {
    expect(ratingFromPointerPosition(0, 100)).toBe(0.5);
    expect(ratingFromPointerPosition(10, 100)).toBe(0.5);
  });

  test("returns 5 for the rightmost portion", () => {
    expect(ratingFromPointerPosition(100, 100)).toBe(5);
    expect(ratingFromPointerPosition(91, 100)).toBe(5);
  });

  test("snaps intermediate positions to half-star steps", () => {
    expect(ratingFromPointerPosition(15, 100)).toBe(1);
    expect(ratingFromPointerPosition(25, 100)).toBe(1.5);
    expect(ratingFromPointerPosition(50, 100)).toBe(2.5);
    expect(ratingFromPointerPosition(51, 100)).toBe(3);
    expect(ratingFromPointerPosition(75, 100)).toBe(4);
  });

  test("clamps pointerX within [0, width]", () => {
    expect(ratingFromPointerPosition(-10, 100)).toBe(0.5);
    expect(ratingFromPointerPosition(200, 100)).toBe(5);
  });

  test("handles zero width safely", () => {
    expect(ratingFromPointerPosition(0, 0)).toBe(0.5);
    expect(ratingFromPointerPosition(50, 0)).toBe(5);
  });
});

describe("stepRating", () => {
  test("moves by half stars and stays within range", () => {
    expect(stepRating(3, 1)).toBe(3.5);
    expect(stepRating(3, -1)).toBe(2.5);
    expect(stepRating(0.5, -1)).toBe(0.5);
    expect(stepRating(5, 1)).toBe(5);
  });
});

describe("formatRating", () => {
  test("always shows one decimal", () => {
    expect(formatRating(4)).toBe("4.0");
    expect(formatRating(3.5)).toBe("3.5");
  });
});

describe("isRating", () => {
  test("returns true for valid ratings", () => {
    for (const rating of halfStarRatings) {
      expect(isRating(rating)).toBe(true);
    }
  });

  test("returns false for invalid values", () => {
    expect(isRating(0)).toBe(false);
    expect(isRating(6)).toBe(false);
    expect(isRating(2.3)).toBe(false);
    expect(isRating("3")).toBe(false);
    expect(isRating(null)).toBe(false);
    expect(isRating(undefined)).toBe(false);
  });
});

describe("star scales", () => {
  test("whole stars run 1 to 5 and half stars 0.5 to 5", () => {
    expect(starRatings).toEqual([1, 2, 3, 4, 5]);
    expect(halfStarRatings).toEqual([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
  });
});
