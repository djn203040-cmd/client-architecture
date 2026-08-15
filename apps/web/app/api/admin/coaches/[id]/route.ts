import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { fetchCoachDetail } from "@/app/admin/admin-data";
import { deleteCoach } from "@/lib/auth/delete-coach";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const detail = await fetchCoachDetail(id);

  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

const DeleteBodySchema = z.object({ confirm_email: z.string().email() });

// Hard delete. Body must echo the coach's email so a stray click can't do it.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid coach id" }, { status: 400 });
  }
  if (id === user.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = DeleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Type the coach's email to confirm." }, { status: 400 });
  }

  const detail = await fetchCoachDetail(id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (detail.coach.email.toLowerCase() !== parsed.data.confirm_email.trim().toLowerCase()) {
    return NextResponse.json({ error: "Email doesn't match this coach." }, { status: 400 });
  }

  try {
    const result = await deleteCoach(id);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
