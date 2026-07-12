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
import { useDictionary } from "@/lib/i18n/provider";

export function DeleteLeadButton({
  leadId,
  leadName,
}: {
  leadId: string;
  leadName: string;
}) {
  const t = useDictionary();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onConfirm() {
    setDeleting(true);
    const r = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
    setDeleting(false);
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      toast.error(data.error ?? t.leads.deleteLead.error);
      return;
    }
    toast.success(t.leads.deleteLead.success(leadName));
    setOpen(false);
    router.push("/leads");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
          <Trash weight="regular" className="size-4 mr-2" />
          {t.leads.deleteLead.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.leads.deleteLead.title(leadName)}</DialogTitle>
          <DialogDescription>
            {t.leads.deleteLead.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            {t.leads.deleteLead.cancel}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? t.leads.deleteLead.deleting : t.leads.deleteLead.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
