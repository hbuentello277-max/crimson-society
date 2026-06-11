"use client";

import { useEffect, useRef } from "react";

const HISTORY_STATE_KEY = "crimsonHistoryModal";

/**
 * Pushes a history entry while a modal is open so browser / iOS back closes the modal
 * instead of leaving the current page.
 */
export function useHistoryModal(open: boolean, onClose: () => void) {
  const programmaticCloseRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    window.history.pushState({ [HISTORY_STATE_KEY]: true }, "");

    const handlePopState = () => {
      if (programmaticCloseRef.current) {
        programmaticCloseRef.current = false;
        return;
      }
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [open]);

  const closeWithHistory = () => {
    onCloseRef.current();
    if (window.history.state?.[HISTORY_STATE_KEY]) {
      programmaticCloseRef.current = true;
      window.history.back();
    }
  };

  return { closeWithHistory };
}
