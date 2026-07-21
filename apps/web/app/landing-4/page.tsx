import type { Metadata } from "next";
import LandingPage from "./LandingPage";
import { landingCopy } from "./copy";
import { LANDING_LANGUAGE_ALTERNATES, SITE_URL_EN } from "@/lib/site-urls";

const copy = landingCopy.en;

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDescription,
  alternates: {
    canonical: SITE_URL_EN,
    languages: LANDING_LANGUAGE_ALTERNATES,
  },
  openGraph: {
    title: copy.metaTitle,
    description: copy.metaDescription,
    url: SITE_URL_EN,
    siteName: "The Client Architecture",
    locale: "en_US",
    type: "website",
  },
};

export default function LandingPageVariant() {
  return <LandingPage copy={copy} />;
}
