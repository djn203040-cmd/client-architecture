"use client";

import { useDictionary } from "@/lib/i18n/provider";

const SECTION_IDS = [
  "profile",
  "notifications",
  "autonomous",
  "voice",
  "sales",
  "calendar",
  "integrations",
  "session",
  "danger",
] as const;

export function SettingsNav() {
  const t = useDictionary();

  const labels: Record<(typeof SECTION_IDS)[number], string> = {
    profile: t.settings.nav.profile,
    notifications: t.settings.nav.notifications,
    autonomous: t.settings.nav.autonomous,
    voice: t.settings.nav.voice,
    sales: t.settings.nav.sales,
    calendar: t.settings.nav.calendar,
    integrations: t.settings.nav.integrations,
    session: t.settings.nav.session,
    danger: t.settings.nav.danger,
  };

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <nav data-tour="settings-nav" className="sticky top-4 z-10 flex flex-wrap gap-2 rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      {SECTION_IDS.map((id) => (
        <button
          key={id}
          onClick={() => scrollTo(id)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/20 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          {labels[id]}
        </button>
      ))}
    </nav>
  );
}
