const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const APPROVAL_LINK = "https://irinakupcova.github.io/PDD_aplikacija/prombutnes-vesture";
const TO_EMAILS = ["katrina.jirgensone@vid.gov.lv", "irina.kupcova@vid.gov.lv"];

type RequestBody = {
  name?: unknown;
  veids?: unknown;
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeBody(input: RequestBody): { name: string; veids: string } {
  return {
    name: String(input?.name ?? "").trim(),
    veids: String(input?.veids ?? "").trim(),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return jsonResponse({ error: "Missing RESEND_API_KEY" }, 500);

  const from = Deno.env.get("RESEND_FROM") ?? "PDD <onboarding@resend.dev>";

  let rawBody: RequestBody;
  try {
    rawBody = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { name, veids } = normalizeBody(rawBody);
  if (!name || !veids) {
    return jsonResponse({ error: "name and veids are required" }, 400);
  }

  const html = `
    <p>Vārds: ${escapeHtml(name)}</p>
    <p>Veids: ${escapeHtml(veids)}</p>
    <p>Links: <a href="${APPROVAL_LINK}">${APPROVAL_LINK}</a></p>
  `;

  try {
    const resendResp = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: TO_EMAILS,
        subject: "Jauns pieteikums",
        html,
      }),
    });

    const raw = await resendResp.text();
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = raw;
    }

    if (!resendResp.ok) {
      return jsonResponse(
        {
          error: "Resend request failed",
          status: resendResp.status,
          details: parsed,
        },
        502,
      );
    }

    return jsonResponse({ success: true, provider: "resend", result: parsed }, 200);
  } catch (err) {
    return jsonResponse(
      {
        error: "Unexpected server error",
        details: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
});
