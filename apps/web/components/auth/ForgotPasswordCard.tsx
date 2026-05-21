"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ForgotPasswordCardProps {
  ok?: boolean;
  error?: string;
  formAction: (formData: FormData) => void;
  pending?: boolean;
}

export function ForgotPasswordCard({
  ok,
  error,
  formAction,
  pending,
}: ForgotPasswordCardProps) {
  if (ok) {
    return (
      <div
        className={cn(
          "rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5",
          "border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-6",
        )}
      >
        <h1 className="text-[28px] font-semibold leading-[1.2] text-foreground mb-3">
          Check your inbox
        </h1>
        <p className="text-sm text-muted-foreground leading-[1.5] mb-6">
          If an account exists for that email, we just sent a link to reset your
          password. The link expires in 60 minutes.
        </p>
        <Button asChild variant="outline" className="min-h-[44px] w-full">
          <Link href="/login">Back to sign in</Link>
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
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground leading-[1.4]">
          Enter the email tied to your account and we&apos;ll send you a reset
          link.
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
          {pending ? "Sending..." : "Send reset link"}
        </Button>

        <div className="mt-1 text-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
