"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { StuckSend } from "@/lib/admin/stuck-sends";
import type { GmailCheck } from "@/lib/admin/stuck-sends";

/** "23 min ago" / "2 h ago" / "3 d ago" — coarse is fine, this is an age, not a timestamp. */
function agoLabel(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)} h ago`;
  return `${Math.floor(mins / (60 * 24))} d ago`;
}

export function StuckSendRow({ row }: { row: StuckSend }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"check" | "mark_sent" | "resend" | null>(null);
  const [check, setCheck] = useState<GmailCheck | null>(null);

  async function post(action: "check" | "mark_sent" | "resend") {
    setBusy(action);
    const r = await fetch("/api/admin/stuck-sends", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draftId: row.draft_id, action }),
    }).catch(() => null);
    setBusy(null);

    if (!r) {
      toast.error("Network error. Try again.");
      return;
    }
    const data = await r.json().catch(() => ({}));

    if (action === "check") {
      setCheck(data as GmailCheck);
      return;
    }
    // 409 is a refusal with a reason (already sent, already resolved), not a crash.
    if (!r.ok) {
      toast.error(data.message ?? "Couldn't resolve this draft.");
      router.refresh();
      return;
    }
    toast.success(data.message ?? "Resolved");
    router.refresh();
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium truncate">{row.subject ?? "(no subject)"}</div>
          <div className="text-xs text-muted-foreground">
            {row.lead_name ?? "Unknown lead"}
            {row.lead_email ? ` · ${row.lead_email}` : ""} · sent as{" "}
            {row.coach_name ?? row.coach_email ?? "unknown coach"}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {row.witnessed ? (
            <span className="text-xs px-2 py-1 rounded-md border border-border text-muted-foreground">
              Delivered · self-healing
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              Needs a decision
            </span>
          )}
          <span className="text-xs text-muted-foreground font-mono">
            {agoLabel(row.stuck_since)}
          </span>
        </div>
      </div>

      {row.witnessed ? (
        <p className="text-xs text-muted-foreground">
          The email reached the lead — only the bookkeeping was interrupted. The reconciler
          finishes this within 10 minutes; no action needed.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            We can&apos;t tell from our side whether this email left. Check{" "}
            {row.coach_name ?? "the coach"}&apos;s Gmail before deciding — resending one that
            already went out can&apos;t be undone.
          </p>

          {check && <CheckResult check={check} />}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="min-h-[44px]"
              disabled={busy !== null}
              onClick={() => post("check")}
            >
              {busy === "check" ? "Checking Gmail…" : "Check Gmail"}
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px]"
              disabled={busy !== null}
              onClick={() => post("mark_sent")}
            >
              {busy === "mark_sent" ? "Marking…" : "It went out — mark as sent"}
            </Button>
            <Button
              className="min-h-[44px]"
              disabled={busy !== null}
              onClick={() => post("resend")}
            >
              {busy === "resend" ? "Re-queueing…" : "It didn't — send it"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function CheckResult({ check }: { check: GmailCheck }) {
  if (check.status === "unavailable") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
        {`${check.message} Until that's resolved, treat this as unknown rather than unsent.`}
      </div>
    );
  }

  if (check.status === "none") {
    return (
      <div className="rounded-xl border border-border bg-black/3 dark:bg-white/5 p-3 text-xs">
        No message to this lead in the coach&apos;s Sent mail since the send started. Safe to
        send it.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-black/3 dark:bg-white/5 p-3 text-xs space-y-2">
      <p className="font-medium">
        Found {check.matches.length} message{check.matches.length === 1 ? "" : "s"} to this lead
        in Sent — this email most likely did go out.
      </p>
      <ul className="space-y-1">
        {check.matches.map((m) => (
          <li key={m.gmailMessageId} className="flex justify-between gap-3">
            <span className="truncate">
              {m.subject || "(no subject)"}
              {m.subjectMatches && (
                <span className="ml-2 text-muted-foreground">subject matches</span>
              )}
            </span>
            <span className="font-mono text-muted-foreground shrink-0">
              {new Date(m.sentAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
