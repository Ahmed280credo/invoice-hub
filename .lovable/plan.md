

# Two Fixes for Invoice Dashboard

## Fix 1 — Status Update After Processing

**Current behavior**: All files are sent in one batch POST, then all rows inserted with status "Processing" — status never changes.

**New behavior**: Change the upload flow to send files individually so each file's status can be updated based on its webhook result.

- Loop through staged files one by one
- For each file: POST to webhook, then insert row with status `"Processed"` on success or `"Failed"` on catch
- This eliminates the need for a separate update call — we just set the correct status at insert time
- Show per-file spinner during its upload

**Alternative** (if you want to keep batch POST): Insert all rows as "Processing" first, then update each row's status to "Processed" after the single webhook succeeds, or "Failed" on catch. This requires an UPDATE RLS policy on the invoices table (currently missing).

**Recommendation**: Add an UPDATE RLS policy and keep the batch POST. After the webhook call resolves, update all inserted rows to "Processed". On catch, update them to "Failed".

### Changes needed:
- **Migration**: Add UPDATE RLS policy on `invoices` table for own rows
- **UploadPanel.tsx**: After webhook success, update inserted rows' status to "Processed". On catch, update to "Failed"

## Fix 2 — Delete Confirmation Dialog + Toast

**Current behavior**: Delete button exists but has no confirmation and no toast.

**Changes**:
- **InvoiceTable.tsx**: Add `AlertDialog` confirmation before deleting. On confirm, delete the row and show `toast.success("Invoice deleted successfully")` via sonner.

### Files to modify:
1. `src/components/UploadPanel.tsx` — status update logic
2. `src/components/InvoiceTable.tsx` — delete confirmation + toast
3. Migration — UPDATE RLS policy on invoices

