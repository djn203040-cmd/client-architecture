"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useAutosave<T>(
  value: T,
  save: (v: T) => Promise<void>,
  debounceMs = 500,
) {
  const saveRef = useRef(save);
  saveRef.current = save;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      saveRef.current(value).then(
        () => toast.success("Saved"),
        () => toast.error("Couldn't save — try again"),
      );
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, debounceMs]);
}
