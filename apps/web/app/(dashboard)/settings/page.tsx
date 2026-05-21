import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { AutonomousSection } from "@/components/settings/AutonomousSection";
import { VoiceSection } from "@/components/settings/VoiceSection";
import { IntegrationsSection } from "@/components/settings/IntegrationsSection";
import { DangerZone } from "@/components/settings/DangerZone";
import { SignOutSection } from "@/components/settings/SignOutSection";
import type { TVoiceProfile } from "@client/shared/validators";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [coachRes, integrationsRes, prefsRes] = await Promise.all([
    supabase
      .from("coaches")
      .select(
        "id, name, email, autonomous_mode, voice_model, display_name, role_title, timezone, working_hours, email_signature, public_booking_url, avatar_url",
      )
      .eq("id", user.id)
      .single(),
    supabase.from("integrations").select("id, provider, status, error_message").eq("coach_id", user.id),
    supabase
      .from("notification_preferences")
      .select("event_type, channel, enabled")
      .eq("coach_id", user.id),
  ]);

  const coach = coachRes.data;
  if (!coach) redirect("/login");

  const voiceModel = coach.voice_model as TVoiceProfile | null | Record<string, never>;
  const initialVoiceModel =
    voiceModel && typeof voiceModel === "object" && "tone_adjectives" in voiceModel
      ? (voiceModel as TVoiceProfile)
      : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-[28px] font-semibold leading-[1.2]">Settings</h1>

      {sp.connected === "gmail" && (
        <div className="rounded-2xl bg-[oklch(60%_0.14_145)] text-white p-4 text-sm">
          Gmail connected.
        </div>
      )}
      {sp.error && (
        <div className="rounded-2xl bg-destructive text-destructive-foreground p-4 text-sm">
          {describeError(sp.error)}
        </div>
      )}

      <SettingsNav />

      <section id="profile" className="scroll-mt-24 rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <ProfileSection coach={coach} />
      </section>

      <section id="notifications" className="scroll-mt-24 rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <NotificationsSection
          prefs={prefsRes.data ?? []}
          integrations={integrationsRes.data ?? []}
        />
      </section>

      <section id="autonomous" className="scroll-mt-24 rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <AutonomousSection autonomousMode={coach.autonomous_mode} />
      </section>

      <section id="voice" className="scroll-mt-24 rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <VoiceSection voiceModel={initialVoiceModel} />
      </section>

      <section id="integrations" className="scroll-mt-24 rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <IntegrationsSection integrations={integrationsRes.data ?? []} />
      </section>

      <section id="session" className="scroll-mt-24 rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <SignOutSection email={coach.email} />
      </section>

      <section id="danger" className="scroll-mt-24 rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <DangerZone coach={{ email: coach.email }} />
      </section>
    </div>
  );
}

function describeError(code: string): string {
  switch (code) {
    case "insufficient_scopes":
      return "We need permission to send and read emails. Please connect Gmail again and grant all requested scopes.";
    case "oauth_no_refresh_token":
      return "Google didn't return a refresh token. Revoke the app in your Google account, then try connecting again.";
    case "oauth_vault_failed":
      return "We couldn't securely store your tokens. Try again in a moment.";
    case "oauth_exchange_failed":
      return "We couldn't complete the Google sign-in. Try connecting again.";
    case "oauth_missing_params":
      return "The connection request was malformed. Try again.";
    default:
      return "Connection failed. Try again.";
  }
}
