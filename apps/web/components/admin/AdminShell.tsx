import Link from "next/link";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Users, Pulse, ArrowLeft } from "@phosphor-icons/react/dist/ssr";

const ADMIN_ITEMS = [
  { href: "/admin", label: "Coaches", Icon: Users },
  { href: "/admin#system-health", label: "System Health", Icon: Pulse },
  { href: "/dashboard", label: "Back to dashboard", Icon: ArrowLeft },
] as const;

export function AdminShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:flex flex-col border-r border-border bg-secondary/40">
        <div className="p-6">
          <Link href="/admin" className="font-semibold tracking-tight">
            Admin
          </Link>
          <p className="text-xs text-muted-foreground mt-1 truncate">{userName}</p>
        </div>

        <nav className="flex flex-col gap-1 p-3" aria-label="Admin navigation">
          {ADMIN_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={`${href}-${label}`}
              href={href}
              className="flex items-center gap-3 px-3 min-h-[44px] rounded-xl text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Icon weight="regular" className="size-5 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-3 border-t border-border">
          <form action="/api/auth/sign-out" method="post">
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left min-h-[44px] flex items-center"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex flex-col">
        <div className="hidden lg:flex justify-end p-4 border-b border-border">
          <ThemeToggle />
        </div>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
