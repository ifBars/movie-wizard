import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandLogo } from "@/components/BrandLogo";

describe("BrandLogo", () => {
  test("renders mark variant with role img", () => {
    render(<BrandLogo variant="mark" />);
    const logo = screen.getByRole("img", { name: /Movie Wizard/i });
    expect(logo).toBeInTheDocument();
  });

  test("renders logo variant with alt text", () => {
    render(<BrandLogo variant="logo" />);
    const logo = screen.getByAltText(/Movie Wizard logo/i);
    expect(logo).toBeInTheDocument();
  });

  test("defaults to mark variant", () => {
    render(<BrandLogo />);
    const logo = screen.getByRole("img", { name: /Movie Wizard/i });
    expect(logo).toBeInTheDocument();
  });

  test("applies custom className", () => {
    const { container } = render(<BrandLogo className="custom-class" />);
    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });
});
