import type { ReactNode } from "react";

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-6 py-12 md:py-16">
      <div className="max-w-[640px] mx-auto">{children}</div>
    </main>
  );
}
