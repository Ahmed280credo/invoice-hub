

# Fix "No organization found"

## Root cause (two issues, not one)

**A. PostgREST schema cache is stale.** The new mfin2 project's API layer doesn't yet know about `public.organization_members`, so every query returns `404 PGRST205`. The table exists in Postgres (verified) — only the API cache is behind.

**B. Logged-in user has no membership.** Your current session is user `35e3e413-…` (`m.ubaidyaqoob@gmail.com`), but the only membership row points to user `6c095142-…`. So even after the cache reloads, the dashboard will still show "No organization found" for *this* account.

`is_org_member()` and the `app_role` enum are both correct — no change needed there.

## Fix

### Step 1 — Reload PostgREST schema cache (migration)
Run a one-line SQL command:
```
NOTIFY pgrst, 'reload schema';
```
This makes the API recognize `organization_members`, `organizations`, `invoices`, and `invoice_audit_log`. After this, the 404s disappear.

### Step 2 — Add the currently-logged-in user to the InvoiceFlow org (data insert)
Insert a membership row so user `35e3e413-ab87-417b-873f-43387572fe67` becomes an `admin` of org `feaaf612-dffc-4e64-9c00-7c84225e0579`:
```sql
INSERT INTO public.organization_members (user_id, org_id, role)
VALUES ('35e3e413-ab87-417b-873f-43387572fe67',
        'feaaf612-dffc-4e64-9c00-7c84225e0579',
        'admin');
```

After both steps: refresh the dashboard and the org should appear. No frontend code changes required — `useCurrentOrg.ts` is correct.

## Alternative (if you'd rather use the other account)
Skip step 2 and instead log out, then log in as the user that owns `6c095142-…`. The dashboard will work after step 1 alone.

## Files touched
- 1 new migration (schema reload + membership insert)
- No frontend changes
- No RLS changes

