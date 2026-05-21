-- 06-PLAN.md §1.9 — orphaned-FK integrity check.
-- CI runs this against a fresh `supabase db reset` and fails if any row returns.

-- leads with non-existent coach_id
SELECT 'leads_orphaned_coach' AS check_name, COUNT(*) AS orphan_count
FROM leads l
LEFT JOIN coaches c ON l.coach_id = c.id
WHERE c.id IS NULL
HAVING COUNT(*) > 0

UNION ALL

-- drafts with non-existent coach_id
SELECT 'drafts_orphaned_coach', COUNT(*)
FROM drafts d
LEFT JOIN coaches c ON d.coach_id = c.id
WHERE c.id IS NULL
HAVING COUNT(*) > 0

UNION ALL

-- drafts with non-existent lead_id
SELECT 'drafts_orphaned_lead', COUNT(*)
FROM drafts d
LEFT JOIN leads l ON d.lead_id = l.id
WHERE l.id IS NULL
HAVING COUNT(*) > 0

UNION ALL

-- integrations with non-existent coach_id
SELECT 'integrations_orphaned_coach', COUNT(*)
FROM integrations i
LEFT JOIN coaches c ON i.coach_id = c.id
WHERE c.id IS NULL
HAVING COUNT(*) > 0

UNION ALL

-- lead_events with non-existent lead_id
SELECT 'lead_events_orphaned_lead', COUNT(*)
FROM lead_events le
LEFT JOIN leads l ON le.lead_id = l.id
WHERE l.id IS NULL
HAVING COUNT(*) > 0

UNION ALL

-- notification_preferences with non-existent coach_id
SELECT 'notif_prefs_orphaned_coach', COUNT(*)
FROM notification_preferences np
LEFT JOIN coaches c ON np.coach_id = c.id
WHERE c.id IS NULL
HAVING COUNT(*) > 0
;
