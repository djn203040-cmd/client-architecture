"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useDictionary, useLocale } from "@/lib/i18n/provider";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { DANGER_PHRASES } from "@/lib/i18n/confirm-phrases";
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

function buildActions(email: string, locale: Locale, t: Dictionary): ActionConfig[] {
  const a = t.settings.danger.actions;
  // Disconnect phrases are shown (and typed) in the coach's language; the API
  // accepts either language. delete-account confirms against the email, which
  // is locale-neutral.
  return [
    {
      slug: "disconnect-gmail",
      label: a.disconnectGmailLabel,
      description: a.disconnectGmailDescription,
      phrase: DANGER_PHRASES["disconnect-gmail"][locale],
    },
    {
      slug: "disconnect-slack",
      label: a.disconnectSlackLabel,
      description: a.disconnectSlackDescription,
      phrase: DANGER_PHRASES["disconnect-slack"][locale],
    },
    {
      slug: "disconnect-twilio",
      label: a.disconnectTwilioLabel,
      description: a.disconnectTwilioDescription,
      phrase: DANGER_PHRASES["disconnect-twilio"][locale],
    },
    {
      slug: "delete-account",
      label: a.deleteAccountLabel,
      description: a.deleteAccountDescription,
      phrase: email,
      destructive: true,
    },
  ];
}

function ActionCard({ action, email }: { action: ActionConfig; email: string }) {
  const t = useDictionary();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Email confirm (destructive) is exact; the disconnect phrases match
  // case-/trim-insensitively, mirroring the server's `matchesConfirmPhrase`.
  const matches = action.destructive
    ? input === action.phrase
    : input.trim().toLowerCase() === action.phrase.toLowerCase();

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
        toast.error(error ?? t.settings.danger.actionFailed);
        return;
      }
      setOpen(false);
      toast.success(action.destructive ? t.settings.danger.accountDeleted : t.settings.danger.disconnected);
      if (action.destructive) {
        window.location.href = "/login";
      } else {
        window.location.reload();
      }
    } catch {
      toast.error(t.settings.danger.somethingWentWrong);
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
              ? "border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 shrink-0"
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
              {t.settings.danger.typeToConfirmBefore}{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                {action.destructive ? email : action.phrase}
              </code>{" "}
              {t.settings.danger.typeToConfirmAfter}
            </Label>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={action.destructive ? email : action.phrase}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t.settings.danger.cancel}</Button>
            <Button
              disabled={!matches || loading}
              onClick={confirm}
              className={action.destructive
                ? "bg-red-500 hover:bg-red-600 text-white"
                : undefined}
            >
              {loading ? t.settings.danger.processing : t.settings.danger.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DangerZone({ coach }: Props) {
  const t = useDictionary();
  const locale = useLocale();
  const email = coach.email ?? "";
  // buildActions depends on email + locale + the active dictionary
  const actions = useMemo(() => buildActions(email, locale, t), [email, locale, t]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{t.settings.danger.title}</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          {t.settings.danger.description}
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
