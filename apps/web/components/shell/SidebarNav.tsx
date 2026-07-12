"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Users, EnvelopeSimple, PhoneCall, Gear, LockSimple } from "@phosphor-icons/react";
import type { Route } from "next";
import { NAV_ANCHOR_BY_HREF } from "@/lib/tour/anchors";
import { useDictionary } from "@/lib/i18n/provider";

const ITEMS = [
  { href: "/dashboard", labelKey: "dashboard", Icon: House },
  { href: "/leads", labelKey: "leads", Icon: Users },
  { href: "/drafts", labelKey: "drafts", Icon: EnvelopeSimple },
  { href: "/calls", labelKey: "calls", Icon: PhoneCall },
  { href: "/settings", labelKey: "settings", Icon: Gear },
] as const;

const LOCKED = [
  {
    id: "module-2",
    titleKey: "module2Title",
    subtitleKey: "module2Subtitle",
    href: "/modules/threshold" as const,
  },
  {
    id: "module-3",
    titleKey: "module3Title",
    subtitleKey: "module3Subtitle",
    href: "/modules/continuation" as const,
  },
] as const;

export function SidebarNav() {
  const pathname = usePathname();
  const t = useDictionary();
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label={t.dashboard.shell.primaryNavLabel}>
      {ITEMS.map(({ href, labelKey, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            data-tour={NAV_ANCHOR_BY_HREF[href]}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 px-3 min-h-[44px] rounded-xl text-sm transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "hover:bg-black/5 dark:hover:bg-white/5 text-foreground"
            }`}
          >
            <Icon weight="regular" className="size-5" />
            {t.nav[labelKey]}
          </Link>
        );
      })}

      <div className="mt-6 px-3 text-xs uppercase text-muted-foreground tracking-wide mb-2">
        {t.dashboard.shell.unlockMore}
      </div>

      {LOCKED.map((m) => (
        <Link
          key={m.id}
          href={m.href as Route}
          className="mx-1 mb-2 block rounded-xl border border-border bg-muted p-3 transition-colors hover:bg-muted/70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8"
        >
          <div className="flex items-start gap-2">
            <LockSimple weight="regular" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-medium leading-tight">
                {t.dashboard.shell[m.titleKey]}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {t.dashboard.shell[m.subtitleKey]}
              </p>
              <span className="mt-1.5 inline-block text-[11px] font-medium text-accent">
                {t.dashboard.shell.learnMore}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </nav>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const t = useDictionary();
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center border-t border-border bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label={t.dashboard.shell.mobileNavLabel}
    >
      {ITEMS.map(({ href, labelKey, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            data-tour={NAV_ANCHOR_BY_HREF[href]}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center flex-1 gap-1 py-2 min-h-[56px] text-[10px] font-medium transition-colors ${
              active ? "text-primary dark:text-primary-soft" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon weight={active ? "fill" : "regular"} className="size-5" />
            {t.nav[labelKey]}
          </Link>
        );
      })}
    </nav>
  );
}
