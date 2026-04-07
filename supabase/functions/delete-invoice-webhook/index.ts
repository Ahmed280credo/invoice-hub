const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json();
    const invoice_number = typeof payload?.invoice_number === "string" ? payload.invoice_number.trim() : "";

    if (!invoice_number) {
      return jsonResponse({ ok: false, error: "invoice_number is required" }, 400);
    }

    const response = await fetch("https://mfin1.app.n8n.cloud/webhook/delete-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_number }),
    });

    const body = await response.text();

    if (!response.ok) {
      return jsonResponse({
        ok: false,
        error: "External service rejected the request",
        externalStatus: response.status,
        externalBody: body,
      });
    }

    return jsonResponse({
      ok: true,
      externalStatus: response.status,
      externalBody: body,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return jsonResponse({
      ok: false,
      error: "Failed to notify external service",
      details: message,
    });
  }
});
