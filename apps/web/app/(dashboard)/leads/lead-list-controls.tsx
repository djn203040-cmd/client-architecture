"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useDictionary } from "@/lib/i18n/provider";
import type { Route } from "next";

const TAB_IDS = ["active", "replied", "won", "held", "lost"] as const;

export function LeadListControls({ activeTab, q }: { activeTab: string; q: string }) {
  const t = useDictionary();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const tabs = [
    { id: "active", label: t.leads.controls.tabActive },
    { id: "replied", label: t.leads.controls.tabReplied },
    { id: "won", label: t.leads.controls.tabWon },
    { id: "held", label: t.leads.controls.tabHeld },
    { id: "lost", label: t.leads.controls.tabLost },
  ] as const satisfies ReadonlyArray<{ id: (typeof TAB_IDS)[number]; label: string }>;

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
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
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
          placeholder={t.leads.controls.searchPlaceholder}
          defaultValue={q}
          className="pl-10"
          onChange={(e) => setQ(e.target.value)}
          aria-label={t.leads.controls.searchAria}
        />
      </div>
    </div>
  );
}
