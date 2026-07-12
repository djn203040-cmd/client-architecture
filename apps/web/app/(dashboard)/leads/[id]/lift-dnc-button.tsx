"use client";
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { liftDoNotContact } from "./lift-dnc-action";
import { useDictionary } from "@/lib/i18n/provider";

export function LiftDoNotContactButton({ leadId, leadName }: { leadId: string; leadName: string }) {
  const t = useDictionary();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      try {
        await liftDoNotContact(leadId);
        toast.success(t.leads.liftDnc.success(leadName));
        setOpen(false);
      } catch {
        toast.error(t.leads.liftDnc.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-destructive-foreground/70 hover:text-destructive-foreground hover:underline underline-offset-2 cursor-pointer"
      >
        {t.leads.liftDnc.lift}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.leads.liftDnc.title(leadName)}</DialogTitle>
            <DialogDescription>
              {t.leads.liftDnc.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t.leads.liftDnc.cancel}
            </Button>
            <Button onClick={onConfirm} disabled={pending}>
              {pending ? t.leads.liftDnc.lifting : t.leads.liftDnc.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
