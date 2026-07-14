import { defineMessages } from "./util";

/** Floating taste-phase feedback widget (button + panel). */
export const feedback = defineMessages({
  en: {
    buttonLabel: "Give feedback",
    panelTitle: "Share your feedback",
    panelDescription:
      "Spotted something great or something broken? It goes straight to us.",
    fieldTitle: "Title",
    fieldTitlePlaceholder: "A short summary",
    fieldSentiment: "Good or bad?",
    sentimentGood: "Good — something I like",
    sentimentBad: "Bad — something's off",
    fieldNote: "Details",
    fieldNotePlaceholder:
      "Write or paste anything — error messages, ideas, what you expected to happen…",
    submit: "Send feedback",
    submitting: "Sending…",
    success: "Thanks! Your feedback has been sent.",
    error: "Couldn't send your feedback. Try again.",
    titleRequired: "Add a short title first",
  },
  da: {
    buttonLabel: "Giv feedback",
    panelTitle: "Del din feedback",
    panelDescription:
      "Har du set noget godt — eller noget, der driller? Det ryger direkte til os.",
    fieldTitle: "Titel",
    fieldTitlePlaceholder: "En kort opsummering",
    fieldSentiment: "Godt eller skidt?",
    sentimentGood: "Godt — noget jeg kan lide",
    sentimentBad: "Skidt — noget der driller",
    fieldNote: "Detaljer",
    fieldNotePlaceholder:
      "Skriv eller indsæt hvad som helst — fejlbeskeder, idéer, hvad du havde forventet…",
    submit: "Send feedback",
    submitting: "Sender…",
    success: "Tak! Din feedback er sendt.",
    error: "Din feedback kunne ikke sendes. Prøv igen.",
    titleRequired: "Tilføj først en kort titel",
  },
});
