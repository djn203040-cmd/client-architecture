"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined" ? localStorage.getItem("theme") : null) as "light" | "dark" | null;
    const initial: "light" | "dark" = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      onClick={toggle}
    >
      {theme === "light" ? (
        <Moon weight="regular" className="size-5" />
      ) : (
        <Sun weight="regular" className="size-5" />
      )}
    </Button>
  );
}
