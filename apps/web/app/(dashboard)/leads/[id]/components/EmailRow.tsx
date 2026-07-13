"use client";
import { useState, useCallback } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/provider";
import { toDateLocale } from "@/lib/format/datetime";
import type { TThreadEmail } from "@/lib/gmail/thread";

export function EmailRow({
  email,
  defaultOpen = false,
}: {
  email: TThreadEmail;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const dateLocale = toDateLocale(useLocale());
  const toggle = useCallback(() => setOpen((o) => !o), []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  }

  const fromName = email.from.replace(/<[^>]+>/, "").trim() || email.from;
  const displayDate = email.date
    ? new Date(email.date).toLocaleDateString(dateLocale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      className="rounded-xl bg-card border border-border px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium flex-1 min-w-0 truncate">
          {fromName}
        </span>
        <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
          {displayDate}
        </span>
        <CaretDown
          size={16}
          className={cn(
            "text-muted-foreground flex-shrink-0",
            "transition-transform duration-150 motion-reduce:transition-none",
            open && "rotate-180"
          )}
        />
      </div>

      {!open && (
        <>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {email.subject}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {email.snippet}
          </p>
        </>
      )}

      {open && (
        <div className="transition-all duration-200 ease-out motion-reduce:transition-none">
          <p className="text-sm text-muted-foreground mt-0.5">{email.subject}</p>
          <p className="text-sm leading-[1.5] whitespace-pre-wrap mt-3 pt-3 border-t border-border max-w-[65ch]">
            {email.body || email.snippet}
          </p>
        </div>
      )}
    </div>
  );
}
