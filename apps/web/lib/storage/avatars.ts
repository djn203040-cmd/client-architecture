import "server-only";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function resizeAndUploadAvatar(
  buffer: Buffer,
  coachId: string,
  supabaseAdmin: SupabaseClient,
): Promise<string> {
  const resized = await sharp(buffer)
    .resize(512, 512, { fit: "cover", position: "center" })
    .webp({ quality: 85 })
    .toBuffer();

  const path = `${coachId}/${Date.now()}.webp`;

  const { error } = await supabaseAdmin.storage
    .from("coach-avatars")
    .upload(path, resized, { contentType: "image/webp", upsert: false });

  if (error) throw new Error(`Avatar upload failed: ${error.message}`);

  return supabaseAdmin.storage.from("coach-avatars").getPublicUrl(path).data.publicUrl;
}

export async function deleteAvatar(path: string, supabaseAdmin: SupabaseClient): Promise<void> {
  await supabaseAdmin.storage.from("coach-avatars").remove([path]);
}
