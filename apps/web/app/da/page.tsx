import type { Metadata } from "next";
import LandingPage from "../landing-4/LandingPage";
import { landingCopy } from "../landing-4/copy";
import { LANDING_LANGUAGE_ALTERNATES, SITE_URL_DA } from "@/lib/site-urls";

const copy = landingCopy.da;

// Served at theclientarchitecture.dk/ via a middleware rewrite (/ → /da on
// the .dk host). Canonical points at the .dk root so the /da path itself
// never competes with it in search.
export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDescription,
  alternates: {
    canonical: SITE_URL_DA,
    languages: LANDING_LANGUAGE_ALTERNATES,
  },
  openGraph: {
    title: copy.metaTitle,
    description: copy.metaDescription,
    url: SITE_URL_DA,
    siteName: "The Client Architecture",
    locale: "da_DK",
    type: "website",
  },
};

export default function DanishLandingPage() {
  return <LandingPage copy={copy} />;
}
