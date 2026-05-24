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

export function LiftDoNotContactButton({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      try {
        await liftDoNotContact(leadId);
        toast.success(`${leadName} can be contacted again — state reset to Identified.`);
        setOpen(false);
      } catch {
        toast.error("Couldn't lift the flag. Try again.");
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
        Lift
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lift Do-Not-Contact for {leadName}?</DialogTitle>
            <DialogDescription>
              This lead previously asked not to be contacted. Only lift this flag if
              they have explicitly opted back in. Their state will reset to Identified
              so you can re-engage them like a new lead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={pending}>
              {pending ? "Lifting…" : "Yes, lift the flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
