import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dbModeToApiMode } from "@/lib/autonomous-mode";
import { AutonomousModeCard } from "./AutonomousModeCard";

export const dynamic = "force-dynamic";

export default async function AutonomousModeSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach } = await supabase
    .from("coaches")
    .select("autonomous_mode")
    .eq("id", user.id)
    .single();

  const initial = dbModeToApiMode(coach?.autonomous_mode);

  return (
    <section className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold leading-[1.2]">Autonomous mode</h1>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          Choose how much trust to give the AI. You can change this anytime.
        </p>
      </div>
      <AutonomousModeCard initialMode={initial} />
    </section>
  );
}
