import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function InvalidTokenPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 md:py-16">
      <div className="max-w-[640px] mx-auto">
        <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-center space-y-4">
          <div className="flex justify-center text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 256 256"
              aria-hidden="true"
            >
              <rect width="256" height="256" fill="none" />
              <circle
                cx="128"
                cy="128"
                r="96"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="16"
              />
              <polyline
                points="128 72 128 128 176 128"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="16"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">This link isn&apos;t valid.</h1>
          <p className="text-sm text-muted-foreground max-w-[65ch] mx-auto">
            It may have been copied incorrectly. Open your dashboard for the
            latest drafts.
          </p>
          <Button asChild variant="ghost" className="min-h-[44px]">
            <Link href="/">Open dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
