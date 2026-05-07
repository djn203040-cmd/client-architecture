import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { count: leadCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", user!.id);

  return (
    <section className="space-y-6">
      <h1 className="text-[28px] font-semibold leading-[1.2]">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="text-sm text-muted-foreground">Leads</div>
          <div className="text-[28px] font-semibold mt-2 font-mono">{leadCount ?? 0}</div>
          <Link
            href="/leads"
            className="text-sm text-accent hover:underline mt-4 inline-block"
          >
            View leads
          </Link>
        </div>
        <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="text-sm text-muted-foreground">Drafts pending review</div>
          <div className="text-[28px] font-semibold mt-2 font-mono">0</div>
          <p className="text-xs text-muted-foreground mt-4">
            Drafts appear 24 hours before they&apos;re scheduled to send.
          </p>
        </div>
      </div>
    </section>
  );
}
