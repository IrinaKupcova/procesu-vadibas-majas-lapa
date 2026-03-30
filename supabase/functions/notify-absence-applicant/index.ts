// Pēc „Gaidošie akcepti” apstiprinājuma vai noraidījuma — e-pasts pieteicējam (public.users.email).
// Body: { absence_id: uuid, decision: "approved" | "rejected" }
// Pārbauda: JWT lietotājs ir vadītājs/apstiprinātājs un ka ierakstā approved_by = šis lietotājs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// deno-lint-ignore no-explicit-any
async function callerCanApprove(admin: any, authUid: string): Promise<boolean> {
  const { data: u } = await admin.from("users").select("role").eq("id", authUid).maybeSingle();
  if (u?.role === "manager" || u?.role === "admin") return true;
  const { data: d } = await admin
    .from("pdd_deputy_state")
    .select("deputy_user_id, deputy_valid_from, deputy_valid_to")
    .eq("id", 1)
    .maybeSingle();
  if (!d?.deputy_user_id || d.deputy_user_id !== authUid) return false;
  const t = todayIsoDate();
  if (d.deputy_valid_from && t < String(d.deputy_valid_from)) return false;
  if (d.deputy_valid_to && t > String(d.deputy_valid_to)) return false;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nav autorizācijas" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const absence_id = body?.absence_id;
    const decision = body?.decision;
    if (!absence_id || typeof absence_id !== "string") {
      return new Response(JSON.stringify({ error: "Trūkst absence_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (decision !== "approved" && decision !== "rejected") {
      return new Response(JSON.stringify({ error: "decision jābūt approved vai rejected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Nederīgs lietotājs" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authUid = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    if (!(await callerCanApprove(admin, authUid))) {
      return new Response(JSON.stringify({ error: "Tikai vadītājs vai Prombūtnes apstiprinātājs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: row, error: rowErr } = await admin
      .from("prombutnes_dati")
      .select("id, user_id, start_date, end_date, comment, status, approved_by, type:prombutnes_veidi(name)")
      .eq("id", absence_id)
      .maybeSingle();

    if (rowErr || !row) {
      return new Response(JSON.stringify({ error: "Ieraksts nav atrasts" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (row.status !== decision) {
      return new Response(JSON.stringify({ error: "Statuss neatbilst pieprasījumam" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (row.approved_by !== authUid) {
      return new Response(JSON.stringify({ error: "Pieeja liegta" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const t = row.type as { name?: string } | { name?: string }[] | null;
    const typeName = Array.isArray(t) ? (t[0]?.name ?? "Prombūtne") : (t?.name ?? "Prombūtne");

    const { data: prof } = await admin
      .from("users")
      .select('full_name, email, "i-mail", "Vārds uzvārds"')
      .eq("id", row.user_id)
      .maybeSingle();

    const p = prof as Record<string, unknown> | null;
    const toEmail = String(p?.email ?? p?.["i-mail"] ?? "")
      .trim();
    if (!toEmail || !toEmail.includes("@")) {
      return new Response(
        JSON.stringify({ ok: false, skipped: true, message: "Pieteicējam nav e-pasta (email vai i-mail)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const employee = String(p?.["Vārds uzvārds"] ?? p?.full_name ?? toEmail).trim() || toEmail;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM") ?? "PDD <onboarding@resend.dev>";

    if (!resendKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          skipped: true,
          message: "RESEND_API_KEY nav iestatīts — e-pasts netika nosūtīts.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isOk = decision === "approved";
    const html = isOk
      ? `
      <p>Sveiki, <strong>${employee}</strong>,</p>
      <p>Jūsu prombūtnes pieprasījums ir <strong>apstiprināts</strong>.</p>
      <p>Veids: <strong>${typeName}</strong><br/>
      Periods: <strong>${row.start_date}</strong> — <strong>${row.end_date}</strong></p>
      ${row.comment ? `<p>Komentārs: ${String(row.comment).replace(/</g, "&lt;")}</p>` : ""}
      <p>Ar cieņu,<br/>PDD</p>
    `
      : `
      <p>Sveiki, <strong>${employee}</strong>,</p>
      <p>Jūsu prombūtnes pieprasījums ir <strong>noraidīts</strong>.</p>
      <p>Veids: <strong>${typeName}</strong><br/>
      Periods: <strong>${row.start_date}</strong> — <strong>${row.end_date}</strong></p>
      ${row.comment ? `<p>Jūsu komentārs: ${String(row.comment).replace(/</g, "&lt;")}</p>` : ""}
      <p>Ar cieņu,<br/>PDD</p>
    `;

    const subject = isOk
      ? `PDD: prombūtne apstiprināta — ${typeName} (${row.start_date}–${row.end_date})`
      : `PDD: prombūtne noraidīta — ${typeName} (${row.start_date}–${row.end_date})`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject,
        html,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "Resend: " + t }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
