import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { CatalogLoadingState } from "@/components/CatalogLoadingState";

describe("CatalogLoadingState", () => {
  test("renders default title and subtitle", () => {
    render(<CatalogLoadingState />);
    expect(screen.getByText("Loading catalog")).toBeInTheDocument();
    expect(screen.getByText("Preparing your local movie shelf.")).toBeInTheDocument();
  });

  test("renders custom title and subtitle", () => {
    render(<CatalogLoadingState title="Custom Title" subtitle="Custom Subtitle" />);
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom Subtitle")).toBeInTheDocument();
  });

  test("renders six skeleton spans", () => {
    const { container } = render(<CatalogLoadingState />);
    const grid = container.querySelector(".catalog-loading__grid");
    expect(grid).toBeInTheDocument();
    expect(grid?.children.length).toBe(6);
  });
});
