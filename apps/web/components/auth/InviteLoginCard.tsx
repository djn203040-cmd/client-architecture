"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeSlash } from "@phosphor-icons/react";
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
  const [showPassword, setShowPassword] = useState(false);
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-r-md"
            >
              {showPassword ? (
                <EyeSlash weight="regular" className="size-4" />
              ) : (
                <Eye weight="regular" className="size-4" />
              )}
            </button>
          </div>
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
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
