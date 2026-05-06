"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface InviteLoginCardProps {
  error?: string;
  formAction: (formData: FormData) => void;
  pending?: boolean;
}

export function InviteLoginCard({ error, formAction, pending }: InviteLoginCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5",
        "border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-6",
      )}
    >
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold leading-[1.2] text-foreground">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-muted-foreground leading-[1.4]">
          You&apos;ve been invited. Sign in to continue.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive leading-[1.4]" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={pending}
          className="mt-2 min-h-[44px] bg-[oklch(62%_0.14_50)] hover:bg-[oklch(58%_0.14_50)] dark:bg-[oklch(70%_0.14_50)] dark:hover:bg-[oklch(66%_0.14_50)] text-white font-medium"
        >
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
