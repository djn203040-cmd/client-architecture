-- Taste-phase feedback: coaches report good/bad observations from a floating
-- widget in the dashboard. Coach-scoped RLS; Daniel reads via service role
-- (admin surface) and gets an email per submission from the API route.

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('good', 'bad')),
  note TEXT NOT NULL DEFAULT '',
  page_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_coach_created
  ON feedback (coach_id, created_at DESC);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback FORCE ROW LEVEL SECURITY;

CREATE POLICY "feedback_coach_insert"
  ON feedback FOR INSERT WITH CHECK (coach_id = auth.uid());

CREATE POLICY "feedback_coach_select"
  ON feedback FOR SELECT USING (coach_id = auth.uid());

GRANT SELECT, INSERT ON public.feedback TO authenticated;
