"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

const SWIPE_THRESHOLD_PX = 56;
const SWIPE_COMMIT_RATIO = 0.18;

type UseHorizontalSwipeOptions = {
  activeIndex: number;
  panelCount: number;
  onIndexChange: (index: number) => void;
  /** When false, gestures are ignored and drag state resets. */
  enabled?: boolean;
};

export function useHorizontalSwipe({
  activeIndex,
  panelCount,
  onIndexChange,
  enabled = true,
}: UseHorizontalSwipeOptions) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragAxis = useRef<"horizontal" | "vertical" | null>(null);
  const activeIndexRef = useRef(activeIndex);
  const enabledRef = useRef(enabled);

  activeIndexRef.current = activeIndex;
  enabledRef.current = enabled;

  const resetDrag = useCallback(() => {
    setDragOffset(0);
    setIsDragging(false);
    dragAxis.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) resetDrag();
  }, [enabled, resetDrag]);

  useEffect(() => {
    resetDrag();
  }, [activeIndex, resetDrag]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const updateWidth = () => {
      const width = node.clientWidth;
      if (width > 0) setViewportWidth(width);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);

    return () => observer.disconnect();
  }, [enabled]);

  const commitSwipe = useCallback(
    (deltaX: number, width: number) => {
      const safeWidth = width || 1;
      const index = activeIndexRef.current;

      if (deltaX <= -SWIPE_THRESHOLD_PX || deltaX / safeWidth <= -SWIPE_COMMIT_RATIO) {
        if (index < panelCount - 1) onIndexChange(index + 1);
        return;
      }

      if (deltaX >= SWIPE_THRESHOLD_PX || deltaX / safeWidth >= SWIPE_COMMIT_RATIO) {
        if (index > 0) onIndexChange(index - 1);
      }
    },
    [onIndexChange, panelCount],
  );

  const beginDrag = useCallback((clientX: number, clientY: number) => {
    if (!enabledRef.current) return;
    dragStartX.current = clientX;
    dragStartY.current = clientY;
    dragAxis.current = null;
    setIsDragging(true);
  }, []);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!enabledRef.current) return false;

    const deltaX = clientX - dragStartX.current;
    const deltaY = clientY - dragStartY.current;

    if (!dragAxis.current) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return false;
      dragAxis.current = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
    }

    if (dragAxis.current !== "horizontal") return false;

    const node = viewportRef.current;
    const width = node?.clientWidth || viewportWidth || 1;
    const index = activeIndexRef.current;
    const atStart = index === 0 && deltaX > 0;
    const atEnd = index === panelCount - 1 && deltaX < 0;
    const resistedDelta = atStart || atEnd ? deltaX * 0.35 : deltaX;

    setDragOffset(Math.max(-width, Math.min(width, resistedDelta)));
    return true;
  }, [viewportWidth]);

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      const deltaX = clientX - dragStartX.current;
      const node = viewportRef.current;
      const width = node?.clientWidth || viewportWidth || 1;

      if (dragAxis.current === "horizontal") {
        commitSwipe(deltaX, width);
      }
      resetDrag();
    },
    [commitSwipe, resetDrag, viewportWidth],
  );

  // Non-passive touch listeners — required on iOS so horizontal swipes work inside scroll children.
  useEffect(() => {
    const node = viewportRef.current;
    if (!node || !enabled) return;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      beginDrag(event.touches[0].clientX, event.touches[0].clientY);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const isHorizontal = moveDrag(event.touches[0].clientX, event.touches[0].clientY);
      if (isHorizontal) event.preventDefault();
    };

    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      endDrag(touch.clientX, touch.clientY);
    };

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd, { passive: true });
    node.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [beginDrag, enabled, endDrag, moveDrag]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if (event.pointerType === "touch") return;
      beginDrag(event.clientX, event.clientY);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [beginDrag, enabled],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if (event.pointerType === "touch" || !isDragging) return;
      moveDrag(event.clientX, event.clientY);
    },
    [enabled, isDragging, moveDrag],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if (event.pointerType === "touch") return;
      endDrag(event.clientX, event.clientY);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [enabled, endDrag],
  );

  const widthForTransform = viewportWidth || viewportRef.current?.clientWidth || 0;
  const translateX =
    -activeIndex * (100 / panelCount) +
    (widthForTransform > 0 ? (dragOffset / widthForTransform) * (100 / panelCount) : 0);

  /** Pointer only — touch uses non-passive listeners on viewportRef (iOS). */
  const swipeHandlers = enabled
    ? {
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp,
      }
    : {};

  return {
    viewportRef,
    swipeHandlers,
    translateX,
    isDragging,
    panelWidthPercent: 100 / panelCount,
    viewportReady: widthForTransform > 0,
  };
}
