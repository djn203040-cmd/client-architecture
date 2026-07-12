import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { coerceLanguage } from "@client/shared/validators";
import { getDictionary, type Dictionary, type Locale } from "./dictionaries";

/**
 * The authenticated coach's locale, resolved server-side. `cache()` dedupes it
 * per request, so calling this from every server component on a page costs a
 * single query no matter how many times it runs. Falls back to English when
 * there's no session (e.g. pre-auth routes).
 */
export const getServerLocale = cache(async (): Promise<Locale> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "en";
  const { data } = await supabase
    .from("coaches")
    .select("language")
    .eq("id", user.id)
    .maybeSingle();
  return coerceLanguage(data?.language);
});

/** The full dictionary for the current request's locale. Use in server components. */
export async function getServerDictionary(): Promise<Dictionary> {
  return getDictionary(await getServerLocale());
}
