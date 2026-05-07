import Link from "next/link";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { getIntegrationHealth } from "./integration-health-data";

export async function IntegrationHealthCard() {
  const health = await getIntegrationHealth();

  if (health.status === "connected") {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm"
        role="status"
        aria-live="polite"
      >
        <CheckCircle weight="regular" className="size-4 text-[var(--health-green)]" />
        <span>Gmail connected</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2 px-3 py-3 rounded-xl bg-[color:var(--health-red)]/10 border border-[color:var(--health-red)]/30 text-sm"
      role="alert"
    >
      <div className="flex items-center gap-2">
        <WarningCircle weight="regular" className="size-4 text-[var(--health-red)]" />
        <span className="font-medium">Gmail disconnected</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Gmail disconnected. Your sequences are paused. Reconnect to resume.
      </p>
      <Link
        href="/api/auth/gmail/authorize"
        className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-accent text-accent-foreground text-xs"
      >
        Reconnect Gmail
      </Link>
    </div>
  );
}
