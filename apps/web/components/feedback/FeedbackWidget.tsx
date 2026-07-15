"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MegaphoneSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreateFeedbackSchema, type TFeedbackSentiment } from "@client/shared/validators";
import { TOUR_ANCHOR } from "@/lib/tour/anchors";
import { useDictionary } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Taste-phase feedback widget: a floating megaphone button (bottom-right, above
 * the mobile bottom nav) opening a small panel — title, good/bad dropdown, note.
 */
export function FeedbackWidget() {
  const t = useDictionary().feedback;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [sentiment, setSentiment] = useState<TFeedbackSentiment>("good");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = CreateFeedbackSchema.safeParse({
      title: title.trim(),
      sentiment,
      note: note.trim(),
      page_path: pathname,
    });
    if (!parsed.success) {
      setTitleError(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error("feedback_failed");
      toast.success(t.success);
      setTitle("");
      setSentiment("good");
      setNote("");
      setTitleError(false);
      setOpen(false);
    } catch {
      toast.error(t.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-tour={TOUR_ANCHOR.feedbackButton}
          aria-label={t.buttonLabel}
          title={t.buttonLabel}
          className="fixed right-4 bottom-20 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none lg:right-6 lg:bottom-6"
        >
          <MegaphoneSimple weight="fill" className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        className="w-[min(92vw,22rem)] backdrop-blur-md"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{t.panelTitle}</p>
            <p className="text-xs text-muted-foreground">{t.panelDescription}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-title">{t.fieldTitle}</Label>
            <Input
              id="feedback-title"
              value={title}
              maxLength={120}
              placeholder={t.fieldTitlePlaceholder}
              aria-invalid={titleError || undefined}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError && e.target.value.trim()) setTitleError(false);
              }}
            />
            {titleError && (
              <p className="text-xs text-destructive">{t.titleRequired}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-sentiment">{t.fieldSentiment}</Label>
            <select
              id="feedback-sentiment"
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value as TFeedbackSentiment)}
              className={cn(
                "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none",
                "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30",
              )}
            >
              <option value="good">{t.sentimentGood}</option>
              <option value="bad">{t.sentimentBad}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-note">{t.fieldNote}</Label>
            <Textarea
              id="feedback-note"
              value={note}
              maxLength={20000}
              rows={5}
              placeholder={t.fieldNotePlaceholder}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? t.submitting : t.submit}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
