import { describe, expect, test } from "vitest";
import { ratingFromPointerPosition, isRating, starRatings } from "@/lib/ratings";

describe("ratingFromPointerPosition", () => {
  test("returns 1 for the leftmost portion", () => {
    expect(ratingFromPointerPosition(0, 100)).toBe(1);
    expect(ratingFromPointerPosition(10, 100)).toBe(1);
  });

  test("returns 5 for the rightmost portion", () => {
    expect(ratingFromPointerPosition(100, 100)).toBe(5);
    expect(ratingFromPointerPosition(90, 100)).toBe(5);
  });

  test("returns intermediate ratings based on position", () => {
    expect(ratingFromPointerPosition(30, 100)).toBe(2);
    expect(ratingFromPointerPosition(50, 100)).toBe(3);
    expect(ratingFromPointerPosition(70, 100)).toBe(4);
  });

  test("clamps pointerX within [0, width]", () => {
    expect(ratingFromPointerPosition(-10, 100)).toBe(1);
    expect(ratingFromPointerPosition(200, 100)).toBe(5);
  });

  test("handles zero width safely", () => {
    expect(ratingFromPointerPosition(0, 0)).toBe(1);
    expect(ratingFromPointerPosition(50, 0)).toBe(5);
  });
});

describe("isRating", () => {
  test("returns true for valid ratings", () => {
    expect(isRating(0.5)).toBe(true);
    expect(isRating(1)).toBe(true);
    expect(isRating(1.5)).toBe(true);
    expect(isRating(2)).toBe(true);
    expect(isRating(2.5)).toBe(true);
    expect(isRating(3)).toBe(true);
    expect(isRating(3.5)).toBe(true);
    expect(isRating(4)).toBe(true);
    expect(isRating(4.5)).toBe(true);
    expect(isRating(5)).toBe(true);
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

describe("starRatings", () => {
  test("contains whole-star ratings from 1 to 5", () => {
    expect(starRatings).toEqual([1, 2, 3, 4, 5]);
  });
});
