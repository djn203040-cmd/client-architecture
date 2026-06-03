"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PencilSimple } from "@phosphor-icons/react";
import { LeadStatusEnum } from "@client/shared/validators";
import type { TLeadStatus } from "@client/shared/types";
import { toast } from "sonner";

const LABELS: Record<TLeadStatus, string> = {
  identified: "Identified",
  call_booked: "Call booked",
  no_show: "No show",
  call_completed: "Call completed",
  in_sequence: "In sequence",
  replied: "Replied",
  converted: "Converted",
  lost: "Lost",
  unsubscribed: "Unsubscribed",
  do_not_contact: "Do not contact",
  bounced: "Bounced",
};

export function ManualStateOverride({
  leadId,
  currentStatus,
  leadName,
}: {
  leadId: string;
  currentStatus: TLeadStatus;
  leadName: string;
}) {
  const router = useRouter();
  const [pendingDnc, setPendingDnc] = useState(false);

  async function setStatus(s: TLeadStatus) {
    if (s === "do_not_contact") {
      setPendingDnc(true);
      return;
    }
    await applyStatus(s);
  }

  async function applyStatus(s: TLeadStatus) {
    const r = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    if (!r.ok) {
      toast.error("Couldn't update status.");
      return;
    }
    toast.success("Status updated");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <PencilSimple weight="regular" className="size-4 mr-2" />
            Update lead status
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {LeadStatusEnum.options.map((s) => (
            <DropdownMenuItem
              key={s}
              disabled={s === currentStatus}
              onSelect={() => setStatus(s)}
            >
              {LABELS[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={pendingDnc} onOpenChange={setPendingDnc}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {leadName} as do-not-contact?</DialogTitle>
            <DialogDescription>
              No further emails will ever be sent to this address.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDnc(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setPendingDnc(false);
                await applyStatus("do_not_contact");
              }}
            >
              Mark do-not-contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
