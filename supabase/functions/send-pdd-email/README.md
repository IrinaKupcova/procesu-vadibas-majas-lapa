# send-pdd-email

Supabase Edge Function (`Deno`) e-pasta sūtīšanai caur Resend.

## Request

`POST` JSON:

```json
{
  "name": "string",
  "veids": "string"
}
```

## Deploy komandas

```bash
supabase login
supabase link --project-ref fdnkvecgqetmwilwolgt
supabase secrets set RESEND_API_KEY="re_xxxxxxxxxxxxxxxxx"
supabase secrets set RESEND_FROM="PDD <onboarding@resend.dev>"
supabase functions deploy send-pdd-email
```

## curl tests

```bash
curl -X POST "https://fdnkvecgqetmwilwolgt.supabase.co/functions/v1/send-pdd-email" \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{"name":"Irina Kupcova","veids":"Cits"}'
```

Sagaidāma atbilde:

```json
{
  "success": true
}
```

## Frontend fetch piemērs

```js
async function sendPddEmail({ name, veids }) {
  const url = "https://fdnkvecgqetmwilwolgt.supabase.co/functions/v1/send-pdd-email";
  const anonKey = "<SUPABASE_ANON_KEY>";

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ name, veids }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || "Email send failed");
  return data;
}
```
