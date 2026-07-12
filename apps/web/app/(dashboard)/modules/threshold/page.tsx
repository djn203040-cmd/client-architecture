import { HeroSection } from "@/components/modules/HeroSection";
import { WhatItIs } from "@/components/modules/WhatItIs";
import { HowItWorks } from "@/components/modules/HowItWorks";
import { WhyItMatters } from "@/components/modules/WhyItMatters";
import { SocialProofSection } from "@/components/modules/SocialProofSection";
import { CtaSection } from "@/components/modules/CtaSection";
import { getServerDictionary } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getServerDictionary();
  return { title: t.modules.threshold.metaTitle };
}

export default async function ThresholdPage() {
  const t = await getServerDictionary();
  const m = t.modules.threshold;
  const shared = t.modules.shared;
  const mailto = `mailto:djn203040@gmail.com?subject=${encodeURIComponent(m.mailSubject)}`;

  return (
    <main>
      <HeroSection
        eyebrow={m.eyebrow}
        title={m.title}
        tagline={m.tagline}
        primaryCta={{ label: shared.bookIntro, scrollTo: "#cta" }}
        secondaryCta={{
          label: shared.talkFirst,
          href: mailto,
        }}
      />

      <WhatItIs
        heading={m.whatItIs.heading}
        body={
          <>
            <p>{m.whatItIs.p1}</p>
            <p>{m.whatItIs.p2}</p>
            <p>{m.whatItIs.p3}</p>
          </>
        }
      />

      <HowItWorks
        heading={shared.howItWorksHeading}
        steps={[
          {
            n: 1,
            title: m.howItWorks.step1Title,
            body: m.howItWorks.step1Body,
          },
          {
            n: 2,
            title: m.howItWorks.step2Title,
            body: m.howItWorks.step2Body,
          },
          {
            n: 3,
            title: m.howItWorks.step3Title,
            body: m.howItWorks.step3Body,
          },
        ]}
      />

      <WhyItMatters
        heading={m.whyItMatters.heading}
        stat={m.whyItMatters.stat}
        statLabel={m.whyItMatters.statLabel}
        body={<p>{m.whyItMatters.body}</p>}
      />

      <SocialProofSection
        quote={m.socialProof.quote}
        attribution={m.socialProof.attribution}
        isPlaceholder
      />

      <CtaSection
        id="cta"
        headline={m.cta.headline}
        pickTimeLabel={shared.pickTime}
        calLink="daniel/threshold-intro"
        calNamespace="threshold"
        secondaryMailto={mailto}
        secondaryLabel={shared.talkFirst}
      />
    </main>
  );
}
