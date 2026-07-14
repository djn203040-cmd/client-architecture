import { defineMessages } from "./util";

/** Drafts queue, draft detail, approve/adjust/hold flow, unmatched transcripts. */
export const drafts = defineMessages({
  en: {
    // /drafts page shell
    page: {
      title: "Drafts",
    },
    // DraftQueueScaffold — tabs + pending empty state
    queue: {
      tablistLabel: "Draft queue sections",
      tabPending: "Pending",
      tabHeld: "Held",
      tabUnmatched: "Unmatched",
      emptyTitle: "No drafts waiting",
      emptyBody:
        "Scheduled drafts appear here 24 hours before they send, and any draft you generate from a lead's profile lands here too. You'll be notified when the first one is ready.",
      waiting: (count: number) =>
        `${count} draft${count === 1 ? "" : "s"} waiting`,
    },
    // CelebrationEmptyState — cleared queue
    emptyState: {
      title: "You're all caught up.",
      queueClear: "Your queue is clear",
      responded: (count: number) =>
        `lead${count === 1 ? "" : "s"} responded this week`,
      sent: (count: number) =>
        `draft${count === 1 ? "" : "s"} sent this week`,
      backToDashboard: "Back to dashboard",
    },
    // DraftCard
    card: {
      unknownLead: "Unknown lead",
      messageOf: (index: number, total: number | string) =>
        `Message ${index} of ${total}`,
      adhoc: "Ad-hoc draft",
      lowConfidence: "Voice model needs more examples",
      subject: (subject: string) => `Subject: ${subject}`,
      ariaLabel: (name: string, index: number, total: number | string) =>
        `Draft for ${name}, message ${index} of ${total}`,
      ariaLabelAdhoc: (name: string) => `Ad-hoc draft for ${name}`,
      regenerate: "Regenerate draft",
      regenerating: "Generating new draft...",
      regenerateAria: "Regenerate draft",
      editAria: "Edit draft",
      approve: "Approve",
      skip: "Skip",
      hold: "Hold",
      approvedToast: "Approved",
      heldToast: "Held",
      approveFailed: (reason: string) => `Couldn't approve, ${reason}.`,
      holdFailed: (reason: string) => `Couldn't hold, ${reason}.`,
      actionFailed: "This action didn't go through. Refresh and try again.",
      regenerateFailed: "Regeneration failed. Try again.",
      regeneratingToast: "Regenerating draft...",
    },
    // InlineDraftEditor
    editor: {
      unknownLead: "Unknown lead",
      editing: "Editing draft",
      subject: (subject: string) => `Subject: ${subject}`,
      bodyAria: "Draft body",
      saveAndApprove: "Save and approve",
      cancel: "Cancel",
    },
    // HeldTab
    heldTab: {
      empty: "Nothing on hold.",
    },
    // HeldDraftActions
    heldActions: {
      approveFailed: (reason: string) => `Couldn't approve. ${reason}.`,
      sentAt: (time: string) => `Approved. Sent at ${time}.`,
      cancelFailed: "Couldn't cancel. Try again.",
      cancelledToast: "Draft cancelled.",
      saveFailed: "Save failed. Try again.",
      savedToast: "Draft saved.",
      confirmCancel: "Cancel this draft?",
      keepOnHold: "Keep on hold",
      yesCancel: "Yes, cancel",
      reapprove: "Re-approve",
      edit: "Edit",
      cancel: "Cancel",
    },
    // DraftDeleteButton
    deleteButton: {
      deleteFailed: "Couldn't delete this draft. Try again.",
      deletedToast: "Draft deleted.",
      confirm: "Delete this draft permanently?",
      keep: "Keep",
      delete: "Delete",
      ariaLabel: "Delete draft permanently",
    },
    // UnmatchedTranscriptQueue
    unmatchedTranscripts: {
      empty: "All transcripts matched.",
      unknownDate: "Unknown date",
      minutes: (min: number) => `${min} min`,
      looksLike: (name: string) => `Looks like ${name}?`,
      yesAssign: "Yes, assign",
      searchLeads: "Search leads...",
      searchPlaceholder: "Search by name or email...",
      noLeadsFound: "No leads found.",
      assignToLead: "Assign to lead",
      assignedToast: (name: string) => `Assigned to ${name}. Draft generating...`,
      assignFailed: "Couldn't assign the transcript. Try again.",
    },
  },
  da: {
    page: {
      title: "Udkast",
    },
    queue: {
      tablistLabel: "Sektioner i udkast-køen",
      tabPending: "Afventer",
      tabHeld: "På hold",
      tabUnmatched: "Uden match",
      emptyTitle: "Ingen udkast venter",
      emptyBody:
        "Planlagte udkast dukker op her 24 timer før, de bliver sendt — og udkast, du selv laver fra en leads profil, lander her også. Du får besked, når det første er klar.",
      waiting: (count: number) =>
        `${count} udkast venter`,
    },
    emptyState: {
      title: "Du er helt ajour.",
      queueClear: "Din kø er tom",
      responded: (count: number) =>
        `${count === 1 ? "lead har" : "leads har"} svaret i denne uge`,
      sent: (_count: number) => "udkast sendt i denne uge",
      backToDashboard: "Tilbage til overblik",
    },
    card: {
      unknownLead: "Ukendt lead",
      messageOf: (index: number, total: number | string) =>
        `Besked ${index} af ${total}`,
      adhoc: "Manuelt udkast",
      lowConfidence: "Stemmemodellen mangler flere eksempler",
      subject: (subject: string) => `Emne: ${subject}`,
      ariaLabel: (name: string, index: number, total: number | string) =>
        `Udkast til ${name}, besked ${index} af ${total}`,
      ariaLabelAdhoc: (name: string) => `Manuelt udkast til ${name}`,
      regenerate: "Lav nyt udkast",
      regenerating: "Laver nyt udkast…",
      regenerateAria: "Lav nyt udkast",
      editAria: "Redigér udkast",
      approve: "Godkend",
      skip: "Spring over",
      hold: "Sæt på hold",
      approvedToast: "Godkendt",
      heldToast: "På hold",
      approveFailed: (reason: string) => `Vi kunne ikke godkende, ${reason}.`,
      holdFailed: (reason: string) => `Vi kunne ikke sætte på hold, ${reason}.`,
      actionFailed: "Handlingen gik ikke igennem. Genindlæs, og prøv igen.",
      regenerateFailed: "Vi kunne ikke lave et nyt udkast. Prøv igen.",
      regeneratingToast: "Laver nyt udkast…",
    },
    editor: {
      unknownLead: "Ukendt lead",
      editing: "Redigerer udkast",
      subject: (subject: string) => `Emne: ${subject}`,
      bodyAria: "Udkastets tekst",
      saveAndApprove: "Gem og godkend",
      cancel: "Annullér",
    },
    heldTab: {
      empty: "Intet på hold.",
    },
    heldActions: {
      approveFailed: (reason: string) => `Vi kunne ikke godkende. ${reason}.`,
      sentAt: (time: string) => `Godkendt. Sendt kl. ${time}.`,
      cancelFailed: "Vi kunne ikke annullere. Prøv igen.",
      cancelledToast: "Udkastet er annulleret.",
      saveFailed: "Vi kunne ikke gemme. Prøv igen.",
      savedToast: "Udkastet er gemt.",
      confirmCancel: "Vil du annullere udkastet?",
      keepOnHold: "Behold på hold",
      yesCancel: "Ja, annullér",
      reapprove: "Godkend igen",
      edit: "Redigér",
      cancel: "Annullér",
    },
    deleteButton: {
      deleteFailed: "Vi kunne ikke slette udkastet. Prøv igen.",
      deletedToast: "Udkastet er slettet.",
      confirm: "Vil du slette udkastet permanent?",
      keep: "Behold",
      delete: "Slet",
      ariaLabel: "Slet udkast permanent",
    },
    unmatchedTranscripts: {
      empty: "Alle udskrifter er matchet.",
      unknownDate: "Ukendt dato",
      minutes: (min: number) => `${min} min`,
      looksLike: (name: string) => `Ligner det ${name}?`,
      yesAssign: "Ja, tildel",
      searchLeads: "Søg blandt leads…",
      searchPlaceholder: "Søg på navn eller e-mail…",
      noLeadsFound: "Ingen leads fundet.",
      assignToLead: "Tildel til lead",
      assignedToast: (name: string) => `Tildelt til ${name}. Udkastet laves nu…`,
      assignFailed: "Vi kunne ikke tildele udskriften. Prøv igen.",
    },
  },
});
