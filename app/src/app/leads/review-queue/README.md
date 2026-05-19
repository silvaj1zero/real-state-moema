# /leads/review-queue — Manual Review Queue (Story 7.8)

Mobile-first console where the consultora reviews `scraped_listings`
classified with `classification_confidence < 0.70` BEFORE they reach the V1
funnel. Confirms or rejects automatic classification, reduces false positives,
and (Wave B) feeds training labels back into the ML loop.

## Files

| File | Role |
|---|---|
| `page.tsx` | RSC route, session-protected. Renders queue + filters + pagination. |
| `actions.ts` | Server Actions: `submitReviewDecision`, `submitBulkReviewDecision`, `revealPhone`. Zod-validated. |
| `__tests__/actions.test.ts` | Schemas + action contract tests. |
| `__tests__/ReviewQueueCard.test.tsx` | RTL tests for card UI + action flows. |
| `../../components/ReviewQueueCard.tsx` | Client card with FISBO / Broker / Discard buttons + LGPD reveal modal. |
| `../../components/ReviewQueueFilters.tsx` | Client filters: threshold slider, portal chips, bairro text. |

## Migration

`supabase/migrations/20260514000009_016_epic7_review_status.sql` adds:

- `review_status TEXT` (CHECK enum: `confirmed_fisbo`, `confirmed_other`, `rejected_is_broker`, `rejected_is_construtora`, `discarded`, `skipped`)
- `review_decided_by UUID` (FK `auth.users(id)` ON DELETE SET NULL)
- `review_decided_at TIMESTAMPTZ`
- `review_notes TEXT`
- Partial index `idx_scraped_listings_review_pending` on `(created_at DESC)` WHERE `review_status IS NULL AND classification_confidence < 0.70`.

## Query semantics

The queue lists rows where:

```sql
WHERE classification_confidence < REVIEW_CONFIDENCE_THRESHOLD  -- env, default 0.70
  AND review_status IS NULL
ORDER BY created_at DESC
```

Optional filters (URL search params):

| Param | Type | Default |
|---|---|---|
| `page` | int | `1` |
| `threshold` | 0-1 | `REVIEW_CONFIDENCE_THRESHOLD` or `0.70` |
| `portal` | repeating `mercadolivre`/`zap`/`olx`/`vivareal` | none |
| `bairro` | string (ILIKE) | none |

## LGPD

`revealPhone` writes to `lgpd_audit_log` via `logLGPDAccess(..., { action: 'reveal_phone', legalBasis: 'legitimate_interest', evidence: { listing_id, source: 'review-queue', consent_acknowledged: true } })`. The modal requires an explicit consent checkbox before the server action is invoked (Art. 7º IX LGPD).

## Server Actions vs API Routes — why

Server Actions chosen because:
1. The page is a Server Component already — no need for a separate fetch round-trip from the client.
2. CSRF protection is automatic for Next.js Server Actions.
3. `revalidatePath('/leads/review-queue')` keeps the queue in sync without manual cache invalidation logic.
4. RLS is enforced naturally: the action runs under the user's auth cookie.

## Mobile-first breakpoints

- Cards stack vertically by default; `sm:` switches to flex-row for the photo+content layout.
- Action buttons grid: `grid-cols-1 sm:grid-cols-3`.
- Modal docks to bottom on mobile (`items-end`), centers on desktop (`sm:items-center`).
- Touch targets: all buttons have `min-h-11` (~44px) per WCAG AA + NFR-001.

## Empty state (AC7 brief / AC9 story)

`data-testid="empty-state"`. Rendered when count = 0. Encouraging copy: "Pipeline está calibrado!".

## Out of scope (kept for 7.9/Wave B)

- Realtime subscription (AC8 in story spec) — Supabase Realtime channel can be added later; current implementation polls on revalidate.
- Bulk action UI (AC7 in story spec) — server action exists (`submitBulkReviewDecision`), but UI controls deferred to 7.9 workshop output.
- Swipe gestures — Wave B per story Technical Notes.
- Auto-creating lead in V1 funnel on confirmed_fisbo — keeps the column updated; lead-creation hook handled by Story 7.4 captacao pipeline.
- ML training_label write — Wave B Story 7.13.

## Acceptance criteria coverage

| AC | File / mechanism |
|---|---|
| AC1 route + session-protected | `page.tsx` (`createServerSupabaseClient` + `redirect('/login')`) |
| AC2 queue query + pagination | `page.tsx` (`.lt` + `.is null` + `.range`) |
| AC3 card display | `ReviewQueueCard.tsx` |
| AC4 3 actions | `submitReviewDecision` + 3 buttons |
| AC5 migration | `supabase/migrations/...016_epic7_review_status.sql` |
| AC6 filters | `ReviewQueueFilters.tsx` |
| AC7 bulk action | `submitBulkReviewDecision` (UI deferred) |
| AC8 counter | `data-testid="queue-counter"` (`aria-live="polite"`; realtime deferred) |
| AC9 empty state | `data-testid="empty-state"` |
| AC10 LGPD audit on reveal | `revealPhone` → `logLGPDAccess` |
