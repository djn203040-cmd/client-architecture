"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/lib/i18n/provider";

export function ThemeToggle() {
  const t = useDictionary();
  // mounted gates any theme-dependent rendering until after hydration.
  // The server always renders a stable placeholder; only the client knows
  // the real theme (read from <html class="dark"> set by the layout cookie).
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const initial = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
    document.cookie = `theme=${theme};path=/;max-age=31536000;samesite=lax`;
  }, [theme, mounted]);

  function toggle() {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={
        mounted
          ? theme === "light"
            ? t.dashboard.shell.switchToDark
            : t.dashboard.shell.switchToLight
          : t.dashboard.shell.themeToggle
      }
      onClick={toggle}
      suppressHydrationWarning
    >
      {mounted ? (
        theme === "light" ? (
          <Moon weight="regular" className="size-5" />
        ) : (
          <Sun weight="regular" className="size-5" />
        )
      ) : (
        <Moon weight="regular" className="size-5 opacity-0" aria-hidden />
      )}
    </Button>
  );
}
