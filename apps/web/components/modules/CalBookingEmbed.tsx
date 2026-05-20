"use client";
import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect, useState } from "react";

interface CalBookingEmbedProps {
  calLink: string;
  namespace: string;
}

export function CalBookingEmbed({ calLink, namespace }: CalBookingEmbedProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const getTheme = () =>
      document.documentElement.classList.contains("dark") ? "dark" : "light";

    setTheme(getTheme());

    const observer = new MutationObserver(() => setTheme(getTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace });
      cal("ui", { theme, hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, [namespace, theme]);

  return (
    <Cal
      namespace={namespace}
      calLink={calLink}
      style={{ width: "100%", height: "640px", overflow: "scroll" }}
      config={{ layout: "month_view", theme }}
    />
  );
}
