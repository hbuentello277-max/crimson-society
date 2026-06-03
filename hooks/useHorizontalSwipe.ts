"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
} from "react";

const SWIPE_THRESHOLD_PX = 56;
const SWIPE_COMMIT_RATIO = 0.18;

type UseHorizontalSwipeOptions = {
  activeIndex: number;
  panelCount: number;
  onIndexChange: (index: number) => void;
};

export function useHorizontalSwipe({
  activeIndex,
  panelCount,
  onIndexChange,
}: UseHorizontalSwipeOptions) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragAxis = useRef<"horizontal" | "vertical" | null>(null);
  const viewportWidth = useRef(0);

  const resetDrag = useCallback(() => {
    setDragOffset(0);
    setIsDragging(false);
    dragAxis.current = null;
  }, []);

  useEffect(() => {
    resetDrag();
  }, [activeIndex, resetDrag]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const updateWidth = () => {
      viewportWidth.current = node.clientWidth;
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const commitSwipe = useCallback(
    (deltaX: number) => {
      const width = viewportWidth.current || 1;

      if (deltaX <= -SWIPE_THRESHOLD_PX || deltaX / width <= -SWIPE_COMMIT_RATIO) {
        if (activeIndex < panelCount - 1) onIndexChange(activeIndex + 1);
        return;
      }

      if (deltaX >= SWIPE_THRESHOLD_PX || deltaX / width >= SWIPE_COMMIT_RATIO) {
        if (activeIndex > 0) onIndexChange(activeIndex - 1);
      }
    },
    [activeIndex, onIndexChange, panelCount],
  );

  const beginDrag = useCallback((clientX: number, clientY: number) => {
    dragStartX.current = clientX;
    dragStartY.current = clientY;
    dragAxis.current = null;
    setIsDragging(true);
  }, []);

  const moveDrag = useCallback(
    (clientX: number, clientY: number) => {
      const deltaX = clientX - dragStartX.current;
      const deltaY = clientY - dragStartY.current;

      if (!dragAxis.current) {
        if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
        dragAxis.current = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
      }

      if (dragAxis.current !== "horizontal") return;

      const width = viewportWidth.current || 1;
      const atStart = activeIndex === 0 && deltaX > 0;
      const atEnd = activeIndex === panelCount - 1 && deltaX < 0;
      const resistedDelta = atStart || atEnd ? deltaX * 0.35 : deltaX;

      setDragOffset(Math.max(-width, Math.min(width, resistedDelta)));
    },
    [activeIndex, panelCount],
  );

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      const deltaX = clientX - dragStartX.current;
      if (dragAxis.current === "horizontal") {
        commitSwipe(deltaX);
      }
      resetDrag();
    },
    [commitSwipe, resetDrag],
  );

  const onTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 1) return;
      beginDrag(event.touches[0].clientX, event.touches[0].clientY);
    },
    [beginDrag],
  );

  const onTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 1) return;
      moveDrag(event.touches[0].clientX, event.touches[0].clientY);
      if (dragAxis.current === "horizontal") event.preventDefault();
    },
    [moveDrag],
  );

  const onTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      endDrag(touch.clientX, touch.clientY);
    },
    [endDrag],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch") return;
      beginDrag(event.clientX, event.clientY);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [beginDrag],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch" || !isDragging) return;
      moveDrag(event.clientX, event.clientY);
    },
    [isDragging, moveDrag],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch") return;
      endDrag(event.clientX, event.clientY);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [endDrag],
  );

  const translateX =
    -activeIndex * (100 / panelCount) +
    (viewportWidth.current ? (dragOffset / viewportWidth.current) * (100 / panelCount) : 0);

  const swipeHandlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };

  return {
    viewportRef,
    swipeHandlers,
    translateX,
    isDragging,
    panelWidthPercent: 100 / panelCount,
  };
}
