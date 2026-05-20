# Impeccable Audit — LeadStateBadge

**File:** `apps/web/components/leads/LeadStateBadge.tsx`
**Audited:** 2026-05-21
**Score:** 18/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None in this pass._

### YELLOW (deferred)
- No screen-reader-only text or `aria-label` — status is conveyed only by colour and visible label. For high-contrast / screen-reader users the visible text label is sufficient (the `LABEL` map provides clear text). However, adding `aria-label={LABEL[status]}` to the `<Badge>` would be best practice. **Reason:** Minor; text label already present. **Owner:** Backlog.

### GREEN
- Full `TLeadStatus` type coverage in both `TONE` and `LABEL` maps ✅
- Warm oklch colour scale ✅
- No `any` types ✅
- Under 200 lines (34) ✅
