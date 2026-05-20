"use client";
import { useState, useId, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONFIRMATION_PHRASE = "send without review";

interface Props {
  open: boolean;
  onConfirm: (phrase: string) => void;
  onCancel: () => void;
}

export function AutonomousModeAConfirmModal({ open, onConfirm, onCancel }: Props) {
  const [phrase, setPhrase] = useState("");
  const inputId = useId();
  const matches = phrase.trim() === CONFIRMATION_PHRASE;

  useEffect(() => {
    if (open) setPhrase("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-[460px] backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Send without review?</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-[1.5] max-w-[65ch]">
          Drafts will send without your review. You won&apos;t see them in the queue before they go
          out. This setting is not recommended for most coaches.
        </p>
        <div className="space-y-2">
          <Label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
            Type the phrase to confirm
          </Label>
          <Input
            id={inputId}
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={CONFIRMATION_PHRASE}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onCancel} className="min-h-[44px]">
            Keep manual
          </Button>
          <Button
            variant="destructive"
            disabled={!matches}
            onClick={() => onConfirm(phrase.trim())}
            className="min-h-[44px]"
          >
            Enable autonomous send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
