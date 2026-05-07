import Link from "next/link";

export default function LeadNotFound() {
  return (
    <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-16 text-center">
      <h2 className="text-xl font-semibold mb-2">Lead not found</h2>
      <p className="text-muted-foreground mb-6">
        This lead doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link href="/leads" className="text-accent hover:underline">
        Back to leads
      </Link>
    </div>
  );
}
