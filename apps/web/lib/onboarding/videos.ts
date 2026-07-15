/**
 * Onboarding walkthrough videos, one slot per place a "Watch how it's done"
 * link can appear. Paste a URL (Loom/YouTube/whatever) into a slot and the
 * link shows up in the wizard; leave it null and nothing renders.
 *
 * Daniel: this is the only file to touch when a video is ready.
 */
export type OnboardingVideoKey =
  | "gmailConnect" // Gmail step: the OAuth flow incl. Google's unverified-app warning
  | "bookingLink" // Booking step: where to find your public booking link
  | "calendarConnect" // Calendar step: connecting Calendly
  | "calcomApiKey" // Calendar step: getting a Cal.com API key
  | "voiceImport" // Voice step: the one-click sent-emails import
  | "voiceMoreContext" // Voice step: exporting LinkedIn/Instagram/WhatsApp messages
  | "salesToolkit" // Sales step: filling in programs & offers
  | "notifications"; // Notifications step

export const ONBOARDING_VIDEOS: Record<OnboardingVideoKey, string | null> = {
  gmailConnect: null,
  bookingLink: null,
  calendarConnect: null,
  calcomApiKey: null,
  voiceImport: null,
  voiceMoreContext: null,
  salesToolkit: null,
  notifications: null,
};
