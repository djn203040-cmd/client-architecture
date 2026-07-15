"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/provider";

export function useAutosave<T>(
  value: T,
  save: (v: T) => Promise<void>,
  debounceMs = 500,
) {
  const t = useDictionary();
  const saveRef = useRef(save);
  saveRef.current = save;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Serialized last-saved value, seeded from the first render. Comparing
  // content (not render count) means a remount or React tree regeneration
  // (StrictMode, hydration recovery) never fires saves for untouched data.
  const lastSavedRef = useRef<string | null>(null);
  if (lastSavedRef.current === null) lastSavedRef.current = JSON.stringify(value);

  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (serialized === lastSavedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      saveRef.current(value).then(
        () => {
          lastSavedRef.current = serialized;
          toast.success(t.common.saved);
        },
        () => toast.error(t.common.somethingWentWrong),
      );
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, debounceMs, t]);
}
