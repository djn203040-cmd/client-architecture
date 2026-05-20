import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { resizeAndUploadAvatar, deleteAvatar } from "@/lib/storage/avatars";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5_242_880;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  // Reject oversized uploads before reading the body (T-05-03-02)
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const newUrl = await resizeAndUploadAvatar(buffer, user.id, adminClient).catch((err) =>
    NextResponse.json({ error: String(err) }, { status: 500 }),
  );
  if (newUrl instanceof NextResponse) return newUrl;

  // Delete previous avatar if present
  const { data: coach } = await supabase
    .from("coaches")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  if (coach?.avatar_url) {
    const url = new URL(coach.avatar_url);
    const pathParts = url.pathname.split("/coach-avatars/");
    if (pathParts[1]) {
      await deleteAvatar(pathParts[1], adminClient).catch(() => null);
    }
  }

  await supabase.from("coaches").update({ avatar_url: newUrl }).eq("id", user.id);

  return NextResponse.json({ url: newUrl });
}
