import { useEffect, useRef } from "react";

export const useEscapeKey = (onEscape: () => void, isActive: boolean) => {
  const callbackRef = useRef(onEscape);

  // Keep the callback ref up to date so we don't need to re-bind the
  // event listener every time the component re-renders with an inline function.
  useEffect(() => {
    callbackRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        callbackRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);
};
