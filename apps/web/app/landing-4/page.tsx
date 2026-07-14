import type { Metadata } from "next";
import LandingHero from "./LandingHero";

export const metadata: Metadata = {
  title: "The Client Architecture",
  description: "AI follow-up system for coaches.",
};

export default function LandingPageVariant() {
  return (
    <main className="l4-root">
      <LandingHero />
    </main>
  );
}
