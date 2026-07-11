import { HeroSection } from "@/components/modules/HeroSection";
import { WhatItIs } from "@/components/modules/WhatItIs";
import { HowItWorks } from "@/components/modules/HowItWorks";
import { WhyItMatters } from "@/components/modules/WhyItMatters";
import { SocialProofSection } from "@/components/modules/SocialProofSection";
import { CtaSection } from "@/components/modules/CtaSection";

export const metadata = {
  title: "The Continuation, The Client Architecture",
};

export default function ContinuationPage() {
  return (
    <main>
      <HeroSection
        eyebrow="Module 3"
        title="The Continuation"
        tagline="thirty days before they leave, we remind them why they stayed."
        primaryCta={{ label: "Book your intro call", scrollTo: "#cta" }}
        secondaryCta={{
          label: "Talk to Daniel first →",
          href: "mailto:djn203040@gmail.com?subject=The Continuation",
        }}
      />

      <WhatItIs
        heading="The renewal window no one is watching"
        body={
          <>
            <p>
              Thirty days before a coaching engagement ends, most clients quietly begin
              disengaging, not because the work wasn&apos;t valuable, but because no one helped
              them articulate its value back to themselves.
            </p>
            <p>
              The Continuation monitors that window. Drawing on everything we know about your
              client, their goals, their language, their breakthrough moments, we surface the
              right message at the right time, written in your voice.
            </p>
            <p>
              Your client renews before they consciously consider not to.
            </p>
          </>
        }
      />

      <HowItWorks
        steps={[
          {
            n: 1,
            title: "Day −30",
            body: "The system detects the approaching end of engagement and begins assembling the re-enrollment sequence from your client&apos;s history.",
          },
          {
            n: 2,
            title: "We surface the reason they stayed",
            body: "From prior call transcripts and engagement signals, we identify the transformation your client most values, and reflect it back to them.",
          },
          {
            n: 3,
            title: "They renew",
            body: "Before the doubt window even opens, your client has already reconnected with why this work matters. The conversation about continuing is easy.",
          },
        ]}
      />

      <WhyItMatters
        heading="The compounding cost of silent endings"
        stat="3×"
        statLabel="easier to retain than to re-acquire"
        body={
          <p>
            Acquiring a new coaching client costs three times what it costs to retain an existing
            one, yet most coaches invest all their energy in the front end of the relationship and
            almost none in the back end. The Continuation rebalances that equation: it protects
            your revenue, deepens your impact, and turns endings into beginnings.
          </p>
        }
      />

      <SocialProofSection
        quote="A client renewed who I was certain was finished. I hadn&apos;t sent anything, the system had. That was the moment I understood what this is."
        attribution="Early access coach, name to be confirmed before launch"
        isPlaceholder
      />

      <CtaSection
        id="cta"
        headline="Book your intro call"
        calLink="daniel/continuation-intro"
        calNamespace="continuation"
        secondaryMailto="mailto:djn203040@gmail.com?subject=The Continuation"
        secondaryLabel="Talk to Daniel first →"
      />
    </main>
  );
}
