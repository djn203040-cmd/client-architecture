"use client";
import { Button } from "@/components/ui/button";
import { WarningOctagon } from "@phosphor-icons/react";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-8 max-w-md text-center">
        <WarningOctagon weight="regular" className="size-10 text-destructive mx-auto" />
        <h1 className="text-xl font-semibold mt-4">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mt-2">
          An unexpected error occurred. Try again, or refresh the page.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
