import Link from "next/link";
import { SidebarNav, MobileBottomNav } from "./SidebarNav";
import { ThemeToggle } from "./ThemeToggle";
import { TourLauncher } from "@/components/tour/TourLauncher";
import { IntegrationHealthCard } from "@/components/health/IntegrationHealthCard";
import { TOUR_ANCHOR } from "@/lib/tour/anchors";
import { getServerDictionary } from "@/lib/i18n/server";

export async function AppShell({
  children,
  coachName,
}: {
  children: React.ReactNode;
  coachName: string;
}) {
  const t = await getServerDictionary();
  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[240px_1fr]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:rounded-lg focus:bg-background focus:text-foreground focus:text-sm focus:border focus:border-border"
      >
        {t.dashboard.shell.skipToContent}
      </a>

      <aside
        data-tour={TOUR_ANCHOR.sidebar}
        className="hidden lg:flex flex-col border-r border-border bg-background"
      >
        <div className="p-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            The Client Architecture
          </Link>
          <p className="text-xs text-muted-foreground mt-1 truncate">{coachName}</p>
        </div>
        <SidebarNav />
        <div className="mt-auto p-3 border-t border-border space-y-3">
          <IntegrationHealthCard />
          <TourLauncher />
          <form action="/api/auth/sign-out" method="post">
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
            >
              {t.nav.signOut}
            </button>
          </form>
        </div>
      </aside>

      <main id="main-content" className="flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          <Link href="/dashboard" className="font-semibold">
            The Client Architecture
          </Link>
          <ThemeToggle />
        </header>

        {/* Desktop top bar */}
        <div className="hidden lg:flex justify-end p-4 border-b border-border">
          <ThemeToggle />
        </div>

        <div className="p-6 lg:p-8 pb-24 lg:pb-8 max-w-[1400px] mx-auto w-full">{children}</div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
