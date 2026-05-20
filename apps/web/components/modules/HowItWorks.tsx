import { RevealOnScroll } from "./RevealOnScroll";

interface Step {
  n: number;
  title: string;
  body: string;
}

interface HowItWorksProps {
  heading?: string;
  steps: [Step, Step, Step];
}

export function HowItWorks({ heading = "How it works", steps }: HowItWorksProps) {
  return (
    <RevealOnScroll>
      <div className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="font-display mb-12 text-3xl leading-snug text-foreground md:text-4xl">
          {heading}
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.n} className="flex flex-col gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
                {step.n}
              </div>
              <h3 className="font-display text-xl leading-snug text-foreground">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </RevealOnScroll>
  );
}
