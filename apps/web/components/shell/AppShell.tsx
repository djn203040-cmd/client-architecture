import Link from "next/link";
import { SidebarNav } from "./SidebarNav";
import { ThemeToggle } from "./ThemeToggle";
import { IntegrationHealthCard } from "@/components/health/IntegrationHealthCard";

export async function AppShell({
  children,
  coachName,
}: {
  children: React.ReactNode;
  coachName: string;
}) {
  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:flex flex-col border-r border-border bg-secondary/40">
        <div className="p-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            The Client Architecture
          </Link>
          <p className="text-xs text-muted-foreground mt-1 truncate">{coachName}</p>
        </div>
        <SidebarNav />
        <div className="mt-auto p-3 border-t border-border space-y-3">
          <IntegrationHealthCard />
          <form action="/api/auth/sign-out" method="post">
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex flex-col">
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

        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
