import { defineMessages } from "./util";

/** The language picker — onboarding first step and the Settings switcher. */
export const language = defineMessages({
  en: {
    label: "Language",
    danish: "Danish",
    english: "English",
    settingHint:
      "This sets your whole dashboard and the language the AI writes your drafts in.",
    switcherSaved: "Language updated.",
    switcherError: "Couldn't change the language. Try again.",
  },
  da: {
    label: "Sprog",
    danish: "Dansk",
    english: "Engelsk",
    settingHint:
      "Det styrer hele dit dashboard og det sprog, AI'en skriver dine udkast på.",
    switcherSaved: "Sproget er skiftet.",
    switcherError: "Vi kunne ikke skifte sprog. Prøv igen.",
  },
});
