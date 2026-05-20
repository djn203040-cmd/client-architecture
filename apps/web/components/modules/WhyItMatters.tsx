import { RevealOnScroll } from "./RevealOnScroll";

interface WhyItMattersProps {
  heading: string;
  stat?: string;
  statLabel?: string;
  body: React.ReactNode;
}

export function WhyItMatters({ heading, stat, statLabel, body }: WhyItMattersProps) {
  return (
    <RevealOnScroll>
      <div className="mx-auto max-w-5xl px-6 py-24">
        <div className="rounded-2xl border border-border bg-secondary/40 p-8 backdrop-blur-md dark:bg-white/5 md:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl leading-snug text-foreground md:text-4xl">
                {heading}
              </h2>
              <div className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
                {body}
              </div>
            </div>
            {stat && (
              <div className="flex flex-col items-start gap-1 md:items-end md:text-right">
                <span className="font-display text-5xl font-light text-primary md:text-6xl">
                  {stat}
                </span>
                {statLabel && (
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    {statLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </RevealOnScroll>
  );
}
