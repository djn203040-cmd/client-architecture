import { Button } from "@/components/ui/button";

interface CtaConfig {
  label: string;
  href?: string;
  scrollTo?: string;
}

interface HeroSectionProps {
  eyebrow: string;
  title: string;
  tagline: string;
  primaryCta: CtaConfig;
  secondaryCta: CtaConfig;
}

export function HeroSection({ eyebrow, title, tagline, primaryCta, secondaryCta }: HeroSectionProps) {
  const primaryHref = primaryCta.scrollTo ?? primaryCta.href ?? "#";

  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-7xl">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl">
            {tagline}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="rounded-full px-8">
              <a href={primaryHref}>{primaryCta.label}</a>
            </Button>
            <a
              href={secondaryCta.href}
              className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {secondaryCta.label}
            </a>
          </div>
        </div>
      </div>

      {/* Warm ambient glow — editorial art direction */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[120px]"
      />
    </section>
  );
}
