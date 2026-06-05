"use client";

import { animate, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { useState, type ReactNode } from "react";

const DELETE_WIDTH = 88;
const SWIPE_THRESHOLD = 44;

type Props = {
  children: ReactNode;
  onDelete: () => void;
  className?: string;
};

export function SwipeableNotificationRow({ children, onDelete, className = "" }: Props) {
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);
  const deleteOpacity = useTransform(x, [-DELETE_WIDTH, -16, 0], [1, 0.5, 0]);

  const snapTo = (next: number) => {
    animate(x, next, { type: "spring", stiffness: 420, damping: 36 });
    setOpen(next !== 0);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD || (open && info.offset.x <= 8)) {
      snapTo(-DELETE_WIDTH);
      return;
    }
    snapTo(0);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.div
        aria-hidden
        className="absolute inset-y-0 right-0 flex w-[88px] items-stretch justify-center bg-[#b4141e]"
        style={{ opacity: deleteOpacity }}
      >
        <button
          type="button"
          onClick={onDelete}
          className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
        >
          Delete
        </button>
      </motion.div>

      <motion.div
        style={{ x, touchAction: "pan-y" }}
        drag="x"
        dragConstraints={{ left: -DELETE_WIDTH, right: 0 }}
        dragElastic={0.06}
        onDragEnd={handleDragEnd}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
}

export function NotificationDeleteButton({
  onDelete,
  className = "",
}: {
  onDelete: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDelete();
      }}
      className={`shrink-0 rounded-full border border-red-500/40 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-red-300 transition hover:bg-red-500/10 ${className}`}
      aria-label="Delete notification"
    >
      Delete
    </button>
  );
}
