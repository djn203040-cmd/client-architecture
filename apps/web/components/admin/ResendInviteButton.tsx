"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { toast } from "sonner";

export function ResendInviteButton({ coachId }: { coachId: string }) {
  const [sending, setSending] = useState(false);

  async function handleClick() {
    setSending(true);
    const r = await fetch(`/api/admin/coaches/${coachId}/resend-invite`, { method: "POST" });
    setSending(false);

    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      toast.error(data.error ?? "Invite couldn't be resent. Try again in a minute.");
      return;
    }
    const data = await r.json();
    toast.success(`Fresh invite sent to ${data.email}`);
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={sending} className="min-h-[44px]">
      <PaperPlaneTilt weight="regular" className="size-4 mr-2" />
      {sending ? "Sending…" : "Resend invite"}
    </Button>
  );
}
