"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useHorizontalSwipe } from "@/hooks/useHorizontalSwipe";

type SwipeTabPanelsProps = {
  activeIndex: number;
  onIndexChange: (index: number) => void;
  children: ReactNode[];
  className?: string;
  lazyMount?: boolean;
};

export function SwipeTabPanels({
  activeIndex,
  onIndexChange,
  children,
  className = "",
  lazyMount = false,
}: SwipeTabPanelsProps) {
  const panelCount = children.length;
  const [mountedPanels, setMountedPanels] = useState<Set<number>>(() => new Set([activeIndex]));

  useEffect(() => {
    if (!lazyMount) return;
    setMountedPanels((current) => {
      if (current.has(activeIndex)) return current;
      const next = new Set(current);
      next.add(activeIndex);
      return next;
    });
  }, [activeIndex, lazyMount]);

  const { viewportRef, swipeHandlers, translateX, isDragging, panelWidthPercent } =
    useHorizontalSwipe({
      activeIndex,
      panelCount,
      onIndexChange: (index) => {
        if (lazyMount) {
          setMountedPanels((current) => {
            if (current.has(index)) return current;
            const next = new Set(current);
            next.add(index);
            return next;
          });
        }
        onIndexChange(index);
      },
    });

  useEffect(() => {
    if (!lazyMount || !isDragging) return;
    const adjacentIndex = activeIndex > 0 ? activeIndex - 1 : activeIndex + 1;
    if (adjacentIndex < 0 || adjacentIndex >= panelCount) return;
    setMountedPanels((current) => {
      if (current.has(adjacentIndex)) return current;
      const next = new Set(current);
      next.add(adjacentIndex);
      return next;
    });
  }, [activeIndex, isDragging, lazyMount, panelCount]);

  return (
    <div
      ref={viewportRef}
      className={`overflow-hidden touch-pan-y ${className}`}
      {...swipeHandlers}
    >
      <div
        className={`flex ${isDragging ? "" : "transition-transform duration-300 ease-out"}`}
        style={{
          width: `${panelCount * 100}%`,
          transform: `translateX(${translateX}%)`,
        }}
      >
        {children.map((panel, index) => (
          <div
            key={index}
            className="shrink-0 overflow-x-hidden"
            style={{ width: `${panelWidthPercent}%` }}
            aria-hidden={index !== activeIndex}
          >
            {!lazyMount || mountedPanels.has(index) ? panel : null}
          </div>
        ))}
      </div>
    </div>
  );
}
