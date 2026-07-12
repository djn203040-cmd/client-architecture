import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { AutonomousSection } from "@/components/settings/AutonomousSection";
import { VoiceSection } from "@/components/settings/VoiceSection";
import { SalesToolkitSection } from "@/components/settings/SalesToolkitSection";
import { IntegrationsSection } from "@/components/settings/IntegrationsSection";
import { CalendarSection } from "@/components/settings/CalendarSection";
import { DangerZone } from "@/components/settings/DangerZone";
import { SignOutSection } from "@/components/settings/SignOutSection";
import type { TVoiceProfile } from "@client/shared/validators";
import {
  CALENDAR_PROVIDER_IDS,
  CALENDAR_PROVIDERS,
  isOAuthConfigured,
  type CalendarProviderId,
} from "@/lib/calendar/providers";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const t = await getServerDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [coachRes, integrationsRes, prefsRes] = await Promise.all([
    supabase
      .from("coaches")
      .select(
        "id, name, email, language, autonomous_mode, voice_model, display_name, role_title, timezone, working_hours, email_signature, public_booking_url, avatar_url, active_calendar_provider, sales_toolkit",
      )
      .eq("id", user.id)
      .single(),
    supabase.from("integrations").select("id, provider, status, error_message, last_checked_at").eq("coach_id", user.id),
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
    <div className="space-y-6 w-full">
      <h1 className="text-[28px] font-semibold leading-[1.2]">{t.settings.page.title}</h1>

      {sp.connected === "gmail" && (
        <div className="rounded-2xl bg-[oklch(60%_0.14_145)] text-white p-4 text-sm">
          {t.settings.page.gmailConnected}
        </div>
      )}
      {sp.error && (
        <div className="rounded-2xl bg-destructive text-destructive-foreground p-4 text-sm">
          {describeError(sp.error, t)}
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

      <section id="sales" className="scroll-mt-24 rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <SalesToolkitSection salesToolkit={coach.sales_toolkit} />
      </section>

      <section id="calendar" className="scroll-mt-24 rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <CalendarSection
          activeProvider={(coach.active_calendar_provider as CalendarProviderId | null) ?? null}
          integrations={integrationsRes.data ?? []}
          oauthConfigured={CALENDAR_PROVIDER_IDS.reduce(
            (acc, id) => {
              acc[id] = isOAuthConfigured(CALENDAR_PROVIDERS[id]);
              return acc;
            },
            {} as Record<CalendarProviderId, boolean>,
          )}
        />
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

function describeError(code: string, t: Dictionary): string {
  const e = t.settings.errors;
  switch (code) {
    case "insufficient_scopes":
      return e.insufficientScopes;
    case "oauth_no_refresh_token":
      return e.oauthNoRefreshToken;
    case "oauth_vault_failed":
      return e.oauthVaultFailed;
    case "oauth_exchange_failed":
      return e.oauthExchangeFailed;
    case "oauth_missing_params":
      return e.oauthMissingParams;
    case "calendar_unknown_provider":
      return e.calendarUnknownProvider;
    case "calendar_wrong_auth_type":
      return e.calendarWrongAuthType;
    case "calendar_oauth_not_configured":
      return e.calendarOauthNotConfigured;
    case "calendar_oauth_start_failed":
      return e.calendarOauthStartFailed;
    case "calendar_missing_params":
      return e.calendarMissingParams;
    case "calendar_state_invalid":
      return e.calendarStateInvalid;
    case "calendar_oauth_exchange_failed":
      return e.calendarOauthExchangeFailed;
    case "calendar_vault_failed":
      return e.calendarVaultFailed;
    default:
      if (code.startsWith("calendar_oauth_")) {
        return e.calendarOauthGeneric(
          code.replace("calendar_oauth_", "").replace(/_/g, " "),
        );
      }
      return e.generic;
  }
}
