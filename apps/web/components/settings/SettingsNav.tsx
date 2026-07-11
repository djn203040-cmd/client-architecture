"use client";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Notifications" },
  { id: "autonomous", label: "Autonomous" },
  { id: "voice", label: "Voice" },
  { id: "calendar", label: "Calendar" },
  { id: "integrations", label: "Integrations" },
  { id: "session", label: "Sign out" },
  { id: "danger", label: "Danger zone" },
] as const;

export function SettingsNav() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <nav data-tour="settings-nav" className="sticky top-4 z-10 flex flex-wrap gap-2 rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      {SECTIONS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => scrollTo(id)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/20 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
