import { NextResponse } from "next/server";
import { verifyReviewToken } from "@/lib/review-token";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const payload = verifyReviewToken(token);
  if (!payload) {
    return NextResponse.redirect(
      new URL("/r/invalid", process.env.NEXT_PUBLIC_APP_URL!),
    );
  }
  return NextResponse.redirect(
    new URL(
      `/review/${encodeURIComponent(token)}`,
      process.env.NEXT_PUBLIC_APP_URL!,
    ),
    { status: 302 },
  );
}
