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
import { useDictionary, useLocale } from "@/lib/i18n/provider";
import { AUTONOMOUS_MODE_A_PHRASE } from "@/lib/i18n/confirm-phrases";

interface Props {
  open: boolean;
  onConfirm: (phrase: string) => void;
  onCancel: () => void;
}

export function AutonomousModeAConfirmModal({ open, onConfirm, onCancel }: Props) {
  const t = useDictionary();
  const locale = useLocale();
  const copy = t.settingsAdvanced.autonomous.confirmModal;
  const confirmPhrase = AUTONOMOUS_MODE_A_PHRASE[locale];
  const [phrase, setPhrase] = useState("");
  const inputId = useId();
  const matches = phrase.trim().toLowerCase() === confirmPhrase.toLowerCase();

  useEffect(() => {
    if (open) setPhrase("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-[460px] backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{copy.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-[1.5] max-w-[65ch]">
          {copy.body}
        </p>
        <div className="space-y-2">
          <Label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
            {copy.typeToConfirm}
          </Label>
          <Input
            id={inputId}
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={confirmPhrase}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onCancel} className="min-h-[44px]">
            {copy.keepManual}
          </Button>
          <Button
            variant="destructive"
            disabled={!matches}
            onClick={() => onConfirm(phrase.trim())}
            className="min-h-[44px]"
          >
            {copy.enableAutonomous}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
