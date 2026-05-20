import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { SequenceSettingsClient } from "@/components/settings/SequenceSettingsClient";
import { BellSimple, Lightning } from "@phosphor-icons/react/dist/ssr";

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
  const [{ data: integrations }, { data: coachData }] = await Promise.all([
    supabase.from("integrations").select("*").eq("coach_id", user!.id),
    supabase.from("coaches").select("sequence_config").eq("id", user!.id).single(),
  ]);
  const gmail = integrations?.find((i) => i.provider === "gmail");
  const sequenceConfig = (coachData?.sequence_config as {
    no_show_delays?: number[];
    call_completed_delays?: number[];
  } | null) ?? {};
  const normalizedConfig = {
    no_show_delays: sequenceConfig.no_show_delays ?? [1, 3, 7, 14, 21],
    call_completed_delays: sequenceConfig.call_completed_delays ?? [1, 4, 10],
  };

  return (
    <section className="space-y-6 max-w-2xl">
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

      <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
        <h2 className="text-xl font-semibold">Gmail</h2>
        <p className="text-sm text-muted-foreground">
          We send emails as you, from your Gmail account.
        </p>
        {gmail?.status === "connected" ? (
          <div className="flex items-center justify-between">
            <span className="text-sm">Connected</span>
            <Link
              href="/api/auth/gmail/authorize"
              className="text-sm text-muted-foreground hover:underline"
            >
              Reconnect
            </Link>
          </div>
        ) : (
          <Link
            href="/api/auth/gmail/authorize"
            className="inline-block px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm"
          >
            Connect Gmail
          </Link>
        )}
      </div>

      <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
        <h2 className="text-xl font-semibold">Sequence Cadence</h2>
        <SequenceSettingsClient sequenceConfig={normalizedConfig} />
      </div>

      <Link
        href={"/settings/notifications" as never}
        className="block rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/20 dark:hover:bg-white/10 transition-colors space-y-2"
      >
        <div className="flex items-center gap-3">
          <BellSimple className="size-5" weight="regular" />
          <h3 className="text-lg font-semibold">Notifications</h3>
        </div>
        <p className="text-sm text-muted-foreground">Choose which channels deliver each event.</p>
      </Link>

      <Link
        href={"/settings/autonomous" as never}
        className="block rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/20 dark:hover:bg-white/10 transition-colors space-y-2"
      >
        <div className="flex items-center gap-3">
          <Lightning className="size-5" weight="regular" />
          <h3 className="text-lg font-semibold">Autonomous mode</h3>
        </div>
        <p className="text-sm text-muted-foreground">Choose how much trust to give the AI.</p>
      </Link>
    </section>
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
