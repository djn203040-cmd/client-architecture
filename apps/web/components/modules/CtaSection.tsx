import { RevealOnScroll } from "./RevealOnScroll";
import { CalBookingEmbed } from "./CalBookingEmbed";

interface CtaSectionProps {
  id?: string;
  headline: string;
  pickTimeLabel: string;
  calLink: string;
  calNamespace: string;
  secondaryMailto: string;
  secondaryLabel: string;
}

export function CtaSection({
  id,
  headline,
  pickTimeLabel,
  calLink,
  calNamespace,
  secondaryMailto,
  secondaryLabel,
}: CtaSectionProps) {
  return (
    <RevealOnScroll id={id} className="scroll-mt-16">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-10 max-w-xl">
          <h2 className="font-display text-3xl leading-snug text-foreground md:text-4xl">
            {headline}
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            {pickTimeLabel}{" "}
            <a
              href={secondaryMailto}
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              {secondaryLabel}
            </a>
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <CalBookingEmbed calLink={calLink} namespace={calNamespace} />
        </div>
      </div>
    </RevealOnScroll>
  );
}
