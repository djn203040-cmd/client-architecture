import Link from "next/link";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function LeadNotFound() {
  const t = await getServerDictionary();
  return (
    <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-16 text-center">
      <h2 className="text-xl font-semibold mb-2">{t.leads.profile.notFoundTitle}</h2>
      <p className="text-muted-foreground mb-6">{t.leads.profile.notFoundBody}</p>
      <Link href="/leads" className="text-accent hover:underline">
        {t.leads.profile.backToLeads}
      </Link>
    </div>
  );
}
