import "server-only";
import { createClient } from "@/lib/supabase/server";

export type HealthState = {
  provider: "gmail";
  status: "connected" | "disconnected" | "error";
  errorMessage: string | null;
};

export async function getIntegrationHealth(): Promise<HealthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { provider: "gmail", status: "disconnected", errorMessage: null };

  const { data: integ } = await supabase
    .from("integrations")
    .select("status, error_message")
    .eq("coach_id", user.id)
    .eq("provider", "gmail")
    .maybeSingle();

  return {
    provider: "gmail",
    status: (integ?.status as HealthState["status"]) ?? "disconnected",
    errorMessage: integ?.error_message ?? null,
  };
}
