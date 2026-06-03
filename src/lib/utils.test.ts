import { describe, expect, test } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  test("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  test("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
    expect(cn("foo", true && "bar", "baz")).toBe("foo bar baz");
  });

  test("merges Tailwind conflicting classes", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  test("handles undefined and null values", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  test("returns an empty string when given no arguments", () => {
    expect(cn()).toBe("");
  });
});
