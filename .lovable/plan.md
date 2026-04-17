

# Multi-Tenant Invoice Processing — v2 Upgrade (Revised)

## 1. Database changes (migration)

**New tables:**
- `organizations` — `id`, `name`, `slug` (unique), `created_at`
- `organization_members` — `id`, `org_id`, `user_id`, `role` (app_role: owner|admin|member), unique(org_id, user_id)
- `invoice_audit_log` — `id`, `org_id`, `invoice_number`, `vendor_name`, `event`, `status`, `total_amount`, `currency`, `processed_at`, `source`, `created_at`

**Enum:** `app_role` ('owner','admin','member')

**`invoices` table:**
- Wipe all existing rows
- Add `org_id uuid not null`
- Allowed status values: `processed`, `flagged`, `failed` (default `processed`)

**Security definer functions:**
- `is_org_member(_user_id, _org_id) returns boolean`
- `get_user_org_ids(_user_id) returns setof uuid`

**RLS policies (rewritten):**
- `invoices`: all ops gated by `is_org_member(auth.uid(), org_id)`
- `invoice_audit_log`: SELECT only via `is_org_member` (writes via service role from n8n)
- `organizations`: SELECT if member; INSERT for authenticated
- `organization_members`: SELECT own rows; INSERT only by org owner/admin

**Signup trigger:** Extend `handle_new_user()` to also create an `organizations` row + `organization_members` row (role `owner`) for each new signup.

## 2. Frontend changes

**New `useCurrentOrg()` hook** — exposes `currentOrg`, `orgs`, `switchOrg()`. Persists selection in localStorage.

**Routing:** add `/audit-log` route in `src/App.tsx`.

**`AppHeader.tsx`** — extracted from `Index.tsx`. Adds nav: Dashboard | Audit Log, plus current org name / switcher.

**`UploadPanel.tsx` (REVISED — n8n is sole writer):**
- **Remove** the `supabase.from("invoices").insert(...)` call entirely
- **Remove** the follow-up status update calls (`Processed` / `Failed`)
- POST FormData to n8n webhook with `org_id` appended: `formData.append("org_id", currentOrg.id)`
- After upload completes, just clear staging and call `onUploadComplete()` so the table refetches and shows whatever n8n inserted
- Local UI state (uploading spinner, errors) stays the same

**`InvoiceTable.tsx`:**
- Filter by `org_id` (not `user_id`)
- Status filter: All | Processed | Flagged | Failed
- Status badge colors: processed=green, flagged=yellow, failed=red
- Yellow "Duplicate" badge when `status === 'flagged'`

**`AuditLog.tsx` (new page):**
- Reads `invoice_audit_log` filtered by `currentOrg.id`, sorted by `processed_at desc`
- Columns: Processed At | Invoice # | Vendor | Event | Status
- Event badge colors: PROCESSED=green, DUPLICATE_DETECTED=yellow, EXTRACTION_FAILED=red, others=gray

## 3. Edge function

`delete-invoice-webhook` — forward `org_id` alongside `invoice_number` so n8n can scope the lookup per tenant.

## 4. Files

**Migration (1):** enum + tables + functions + policies + trigger + wipe/alter invoices.

**New:**
- `src/hooks/useCurrentOrg.ts`
- `src/components/AppHeader.tsx`
- `src/pages/AuditLog.tsx`

**Modified:**
- `src/App.tsx`
- `src/pages/Index.tsx`
- `src/components/UploadPanel.tsx` (remove inserts, add org_id to payload)
- `src/components/InvoiceTable.tsx`
- `supabase/functions/delete-invoice-webhook/index.ts`

## 5. n8n responsibility (reminder)

n8n must use the **service role key** to insert rows into `invoices` and `invoice_audit_log`, and to set status (`processed`/`flagged`/`failed`). The frontend never writes invoice rows anymore.

