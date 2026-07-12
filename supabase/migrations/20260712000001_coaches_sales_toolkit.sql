-- Adds the coaches.sales_toolkit JSONB column. Holds the coach's once-captured
-- "how you sell" toolkit that the AI draft engine injects into every generation
-- so it can handle objections the way this coach actually would (issue #39).
--
-- Shape (validated by SalesToolkitSchema in @client/shared/validators):
--   {
--     philosophy: string,                                   -- personal sales philosophy
--     downsells:  [{ name, when_to_offer }],                -- lighter offers to fall back to
--     bridges:    [{ name, when_to_offer }],                -- ways to bridge a stated objection
--     leverage_points: string                               -- what the coach learns on discovery
--   }
--
-- New column rather than overloading service_info: service_info is reserved for
-- the coaching OFFER (outcomes, pricing); the toolkit is about HOW the coach
-- sells. Kept separate so neither read has to disambiguate the other's keys.

ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS sales_toolkit JSONB NOT NULL DEFAULT '{}'::jsonb;
