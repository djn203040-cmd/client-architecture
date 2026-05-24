"use client";
import { useState } from "react";
import { CaretDown, CaretUp, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Examples shorter than this comfortably fit in 2 lines, so no toggle is shown.
const CLAMP_THRESHOLD = 140;

export function ExamplesList({
  examples,
  onChange,
}: {
  examples: string[];
  onChange: (updated: string[]) => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggleExpanded(index: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function remove(index: number) {
    const removed = examples[index] ?? '';
    const next = examples.filter((_, i) => i !== index);
    onChange(next);
    toast("Removed. Undo?", {
      duration: 4000,
      action: {
        label: "Undo",
        onClick: () => {
          const restored = [...next];
          restored.splice(index, 0, removed);
          onChange(restored);
        },
      },
    });
  }

  if (examples.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">Writing Examples</h2>
        <p className="text-sm text-muted-foreground italic">
          No examples selected yet. Analyze your writing first.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Writing Examples</h2>
        <span className="text-xs font-mono text-muted-foreground">
          {examples.length} {examples.length === 1 ? "example" : "examples"} selected
        </span>
      </div>

      <ul
        className="max-h-[400px] overflow-y-auto list-none p-0 m-0"
        tabIndex={0}
        aria-label="Writing examples"
      >
        {examples.map((example, i) => {
          const isExpanded = expanded.has(i);
          const canToggle = example.length > CLAMP_THRESHOLD;
          return (
            <li
              key={i}
              className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm text-foreground whitespace-pre-wrap",
                    !isExpanded && "line-clamp-2",
                  )}
                >
                  {example}
                </p>
                {canToggle && (
                  <button
                    onClick={() => toggleExpanded(i)}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <CaretUp weight="regular" className="size-3" />
                    ) : (
                      <CaretDown weight="regular" className="size-3" />
                    )}
                    {isExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
              <button
                onClick={() => remove(i)}
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive transition-colors shrink-0"
                aria-label={`Remove example ${i + 1}`}
              >
                <Trash weight="regular" className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
