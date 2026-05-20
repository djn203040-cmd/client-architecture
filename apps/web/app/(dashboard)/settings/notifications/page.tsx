import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationMatrix } from "./NotificationMatrix";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [prefsRes, integrationsRes] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select("event_type, channel, enabled")
      .eq("coach_id", user.id),
    supabase
      .from("integrations")
      .select("provider, status")
      .eq("coach_id", user.id),
  ]);

  return (
    <section className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold leading-[1.2]">Notifications</h1>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          Choose where you want to hear from Sonorous. Connected channels are loud by default.
        </p>
      </div>
      <NotificationMatrix
        initialPreferences={prefsRes.data ?? []}
        integrations={integrationsRes.data ?? []}
      />
    </section>
  );
}
