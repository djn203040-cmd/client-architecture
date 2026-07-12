"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Coach {
  email: string | null;
}

interface Props {
  coach: Coach;
}

interface ActionConfig {
  slug: string;
  label: string;
  description: string;
  phrase: string;
  destructive?: boolean;
}

function buildActions(email: string): ActionConfig[] {
  return [
    {
      slug: "disconnect-gmail",
      label: "Disconnect Gmail",
      description: "Removes Gmail access. Your sequences will pause until you reconnect.",
      phrase: "disconnect gmail",
    },
    {
      slug: "disconnect-slack",
      label: "Disconnect Slack",
      description: "Removes Slack notifications. Dashboard notifications stay active.",
      phrase: "disconnect slack",
    },
    {
      slug: "disconnect-twilio",
      label: "Disconnect Twilio",
      description: "Removes WhatsApp and SMS notifications.",
      phrase: "disconnect twilio",
    },
    {
      slug: "delete-account",
      label: "Delete account",
      description: "Permanently deletes your account and all data. This cannot be undone.",
      phrase: email,
      destructive: true,
    },
  ];
}

function ActionCard({ action, email }: { action: ActionConfig; email: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const matches = input === action.phrase;

  async function confirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/danger/${action.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmPhrase: input }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error ?? "Action failed");
        return;
      }
      setOpen(false);
      toast.success(action.destructive ? "Account deleted" : "Disconnected");
      if (action.destructive) {
        window.location.href = "/login";
      } else {
        window.location.reload();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 p-4">
      <div>
        <p className="text-sm font-medium">{action.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
      </div>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setInput(""); }}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={action.destructive
              ? "border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 shrink-0"
              : "shrink-0"}
          >
            {action.label}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action.label}</DialogTitle>
            <DialogDescription>{action.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm">
              Type{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                {action.destructive ? email : action.phrase}
              </code>{" "}
              to confirm
            </Label>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={action.destructive ? email : action.phrase}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!matches || loading}
              onClick={confirm}
              className={action.destructive
                ? "bg-red-500 hover:bg-red-600 text-white"
                : undefined}
            >
              {loading ? "Processing…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DangerZone({ coach }: Props) {
  const email = coach.email ?? "";
  // buildActions depends only on email, stable across renders
  const actions = useMemo(() => buildActions(email), [email]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Danger zone</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          Irreversible actions. All require exact phrase confirmation.
        </p>
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <ActionCard key={action.slug} action={action} email={email} />
        ))}
      </div>
    </div>
  );
}
