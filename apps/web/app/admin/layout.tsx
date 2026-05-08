import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defense-in-depth: middleware already enforces role=admin for /admin.
  // Layout re-checks so any layout-bypassing access path cannot leak.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/login");

  return (
    <AdminShell userName={user.user_metadata?.name ?? user.email ?? "Admin"}>
      {children}
    </AdminShell>
  );
}
