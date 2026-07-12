import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { costUsd, type TokenUsage } from './pricing';

export type AiOperation =
  | 'draft_generate'
  | 'draft_review'
  | 'lead_description'
  | 'voice_analysis'
  | 'voice_refine';

// Lazily-constructed, untyped admin client. Untyped on purpose: the generated
// Database types don't include `ai_usage`, and typing this without them would
// force a full type regen, the loose client mirrors apps/web/lib/supabase/admin.ts.
let _client: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  // Absent in eval/CI contexts (e.g. promptfoo), metering just no-ops there.
  _client = url && key ? createClient(url, key) : null;
  return _client;
}

/**
 * Records one Anthropic call's token usage + computed cost against a coach.
 * Best-effort and fire-safe: mirrors traceGeneration, metering must never
 * break or slow generation, so every failure is swallowed. Awaited so the row
 * is flushed before a serverless function freezes.
 */
export async function recordUsage(params: {
  coachId: string;
  operation: AiOperation;
  model: string;
  usage: TokenUsage | null | undefined;
}): Promise<void> {
  try {
    const { coachId, operation, model, usage } = params;
    if (!usage) return;
    const client = getClient();
    if (!client) return;
    await client.from('ai_usage').insert({
      coach_id: coachId,
      operation,
      model,
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
      cache_read_tokens: usage.cache_read_input_tokens ?? 0,
      cache_write_tokens: usage.cache_creation_input_tokens ?? 0,
      cost_usd: costUsd(model, usage),
    });
  } catch {
    // Never let metering break generation.
  }
}
