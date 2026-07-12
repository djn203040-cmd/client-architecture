import { defineMessages } from "./util";

/** Calls page (call outcomes / history), the outcome cards, queue tabs and the
 * celebration empty state. */
export const calls = defineMessages({
  en: {
    page: {
      title: "How did the call go?",
      subtitle:
        "After every booked call, record the outcome in one tap. Converted leads stay fully monitored; only the auto-nurture stops.",
    },
    card: {
      question: (leadName: string) => `How did the call with ${leadName} go?`,
      completed: "Call completed",
      noShow: "No show",
      converted: "Converted 🎉",
      // Chip shown on resolved cards (readonly). Keyed by the DB enum value.
      resolvedLabel: {
        no_show: "No show",
        completed: "Call completed",
        converted: "Converted",
      } as Record<string, string>,
      toastConverted: "Converted 🎉",
      toastRecorded: (label: string) => `Recorded: ${label}`,
      toastAlreadyRecorded:
        "This call was already recorded. The card will update shortly.",
      toastCouldntRecord: (reason: string) => `Couldn't record, ${reason}.`,
      toastNetwork: "Network hiccup. Refresh and try again.",
    },
    queue: {
      tablistLabel: "Call queue sections",
      tabAwaiting: "Awaiting",
      tabUpcoming: "Upcoming",
      tabHistory: "History",
      awaitingCount: (count: number) =>
        `${count} call${count === 1 ? "" : "s"} awaiting an outcome`,
      leadFallback: "your lead",
    },
    emptyState: {
      awaitingHeadline: "You're all caught up.",
      otherHeadline: "Nothing here yet.",
      lineAwaiting: "Every call is accounted for",
      lineUpcoming: "No calls on the calendar yet",
      lineHistory: "Resolved calls will appear here",
      backToDashboard: "Back to dashboard",
    },
  },
  da: {
    page: {
      title: "Hvordan gik samtalen?",
      subtitle:
        "Efter hver booket samtale registrerer du udfaldet med ét tryk. Leads, der konverterer, bliver ved med at blive fulgt fuldt ud — kun den automatiske opfølgning stopper.",
    },
    card: {
      question: (leadName: string) => `Hvordan gik samtalen med ${leadName}?`,
      completed: "Gennemført samtale",
      noShow: "Udeblevet",
      converted: "Konverteret 🎉",
      // Vises på afsluttede kort (readonly). Nøgle = DB-enumværdien.
      resolvedLabel: {
        no_show: "Udeblevet",
        completed: "Gennemført samtale",
        converted: "Konverteret",
      } as Record<string, string>,
      toastConverted: "Konverteret 🎉",
      toastRecorded: (label: string) => `Registreret: ${label}`,
      toastAlreadyRecorded:
        "Denne samtale er allerede registreret. Kortet opdateres om et øjeblik.",
      toastCouldntRecord: (reason: string) =>
        `Kunne ikke registrere, ${reason}.`,
      toastNetwork: "Forbindelsen hakkede. Genindlæs og prøv igen.",
    },
    queue: {
      tablistLabel: "Sektioner i samtalekøen",
      tabAwaiting: "Afventer",
      tabUpcoming: "Kommende",
      tabHistory: "Historik",
      awaitingCount: (count: number) =>
        `${count} samtale${count === 1 ? "" : "r"} afventer et udfald`,
      leadFallback: "dit lead",
    },
    emptyState: {
      awaitingHeadline: "Du er helt ajour.",
      otherHeadline: "Ikke noget her endnu.",
      lineAwaiting: "Alle samtaler er registreret",
      lineUpcoming: "Ingen samtaler i kalenderen endnu",
      lineHistory: "Afsluttede samtaler dukker op her",
      backToDashboard: "Tilbage til overblik",
    },
  },
});
