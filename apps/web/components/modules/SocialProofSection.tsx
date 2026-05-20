import { RevealOnScroll } from "./RevealOnScroll";

interface SocialProofSectionProps {
  quote: string;
  attribution: string;
  isPlaceholder?: boolean;
}

export function SocialProofSection({ quote, attribution, isPlaceholder }: SocialProofSectionProps) {
  return (
    <RevealOnScroll>
      <div className="mx-auto max-w-5xl px-6 py-24">
        <figure
          className="mx-auto max-w-2xl text-center"
          {...(isPlaceholder ? { "data-placeholder": "true" } : {})}
        >
          <blockquote className="font-display text-3xl italic leading-snug text-foreground">
            &ldquo;{quote}&rdquo;
          </blockquote>
          <figcaption className="mt-6 text-sm text-muted-foreground">
            — {attribution}
          </figcaption>
        </figure>
      </div>
    </RevealOnScroll>
  );
}
