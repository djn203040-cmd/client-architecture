"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import type { Route } from "next";

const TABS = [
  { id: "active", label: "Active" },
  { id: "replied", label: "Replied" },
  { id: "won", label: "Won" },
  { id: "held", label: "Held" },
  { id: "closed", label: "Closed" },
] as const;

export function LeadListControls({ activeTab, q }: { activeTab: string; q: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  function setTab(t: string) {
    const sp = new URLSearchParams(search);
    sp.set("tab", t);
    router.replace(`${pathname}?${sp.toString()}` as Route<string>);
  }

  function setQ(v: string) {
    const sp = new URLSearchParams(search);
    if (v) sp.set("q", v);
    else sp.delete("q");
    router.replace(`${pathname}?${sp.toString()}` as Route<string>);
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="relative max-w-md w-full">
        <MagnifyingGlass
          weight="regular"
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
        />
        <Input
          placeholder="Search leads…"
          defaultValue={q}
          className="pl-10"
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search leads"
        />
      </div>
    </div>
  );
}
