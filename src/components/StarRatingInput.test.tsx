import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { StarRatingInput } from "@/components/StarRatingInput";
import { halfStarRatings } from "@/lib/ratings";

describe("StarRatingInput", () => {
  test("previews and commits every half-star rating with the value label visible", () => {
    const onRate = vi.fn();
    const onPreviewChange = vi.fn();
    const { container } = render(
      <StarRatingInput movieTitle="Test Movie" value={null} onRate={onRate} onPreviewChange={onPreviewChange} showValue />,
    );

    for (const rating of halfStarRatings) {
      const button = screen.getByRole("button", { name: `Rate ${rating} ${rating === 1 ? "star" : "stars"}` });
      fireEvent.pointerMove(button);
      expect(container.querySelector(".star-rating__value")).toHaveTextContent(rating.toFixed(1));
      expect(onPreviewChange).toHaveBeenLastCalledWith(rating);
      fireEvent.click(button);
      expect(onRate).toHaveBeenLastCalledWith(rating);
    }
  });

  test("restores the saved rating after the pointer leaves", () => {
    const { container } = render(<StarRatingInput movieTitle="Test Movie" value={3} onRate={vi.fn()} showValue />);

    fireEvent.pointerMove(screen.getByRole("button", { name: "Rate 5 stars" }));
    expect(container.querySelector(".star-rating__value")).toHaveTextContent("5.0");
    fireEvent.pointerLeave(screen.getByRole("group", { name: "Rate Test Movie" }));
    expect(container.querySelector(".star-rating__value")).toHaveTextContent("3.0");
  });
});
