

# Fix: Update n8n Upload Webhook to Production URL

## Problem
The upload panel is using the n8n **test** URL (`webhook-test/process-invoice`), but the workflow is now live and should use the **production** URL.

## Change
**File**: `src/components/UploadPanel.tsx`
- Change `WEBHOOK_URL` from `https://mfin1.app.n8n.cloud/webhook-test/process-invoice` to `https://mfin1.app.n8n.cloud/webhook/process-invoice`

Single line change, no other modifications needed.

