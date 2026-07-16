"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Compass } from "@phosphor-icons/react";
import { useDictionary } from "@/lib/i18n/provider";

/**
 * The one-time "welcome to your dashboard" popup a coach sees right after
 * finishing onboarding. Its whole job is to hand off into the guided tour;
 * dismissing it (skip, X, or Escape) counts as "seen" so we never nag again —
 * the sidebar's "Take a tour" link stays available.
 */
export function TourWelcomeDialog({
  onStart,
  onSkip,
}: {
  onStart: () => void;
  onSkip: () => void;
}) {
  const t = useDictionary();
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onSkip(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/15 text-primary mb-1">
            <Compass weight="regular" className="size-6" />
          </div>
          <DialogTitle className="text-center text-xl leading-snug">
            {t.tour.welcomeDialog.title}
          </DialogTitle>
          <DialogDescription className="text-center leading-relaxed">
            {t.tour.welcomeDialog.body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={onStart}>
            {t.tour.welcomeDialog.start}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onSkip}>
            {t.tour.welcomeDialog.skip}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
