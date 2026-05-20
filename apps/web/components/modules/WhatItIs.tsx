import { RevealOnScroll } from "./RevealOnScroll";

interface WhatItIsProps {
  heading: string;
  body: React.ReactNode;
}

export function WhatItIs({ heading, body }: WhatItIsProps) {
  return (
    <RevealOnScroll>
      <div className="mx-auto max-w-5xl px-6 py-24">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl leading-snug text-foreground md:text-4xl">
            {heading}
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            {body}
          </div>
        </div>
      </div>
    </RevealOnScroll>
  );
}
