"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface InviteAcceptCardProps {
  tokenStatus: "loading" | "valid" | "invalid";
  formAction?: (formData: FormData) => void;
  error?: string;
  pending?: boolean;
}

export function InviteAcceptCard({
  tokenStatus,
  formAction,
  error,
  pending,
}: InviteAcceptCardProps) {
  if (tokenStatus === "loading") {
    return (
      <div
        className={cn(
          "rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5",
          "border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-6",
        )}
      >
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-11 w-full" />
        <p className="mt-4 text-sm text-muted-foreground text-center">
          Validating your invite...
        </p>
      </div>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <div
        className={cn(
          "rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5",
          "border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-6",
        )}
      >
        <h1 className="text-[28px] font-semibold leading-[1.2] text-foreground mb-3">
          This invite has expired or already been used
        </h1>
        <p className="text-sm text-muted-foreground leading-[1.4] mb-6">
          This invite link has expired or already been used. Ask Daniel for a new one.
        </p>
        <Button asChild variant="outline" className="min-h-[44px] w-full">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5",
        "border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-6",
      )}
    >
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold leading-[1.2] text-foreground">
          Set your password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground leading-[1.4]">
          You&apos;ve been invited. Set a password to continue.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
          />
          <p className="text-xs text-muted-foreground">
            At least 8 characters, one uppercase letter, one number.
          </p>
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
          {pending ? "Setting password..." : "Continue"}
        </Button>
      </form>
    </div>
  );
}
