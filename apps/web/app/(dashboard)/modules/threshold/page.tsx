import { HeroSection } from "@/components/modules/HeroSection";
import { WhatItIs } from "@/components/modules/WhatItIs";
import { HowItWorks } from "@/components/modules/HowItWorks";
import { WhyItMatters } from "@/components/modules/WhyItMatters";
import { SocialProofSection } from "@/components/modules/SocialProofSection";
import { CtaSection } from "@/components/modules/CtaSection";

export const metadata = {
  title: "The Threshold Experience — The Client Architecture",
};

export default function ThresholdPage() {
  return (
    <main>
      <HeroSection
        eyebrow="Module 2"
        title="The Threshold Experience"
        tagline="your client's first 48 hours, built from your sales call."
        primaryCta={{ label: "Book your intro call", scrollTo: "#cta" }}
        secondaryCta={{
          label: "Talk to Daniel first →",
          href: "mailto:djn203040@gmail.com?subject=The Threshold Experience",
        }}
      />

      <WhatItIs
        heading="The moment that determines everything"
        body={
          <>
            <p>
              Most coaches have a great sales call. Then their client goes quiet for 48 hours, and
              the doubt sets in. That silence is expensive — it&apos;s where momentum dies and
              refund requests are born.
            </p>
            <p>
              The Threshold Experience closes that gap. Using the transcript and notes from your
              sales call, we craft a sequence of highly personalised touchpoints — delivered in your
              voice — that welcome your client across the threshold and into the work.
            </p>
            <p>
              By the time they show up to session one, they&apos;re not just enrolled. They&apos;re
              activated.
            </p>
          </>
        }
      />

      <HowItWorks
        steps={[
          {
            n: 1,
            title: "Your call ends",
            body: "We ingest the transcript, surface the key commitments your client made, and identify the emotional tone they entered the relationship with.",
          },
          {
            n: 2,
            title: "We craft 48 hours of touchpoints",
            body: "Emails, follow-ups, and micro-moments — sequenced and written in your exact voice — arrive at precisely the right intervals.",
          },
          {
            n: 3,
            title: "Your client crosses the threshold",
            body: "Onboarded, oriented, and certain. They arrive to session one already aligned with the transformation they signed up for.",
          },
        ]}
      />

      <WhyItMatters
        heading="The cost of a cold first 48 hours"
        stat="68%"
        statLabel="of buyer&apos;s remorse surfaces in 48h"
        body={
          <p>
            The first two days after a coaching sale are the highest-risk window in the entire
            engagement. A client who feels unseen or unguided will quietly begin to second-guess
            their decision — and that doubt compounds. The Threshold Experience doesn&apos;t just
            prevent churn; it accelerates the transformation they paid for, making every subsequent
            session more effective.
          </p>
        }
      />

      <SocialProofSection
        quote="I used to dread the post-call silence. Now my clients feel held from the first hour. Session one is completely different."
        attribution="Early access coach — name to be confirmed before launch"
        isPlaceholder
      />

      <CtaSection
        id="cta"
        headline="Book your intro call"
        calLink="daniel/threshold-intro"
        calNamespace="threshold"
        secondaryMailto="mailto:djn203040@gmail.com?subject=The Threshold Experience"
        secondaryLabel="Talk to Daniel first →"
      />
    </main>
  );
}
