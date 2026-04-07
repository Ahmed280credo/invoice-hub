

# Add Webhook Call on Invoice Deletion

## Change
In `src/components/InvoiceTable.tsx`, after the Supabase `.delete()` succeeds, POST to `https://mfin1.app.n8n.cloud/webhook/delete-invoice` with `{ "invoice_number": inv.file_name }`.

### Details
- In `handleDelete`, after the successful Supabase delete, add a `fetch` call:
  ```
  POST https://mfin1.app.n8n.cloud/webhook/delete-invoice
  Content-Type: application/json
  Body: { "invoice_number": <file_name of the deleted invoice> }
  ```
- Need to look up the `file_name` from the `invoices` state using `deleteId` before the delete call (or capture it when setting `deleteId`)
- Use `response.text()` — treat any response as success (consistent with existing webhook pattern)
- If the webhook fetch throws a network error, show a warning toast but still consider the Supabase deletion successful
- No database or RLS changes needed

### File modified
- `src/components/InvoiceTable.tsx` — update `handleDelete` function and store the full invoice (not just id) for deletion context

