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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

export function DeleteCoachButton({
  coachId,
  coachEmail,
  coachName,
}: {
  coachId: string;
  coachEmail: string;
  coachName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const matches = typed.trim().toLowerCase() === coachEmail.toLowerCase();

  async function handleDelete() {
    setDeleting(true);
    const r = await fetch(`/api/admin/coaches/${coachId}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm_email: typed.trim() }),
    });
    setDeleting(false);

    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't delete this coach. Try again.");
      return;
    }
    const data = await r.json().catch(() => ({}));
    if (data.secrets_purged === false) {
      toast.warning(`${coachName} deleted, but Vault secrets weren't purged — apply migration 20260815130000_purge_coach_secrets.`);
    } else {
      toast.success(`${coachName} deleted`);
    }
    setOpen(false);
    router.push("/admin");
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTyped("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-[44px] text-destructive hover:text-destructive">
          <Trash weight="regular" className="size-4 mr-2" />
          Delete coach
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {coachName}?</DialogTitle>
          <DialogDescription>
            This permanently removes their login, leads, drafts, sequences, integrations and
            stored tokens. It can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="delete-confirm-email">
            Type <span className="font-mono">{coachEmail}</span> to confirm
          </Label>
          <Input
            id="delete-confirm-email"
            type="email"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="min-h-[44px]">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!matches || deleting}
            className="min-h-[44px]"
          >
            {deleting ? "Deleting…" : "Delete permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
