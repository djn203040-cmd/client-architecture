"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

export function DeleteLeadButton({
  leadId,
  leadName,
}: {
  leadId: string;
  leadName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onConfirm() {
    setDeleting(true);
    const r = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
    setDeleting(false);
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't delete this lead. Try again.");
      return;
    }
    toast.success(`${leadName} deleted`);
    setOpen(false);
    router.push("/leads");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
          <Trash weight="regular" className="size-4 mr-2" />
          Delete lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {leadName}?</DialogTitle>
          <DialogDescription>
            This permanently removes the lead and all of their timeline, drafts, transcripts,
            and notes. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
