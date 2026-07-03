import "server-only";
import type { WebClient } from "@slack/web-api";

const cache = new Map<string, string>();

/**
 * Resolve the DM channel id (D…) for a coach's Slack user id (U…).
 *
 * chat.update requires the channel that actually contains the message — passing
 * the user id (the shape chat.postMessage happily accepts) fails with
 * message_not_found, which is why dashboard-side button retirement never worked
 * (#77). conversations.open is idempotent for an existing DM and only needs the
 * im:write scope we already request.
 */
export async function resolveSlackDmChannel(
  slack: WebClient,
  slackUserId: string,
): Promise<string | null> {
  const cached = cache.get(slackUserId);
  if (cached) return cached;

  const res = await slack.conversations.open({ users: slackUserId });
  const channelId = res.channel?.id ?? null;
  if (channelId) cache.set(slackUserId, channelId);
  return channelId;
}
