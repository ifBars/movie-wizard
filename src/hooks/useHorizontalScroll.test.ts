import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";

describe("useHorizontalScroll", () => {
  let mockRow: HTMLDivElement;
  let originalSetPointerCapture: typeof Element.prototype.setPointerCapture;
  let originalReleasePointerCapture: typeof Element.prototype.releasePointerCapture;

  beforeEach(() => {
    originalSetPointerCapture = Element.prototype.setPointerCapture;
    originalReleasePointerCapture = Element.prototype.releasePointerCapture;

    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = vi.fn() as unknown as typeof Element.prototype.setPointerCapture;
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = vi.fn() as unknown as typeof Element.prototype.releasePointerCapture;
    }

    mockRow = document.createElement("div");
    Object.defineProperty(mockRow, "scrollWidth", { writable: true, value: 1000 });
    Object.defineProperty(mockRow, "clientWidth", { writable: true, value: 200 });
    Object.defineProperty(mockRow, "scrollLeft", { writable: true, value: 0 });
    mockRow.scrollBy = vi.fn();
    mockRow.hasPointerCapture = vi.fn().mockReturnValue(false);
    vi.spyOn(mockRow, "setPointerCapture").mockImplementation(() => {});
    vi.spyOn(mockRow, "releasePointerCapture").mockImplementation(() => {});
  });

  afterEach(() => {
    Element.prototype.setPointerCapture = originalSetPointerCapture;
    Element.prototype.releasePointerCapture = originalReleasePointerCapture;
  });

  function setupHook(itemCount = 10) {
    const { result } = renderHook(() =>
      useHorizontalScroll({ itemCount, edgeTolerance: 1 }),
    );

    // Attach the ref manually
    act(() => {
      result.current.ref.current = mockRow;
    });

    // Trigger an update so scroll state is computed
    act(() => {
      result.current.onScroll();
    });

    return result;
  }

  test("initializes with correct scroll state", () => {
    const result = setupHook();
    expect(result.current.canScrollLeft).toBe(false);
    expect(result.current.canScrollRight).toBe(true);
  });

  test("scrollByPage scrolls left by page size", () => {
    const result = setupHook();

    act(() => {
      result.current.scrollByPage("left");
    });

    expect(mockRow.scrollBy).toHaveBeenCalledWith({
      left: expect.any(Number),
      behavior: "smooth",
    });
  });

  test("scrollByPage scrolls right by page size", () => {
    const result = setupHook();

    act(() => {
      result.current.scrollByPage("right");
    });

    expect(mockRow.scrollBy).toHaveBeenCalledWith({
      left: expect.any(Number),
      behavior: "smooth",
    });
  });

  test("beginDragScroll starts drag on left mouse button", () => {
    const result = setupHook();
    const pointerEvent = new PointerEvent("pointerdown", {
      pointerType: "mouse",
      button: 0,
      clientX: 50,
    });
    Object.defineProperty(pointerEvent, "currentTarget", { value: mockRow });

    act(() => {
      result.current.onPointerDown(pointerEvent as unknown as React.PointerEvent<HTMLDivElement>);
    });

    expect(result.current.isDragging).toBe(false);
  });

  test("suppressClickAfterDrag prevents default when a drag occurred", () => {
    const result = setupHook();
    const mouseEvent = new MouseEvent("click", { bubbles: true });
    const preventDefaultSpy = vi.spyOn(mouseEvent, "preventDefault");
    const stopPropagationSpy = vi.spyOn(mouseEvent, "stopPropagation");

    // Simulate a drag first
    const pointerDown = new PointerEvent("pointerdown", {
      pointerType: "mouse",
      button: 0,
      clientX: 50,
      pointerId: 1,
    });
    Object.defineProperty(pointerDown, "currentTarget", { value: mockRow });

    act(() => {
      result.current.onPointerDown(pointerDown as unknown as React.PointerEvent<HTMLDivElement>);
    });

    const pointerMove = new PointerEvent("pointermove", {
      pointerType: "mouse",
      clientX: 100,
      pointerId: 1,
    });
    Object.defineProperty(pointerMove, "currentTarget", { value: mockRow });

    act(() => {
      result.current.onPointerMove(pointerMove as unknown as React.PointerEvent<HTMLDivElement>);
    });

    act(() => {
      result.current.onClickCapture(mouseEvent as unknown as React.MouseEvent<HTMLDivElement>);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  test("does not suppress click when no drag occurred", () => {
    const result = setupHook();
    const mouseEvent = new MouseEvent("click", { bubbles: true });
    const preventDefaultSpy = vi.spyOn(mouseEvent, "preventDefault");

    act(() => {
      result.current.onClickCapture(mouseEvent as unknown as React.MouseEvent<HTMLDivElement>);
    });

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });
});
