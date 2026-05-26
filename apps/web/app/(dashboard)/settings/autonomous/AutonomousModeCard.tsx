"use client";
import { useState, useTransition } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { WarningCircle } from "@phosphor-icons/react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ApiMode } from "@/lib/autonomous-mode";
import { AutonomousModeAConfirmModal } from "./AutonomousModeAConfirmModal";

const OPTIONS: { value: ApiMode; label: string; description: string }[] = [
  {
    value: "manual",
    label: "Manual",
    description: "Every draft waits for your review. Recommended.",
  },
  {
    value: "mode_b",
    label: "Auto-send after 24h",
    description:
      "Drafts you don't act on send automatically when their scheduled time arrives. You still see them in the queue.",
  },
  {
    value: "mode_a",
    label: "Send without review",
    description: "Drafts skip the queue and send immediately. Not recommended.",
  },
];

const SUCCESS_COPY: Record<ApiMode, string> = {
  manual: "Manual review enabled.",
  mode_a: "Autonomous send enabled.",
  mode_b: "Auto-send after 24h enabled.",
};

export function AutonomousModeCard({ initialMode }: { initialMode: ApiMode }) {
  const [mode, setMode] = useState<ApiMode>(initialMode);
  const [previousMode, setPreviousMode] = useState<ApiMode>(initialMode);
  const [modeAOpen, setModeAOpen] = useState(false);
  const [, startTransition] = useTransition();
  const reduce = useReducedMotion();

  async function commit(next: ApiMode, confirmationPhrase?: string): Promise<boolean> {
    const r = await fetch("/api/settings/autonomous-mode", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: next, confirmation_phrase: confirmationPhrase }),
    });
    if (!r.ok) {
      toast.error("Couldn't save. Try again.");
      setMode(previousMode);
      return false;
    }
    toast.success(SUCCESS_COPY[next]);
    setPreviousMode(next);
    return true;
  }

  function handleChange(next: string) {
    const nextMode = next as ApiMode;
    setMode(nextMode);
    if (nextMode === "mode_a") {
      setModeAOpen(true);
      return;
    }
    startTransition(() => {
      void commit(nextMode);
    });
  }

  function onModeAConfirm(phrase: string) {
    setModeAOpen(false);
    startTransition(() => {
      void commit("mode_a", phrase).then((ok) => {
        if (!ok) setMode(previousMode);
      });
    });
  }

  function onModeACancel() {
    setModeAOpen(false);
    setMode(previousMode);
  }

  return (
    <>
      <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
        <h2 className="text-xl font-semibold">Autonomous mode</h2>
        <AnimatePresence>
          {mode === "mode_a" && (
            <motion.div
              key="amber-banner"
              initial={reduce ? { opacity: 0 } : { y: -8, opacity: 0 }}
              animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Alert className="bg-amber-100/70 dark:bg-amber-900/30 border-amber-300/40 text-amber-900 dark:text-amber-100">
                <WarningCircle className="size-3.5 mr-2" weight="regular" />
                <AlertDescription>
                  Autonomous send is active. Messages send without review.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
        <RadioGroup value={mode} onValueChange={handleChange} className="space-y-3">
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`mode-${opt.value}`}
              className={`block rounded-xl border p-4 cursor-pointer hover:bg-muted/30 transition-colors ${
                mode === opt.value ? "border-primary-soft ring-1 ring-primary-soft/40" : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value={opt.value} id={`mode-${opt.value}`} className="mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-sm text-muted-foreground">{opt.description}</p>
                </div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>
      <AutonomousModeAConfirmModal
        open={modeAOpen}
        onConfirm={onModeAConfirm}
        onCancel={onModeACancel}
      />
    </>
  );
}
