"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { dictionaries, type Dictionary, type Locale } from "./dictionaries";

interface I18nValue {
  locale: Locale;
  t: Dictionary;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Seeds the client tree with the coach's locale + resolved dictionary. Mounted
 * high in the authenticated layout, where the coach record (and thus their
 * language) is already loaded server-side. Also keeps <html lang> in sync so
 * screen readers and the browser treat the page as the right language.
 */
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, t: dictionaries[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

/** Full typed dictionary for the active locale, e.g. `const t = useDictionary(); t.nav.drafts`. */
export function useDictionary(): Dictionary {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useDictionary must be used within <I18nProvider>");
  return ctx.t;
}

export function useLocale(): Locale {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useLocale must be used within <I18nProvider>");
  return ctx.locale;
}
