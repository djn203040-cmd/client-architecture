"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Users, EnvelopeSimple, Gear, LockSimple } from "@phosphor-icons/react";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: House },
  { href: "/leads", label: "Leads", Icon: Users },
  { href: "/drafts", label: "Drafts", Icon: EnvelopeSimple },
  { href: "/settings", label: "Settings", Icon: Gear },
] as const;

const LOCKED = [
  {
    id: "module-2",
    label: "Module 2",
    subtitle: "The Threshold Experience — your client's first 48 hours, built from your sales call.",
  },
  {
    id: "module-3",
    label: "Module 3",
    subtitle: "The Continuation — thirty days before they leave, we remind them why they stayed.",
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Primary">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 px-3 min-h-[44px] rounded-xl text-sm transition-colors ${
              active
                ? "bg-accent text-accent-foreground"
                : "hover:bg-white/5 text-foreground"
            }`}
          >
            <Icon weight="regular" className="size-5" />
            {label}
          </Link>
        );
      })}

      <div className="mt-6 px-3 text-xs uppercase text-muted-foreground tracking-wide">
        Coming soon
      </div>

      {LOCKED.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 px-3 min-h-[44px] rounded-xl text-sm text-muted-foreground"
          title={m.subtitle}
        >
          <LockSimple weight="regular" className="size-5" />
          <div className="flex-1 truncate">{m.label}</div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
            Coming soon
          </span>
        </div>
      ))}
    </nav>
  );
}
