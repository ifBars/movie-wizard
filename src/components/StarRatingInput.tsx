import { Star } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { formatRating, halfStarRatings, ratingFromPointerPosition, starRatings, stepRating } from "@/lib/ratings";
import { cn } from "@/lib/utils";
import type { Rating } from "@/types";

type StarRatingInputProps = {
  movieTitle: string;
  value: Rating | null;
  onRate: (rating: Rating) => void;
  className?: string;
  showValue?: boolean;
  onPreviewChange?: (rating: Rating | null) => void;
};

// Each star holds two half-width buttons so ratings go from 0.5 to 5 in half steps. Only one button is tabbable;
// arrow keys move between half steps and Enter or Space commits.
export function StarRatingInput({ movieTitle, value, onRate, className, showValue = false, onPreviewChange }: StarRatingInputProps) {
  const shouldReduceMotion = useReducedMotion();
  const [previewRating, setPreviewRatingState] = useState<Rating | null>(null);
  const buttonRefs = useRef(new Map<Rating, HTMLButtonElement>());
  const displayedRating = previewRating ?? value ?? 0;
  const tabbableRating = value ?? halfStarRatings[0];

  function setPreviewRating(rating: Rating | null) {
    setPreviewRatingState(rating);
    onPreviewChange?.(rating);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPreviewRating(ratingFromPointerPosition(event.clientX - rect.left, rect.width));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, rating: Rating) {
    const nextRating =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? stepRating(rating, 1)
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? stepRating(rating, -1)
          : event.key === "Home"
            ? halfStarRatings[0]
            : event.key === "End"
              ? halfStarRatings[halfStarRatings.length - 1]
              : null;
    if (nextRating === null) return;

    event.preventDefault();
    buttonRefs.current.get(nextRating)?.focus();
  }

  return (
    <div
      className={cn("star-rating", previewRating !== null && "is-previewing", className)}
      role="group"
      aria-label={`Rate ${movieTitle}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setPreviewRating(null)}
    >
      <div className="star-rating__stars">
        {starRatings.map((star) => {
          const fill = displayedRating >= star ? "full" : displayedRating >= star - 0.5 ? "half" : "empty";
          const isTarget = displayedRating > star - 1 && displayedRating <= star;

          return (
            <motion.span
              key={star}
              className={cn("star-rating__star", `is-${fill}`, isTarget && previewRating !== null && "is-preview-target")}
              animate={
                isTarget && !shouldReduceMotion
                  ? { scale: [1, 1.2, 1], rotate: previewRating !== null ? 0 : [0, -8, 0] }
                  : { scale: 1, rotate: 0 }
              }
              transition={{ duration: 0.18 }}
            >
              <Star className="star-rating__icon" weight="regular" aria-hidden />
              <Star className="star-rating__icon star-rating__icon--fill" weight="fill" aria-hidden />
              {[0, 1].map((halfIndex) => {
                const rating = halfStarRatings[star * 2 - 2 + halfIndex];
                return (
                  <button
                    key={rating}
                    ref={(button) => {
                      if (button) buttonRefs.current.set(rating, button);
                      else buttonRefs.current.delete(rating);
                    }}
                    type="button"
                    className={cn("star-rating__half", halfIndex === 0 ? "star-rating__half--left" : "star-rating__half--right")}
                    tabIndex={rating === tabbableRating ? 0 : -1}
                    aria-label={`Rate ${rating} ${rating === 1 ? "star" : "stars"}`}
                    aria-pressed={value === rating}
                    onClick={() => onRate(rating)}
                    onFocus={() => setPreviewRating(rating)}
                    onBlur={() => setPreviewRating(null)}
                    onKeyDown={(event) => handleKeyDown(event, rating)}
                  />
                );
              })}
            </motion.span>
          );
        })}
      </div>
      {showValue ? (
        <span className="star-rating__value" aria-hidden>
          {displayedRating > 0 ? formatRating(displayedRating) : "–"}
        </span>
      ) : null}
    </div>
  );
}
