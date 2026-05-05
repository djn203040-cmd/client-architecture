// SCAFFOLD ONLY — implementation Phase 2+
// Webhook verification endpoint for Meta app review (INFRA-010)
// Uses Instagram Graph API (NOT Basic Display API — EOL December 4, 2024)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(_request: Request) {
  // Scaffold only — return 200 to satisfy Meta webhook ping
  return new Response("OK", { status: 200 });
}
