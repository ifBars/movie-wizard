import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent, RefObject } from "react";

type ScrollDirection = "left" | "right";

type DragState = {
  didDrag: boolean;
  isDragging: boolean;
  pointerId: number;
  startScrollLeft: number;
  startX: number;
};

type HorizontalScrollOptions = {
  itemCount: number;
  pageSize?: number;
  shouldReduceMotion?: boolean | null;
};

type HorizontalScrollResult = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  isDragging: boolean;
  onClickCapture: (event: MouseEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onScroll: () => void;
  ref: RefObject<HTMLDivElement | null>;
  scrollByPage: (direction: ScrollDirection) => void;
};

const defaultDragState: DragState = {
  didDrag: false,
  isDragging: false,
  pointerId: -1,
  startScrollLeft: 0,
  startX: 0,
};

export function useHorizontalScroll({
  itemCount,
  pageSize = 0.78,
  shouldReduceMotion,
}: HorizontalScrollOptions): HorizontalScrollResult {
  const rowRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>({ ...defaultDragState });
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
  const [isDragging, setIsDragging] = useState(false);

  const updateScrollState = useCallback(() => {
    const row = rowRef.current;

    if (!row) {
      return;
    }

    const maxScrollLeft = row.scrollWidth - row.clientWidth;
    const canScrollLeft = row.scrollLeft > 1;
    const canScrollRight = row.scrollLeft < maxScrollLeft - 1;

    setScrollState((current) =>
      current.canScrollLeft === canScrollLeft && current.canScrollRight === canScrollRight
        ? current
        : { canScrollLeft, canScrollRight },
    );
  }, []);

  useLayoutEffect(() => {
    updateScrollState();

    const row = rowRef.current;
    if (!row) {
      return;
    }

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(row);

    return () => {
      resizeObserver.disconnect();
    };
  }, [itemCount, updateScrollState]);

  const scrollByPage = useCallback(
    (direction: ScrollDirection) => {
      const row = rowRef.current;

      row?.scrollBy({
        left: direction === "left" ? -row.clientWidth * pageSize : row.clientWidth * pageSize,
        behavior: shouldReduceMotion ? "auto" : "smooth",
      });
    },
    [pageSize, shouldReduceMotion],
  );

  const beginDragScroll = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0 || event.currentTarget.scrollWidth === event.currentTarget.clientWidth) {
      return;
    }

    dragStateRef.current = {
      didDrag: false,
      isDragging: true,
      pointerId: event.pointerId,
      startScrollLeft: event.currentTarget.scrollLeft,
      startX: event.clientX,
    };
  }, []);

  const updateDragScroll = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;

      if (!dragState.isDragging || dragState.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - dragState.startX;

      if (!dragState.didDrag && Math.abs(deltaX) < 6) {
        return;
      }

      dragState.didDrag = true;
      setIsDragging(true);

      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      event.preventDefault();
      event.currentTarget.scrollLeft = dragState.startScrollLeft - deltaX;
      updateScrollState();
    },
    [updateScrollState],
  );

  const endDragScroll = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;

      if (dragState.pointerId === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      dragState.isDragging = false;
      setIsDragging(false);
      updateScrollState();
    },
    [updateScrollState],
  );

  const suppressClickAfterDrag = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.didDrag) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current.didDrag = false;
  }, []);

  return {
    canScrollLeft: scrollState.canScrollLeft,
    canScrollRight: scrollState.canScrollRight,
    isDragging,
    onClickCapture: suppressClickAfterDrag,
    onPointerCancel: endDragScroll,
    onPointerDown: beginDragScroll,
    onPointerMove: updateDragScroll,
    onPointerUp: endDragScroll,
    onScroll: updateScrollState,
    ref: rowRef,
    scrollByPage,
  };
}
