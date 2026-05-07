"use client";
import { Button } from "@/components/ui/button";
import { WarningOctagon } from "@phosphor-icons/react";

export default function DashboardError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-8 max-w-md text-center">
        <WarningOctagon weight="regular" className="size-10 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold mt-4">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mt-2">
          An unexpected error occurred. Try again, or refresh the page.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
