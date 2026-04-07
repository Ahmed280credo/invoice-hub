

# Fix: Proxy Delete-Invoice Webhook Through Backend Function

## Problem
The browser blocks the direct POST to `https://mfin1.app.n8n.cloud/webhook/delete-invoice` due to CORS. The n8n server doesn't return `Access-Control-Allow-Origin` headers, causing every request to fail with "Failed to fetch."

## Solution
Create a backend function that proxies the webhook call server-side (no CORS restrictions on server-to-server calls).

### Step 1 — Create Edge Function `delete-invoice-webhook`
- Accepts POST with `{ "invoice_number": "..." }`
- Forwards the request to `https://mfin1.app.n8n.cloud/webhook/delete-invoice`
- Returns the n8n response status back to the client
- Includes proper CORS headers for the Lovable frontend

### Step 2 — Update `InvoiceTable.tsx`
- Change the fetch URL from the n8n webhook to the new edge function URL
- Everything else stays the same (error handling, toast messages)

### Files
- **New**: `supabase/functions/delete-invoice-webhook/index.ts`
- **Modified**: `src/components/InvoiceTable.tsx` — update webhook URL

