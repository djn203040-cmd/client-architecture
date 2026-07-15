/**
 * Stable `data-tour` anchor keys shared between the product tour engine and the
 * real UI elements it spotlights. Centralised so a rename can't silently break a
 * step (the tour targets `[data-tour="<key>"]`).
 */
export const TOUR_ANCHOR = {
  sidebar: "sidebar",
  navDashboard: "nav-dashboard",
  navLeads: "nav-leads",
  navDrafts: "nav-drafts",
  navCalls: "nav-calls",
  navSettings: "nav-settings",
  dashCards: "dash-cards",
  leadsTable: "leads-table",
  leadDescription: "lead-description",
  generateDraft: "generate-draft",
  leadDrafts: "lead-drafts",
  sequencePanel: "sequence-panel",
  leadTabs: "lead-tabs",
  draftsQueue: "drafts-queue",
  callsHeader: "calls-header",
  settingsNav: "settings-nav",
  settingsNotifications: "settings-notifications",
  settingsAutonomous: "settings-autonomous",
  settingsVoice: "settings-voice",
  settingsVoiceRefine: "settings-voice-refine",
  settingsSales: "settings-sales",
  settingsCalendar: "settings-calendar",
  settingsIntegrations: "settings-integrations",
  feedbackButton: "feedback-button",
} as const;

export type TourAnchor = (typeof TOUR_ANCHOR)[keyof typeof TOUR_ANCHOR];

/** Maps a sidebar nav href to its tour anchor so SidebarNav can tag each link. */
export const NAV_ANCHOR_BY_HREF: Record<string, TourAnchor> = {
  "/dashboard": TOUR_ANCHOR.navDashboard,
  "/leads": TOUR_ANCHOR.navLeads,
  "/drafts": TOUR_ANCHOR.navDrafts,
  "/calls": TOUR_ANCHOR.navCalls,
  "/settings": TOUR_ANCHOR.navSettings,
};
