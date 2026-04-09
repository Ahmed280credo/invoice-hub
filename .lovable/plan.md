

# Fix: Extract Invoice Number Before Sending to n8n

## Problem
The delete webhook sends the full filename (e.g. `invoice_Aaron Bergman_39519.pdf`) but n8n expects just the numeric invoice number (e.g. `39519`). The Google Sheets lookup fails because it can't match the row.

## Solution
Extract the numeric invoice number from the filename before sending it to n8n. The filename pattern is `invoice_Name_NUMBER.pdf`, so we extract the number between the last underscore and `.pdf`.

### Change 1 — `src/components/InvoiceTable.tsx`
- Before calling the edge function, extract the invoice number from `file_name`
- Use a regex like `/(\d+)\.pdf$/` to grab the trailing number
- Send `{ invoice_number: "39519" }` instead of `{ invoice_number: "invoice_Aaron Bergman_39519.pdf" }`

### Files
- **Modified**: `src/components/InvoiceTable.tsx` — extract number from filename before webhook call

