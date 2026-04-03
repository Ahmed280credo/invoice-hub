

# Invoice Processing SaaS Dashboard — Implementation Plan

## Overview
A full-featured invoice processing dashboard with Supabase auth, file upload to an n8n webhook, and invoice tracking with pagination and filtering.

## Key Technical Details
- **Webhook**: POST to `https://mfin1.app.n8n.cloud/webhook-test/process-invoice`
- **FormData field**: `"files"` — all staged files sent in one request
- **Response handling**: Use `response.text()`, treat ANY response as success. Only show error if `fetch` throws (catch block).
- **No file storage**: Files are sent to n8n only. Only metadata saved to `invoices` table. `file_url` stays null.

## Steps

### 1. Supabase Schema (Migrations)
- Create `profiles` table (id, email, full_name, company, avatar_url, created_at) with RLS and auto-create trigger on signup
- Create `invoices` table (id, user_id, file_name, file_size, status default 'Pending', uploaded_at, file_url nullable) with RLS — users see only their own rows

### 2. Auth Pages
- Create `src/pages/Auth.tsx` — login/signup form using Supabase email+password auth
- Create `src/hooks/useAuth.ts` — auth state hook with `onAuthStateChange`
- Add protected route wrapper; unauthenticated users redirect to `/auth`

### 3. Dashboard Layout (`src/pages/Index.tsx`)
- Header: app name left, user email + Sign Out button right
- Two-column grid (responsive, stacks on mobile): Upload panel left, Invoice table right

### 4. Upload Panel (`src/components/UploadPanel.tsx`)
- Drag-and-drop zone (PDF, JPG, PNG, max 10MB each, max 20 files)
- Staging area with file name, size, remove button
- "Upload All (N files)" button → builds `FormData`, appends each file under field `"files"`, POSTs to webhook
- No manual `Content-Type` header
- Loading spinner per row during upload
- On success: clear staging, insert rows into `invoices` with status "Processing"
- On catch: show red error message
- Warning if >20 files

### 5. Invoice Table (`src/components/InvoiceTable.tsx`)
- Columns: File Name, Size, Status, Uploaded Date, Actions
- Status badges: Pending (yellow), Processing (blue), Completed (green), Failed (red)
- Status filter dropdown
- Pagination with page controls
- Actions: eye icon → metadata modal, trash icon → delete record

### 6. View Details Modal (`src/components/InvoiceDetailModal.tsx`)
- Shows file name, size, status badge, upload date

### 7. Supabase Client & Integration
- Create `src/integrations/supabase/client.ts` and typed helpers
- Wire up all CRUD operations for invoices

### 8. Routing
- `/auth` — login/signup
- `/` — protected dashboard
- `*` — 404

