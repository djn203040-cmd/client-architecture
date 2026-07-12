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
import { useDictionary } from "@/lib/i18n/provider";

export function ManualStateOverride({
  leadId,
  currentStatus,
  leadName,
}: {
  leadId: string;
  currentStatus: TLeadStatus;
  leadName: string;
}) {
  const t = useDictionary();
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
      toast.error(t.leads.stateOverride.updateError);
      return;
    }
    toast.success(t.leads.stateOverride.updated);
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <PencilSimple weight="regular" className="size-4 mr-2" />
            {t.leads.stateOverride.trigger}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {LeadStatusEnum.options.map((s) => (
            <DropdownMenuItem
              key={s}
              disabled={s === currentStatus}
              onSelect={() => setStatus(s)}
            >
              {t.leads.status[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={pendingDnc} onOpenChange={setPendingDnc}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.leads.stateOverride.dncTitle(leadName)}</DialogTitle>
            <DialogDescription>
              {t.leads.stateOverride.dncDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDnc(false)}>
              {t.leads.stateOverride.dncCancel}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setPendingDnc(false);
                await applyStatus("do_not_contact");
              }}
            >
              {t.leads.stateOverride.dncConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
