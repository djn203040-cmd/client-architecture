// Per-model Anthropic pricing, USD per 1M tokens. Source: platform pricing.
// Kept here (not in the DB) so cost is computed at write time and a later price
// change never rewrites historical rows.
interface ModelPrice {
  input: number; // $ / 1M input tokens
  output: number; // $ / 1M output tokens
  cacheRead: number; // $ / 1M cached-read tokens (~0.1x input)
  cacheWrite: number; // $ / 1M cache-write tokens (~1.25x input, 5-min TTL)
}

const PRICES: Record<string, ModelPrice> = {
  'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

// Fallback keeps cost non-zero (and conservative) if a model id ever changes
// before this table is updated, better to over-report than silently log $0.
const FALLBACK: ModelPrice = { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 };

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/** USD cost of a single Anthropic response, from its usage block. */
export function costUsd(model: string, usage: TokenUsage): number {
  const p = PRICES[model] ?? FALLBACK;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cost =
    (usage.input_tokens * p.input +
      usage.output_tokens * p.output +
      cacheRead * p.cacheRead +
      cacheWrite * p.cacheWrite) /
    1_000_000;
  // Round to 6 dp (matches the numeric(12,6) column); avoids float noise.
  return Math.round(cost * 1_000_000) / 1_000_000;
}
