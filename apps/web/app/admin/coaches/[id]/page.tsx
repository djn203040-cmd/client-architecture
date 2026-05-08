import { fetchCoachDetail } from "@/app/admin/admin-data";
import { notFound } from "next/navigation";
import { CoachDetailDrawer } from "@/components/admin/CoachDetailDrawer";

export default async function CoachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await fetchCoachDetail(id);
  if (!detail) notFound();
  return <CoachDetailDrawer detail={detail} />;
}
