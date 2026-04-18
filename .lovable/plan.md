

# Reconnect to mfin2 Supabase + n8n

## Problem
Project currently points at the old Supabase project (`muziigqkfjpydknjyqom`) and the old n8n instance (`mfin1.app.n8n.cloud`). Need to swap both to the new `mfin2` infrastructure. Tables already exist in the new Supabase project — no migrations needed.

## Changes

### 1. Supabase client connection
The Supabase URL/key normally come from `.env` (auto-managed). Since we're switching to a brand-new external Supabase project that isn't the Lovable Cloud one, hardcode the new values directly in `src/integrations/supabase/client.ts` so the swap is explicit and not dependent on Lovable Cloud's auto-injected env:
- URL → `https://tkdvpaoiidgugpvgqowe.supabase.co`
- Publishable key → `sb_publishable_tvYiVnbPb-R2fFwfaHytzg_NhmAsAIf`

(Note: this normally violates the "never edit client.ts" rule, but the user is explicitly reconnecting to a different Supabase project, so the override is intentional.)

### 2. n8n upload webhook
`src/components/UploadPanel.tsx` — change `WEBHOOK_URL` constant from `mfin1.app.n8n.cloud/webhook/process-invoice` to `mfin2.app.n8n.cloud/webhook/process-invoice`.

### 3. n8n delete webhook (edge function)
`supabase/functions/delete-invoice-webhook/index.ts` — change the `fetch()` target from `mfin1.app.n8n.cloud/webhook/delete-invoice` to `mfin2.app.n8n.cloud/webhook/delete-invoice`.

### 4. Types file
`src/integrations/supabase/types.ts` is auto-generated for the *Lovable Cloud* project, not the new external one. Since the new mfin2 project has the same table names (organizations, organization_members, invoices, invoice_audit_log), the existing types should still work for those tables. Leave this file alone for now — if column mismatches show up at runtime we can regenerate.

## Files modified
- `src/integrations/supabase/client.ts` — hardcoded new URL + key
- `src/components/UploadPanel.tsx` — new upload webhook URL
- `supabase/functions/delete-invoice-webhook/index.ts` — new delete webhook URL

## Caveats to flag to user
- The edge function `delete-invoice-webhook` lives in the **old** Lovable Cloud Supabase project. It will keep working (it just proxies to n8n), but it's no longer "in" the new mfin2 project. If you want the edge function hosted in mfin2 instead, you'd need to deploy it there manually outside Lovable.
- Any auth/session the user currently has is tied to the old project and will be invalidated — users will need to sign up / log in again on the new project.
- Lovable Cloud features (managed migrations, secrets UI, types regeneration) will still target the old project, not mfin2.

