import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach } = await supabase.from("coaches").select("*").eq("id", user.id).maybeSingle();
  if (!coach) redirect("/login");

  return (
    <main className="min-h-[100dvh] bg-background">
      <div className="max-w-[1400px] mx-auto p-6 lg:p-8">
        {/* AppShell + SidebarNav added in Plan 06 */}
        {children}
      </div>
    </main>
  );
}
