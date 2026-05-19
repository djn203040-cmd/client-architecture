"use client";
import { Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

export function ExamplesList({
  examples,
  onChange,
}: {
  examples: string[];
  onChange: (updated: string[]) => void;
}) {
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
        {examples.map((example, i) => (
          <li
            key={i}
            className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0"
          >
            <p className="text-sm text-foreground line-clamp-2 flex-1">{example}</p>
            <button
              onClick={() => remove(i)}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive transition-colors shrink-0"
              aria-label={`Remove example ${i + 1}`}
            >
              <Trash weight="regular" className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
