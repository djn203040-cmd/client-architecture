"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ResetPasswordCardProps {
  tokenStatus: "loading" | "valid" | "invalid";
  formAction?: (formData: FormData) => void;
  error?: string;
  pending?: boolean;
  debugError?: string;
}

export function ResetPasswordCard({
  tokenStatus,
  formAction,
  error,
  pending,
  debugError,
}: ResetPasswordCardProps) {
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
          Verifying your reset link...
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
          This reset link has expired
        </h1>
        <p className="text-sm text-muted-foreground leading-[1.4] mb-3">
          Reset links expire 60 minutes after they&apos;re sent. Request a fresh
          one and we&apos;ll email it right over.
        </p>
        {debugError && (
          <p className="text-xs font-mono text-destructive/90 bg-destructive/5 border border-destructive/20 rounded-md p-2 mb-3 break-all">
            {debugError}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button asChild className="min-h-[44px] w-full bg-primary hover:bg-primary-soft text-primary-foreground font-medium">
            <Link href="/forgot-password">Send a new link</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-[44px] w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
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
          Choose a new password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground leading-[1.4]">
          Pick something you&apos;ll remember. You&apos;ll be signed in after
          this.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
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
          className="mt-2 min-h-[44px] bg-primary hover:bg-primary-soft text-primary-foreground font-medium"
        >
          {pending ? "Saving..." : "Save and continue"}
        </Button>
      </form>
    </div>
  );
}
