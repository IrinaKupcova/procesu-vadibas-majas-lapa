/* One-off verifier: node scripts/verify-epasts-sazina.cjs */
const { onRequestCreated, startsWithCits } = require("../epasts_sazina.js");

function usersSelectBuilder(allUsers) {
  const b = {
    eq(col, val) {
      return {
        maybeSingle: async () => ({
          data: allUsers.find((u) => String(u.id) === String(val)) ?? null,
          error: null,
        }),
      };
    },
  };
  b.then = (res, rej) => Promise.resolve({ data: allUsers, error: null }).then(res, rej);
  return b;
}

function promTable(row) {
  return {
    select() {
      return {
        eq() {
          return {
            maybeSingle: async () => ({ data: row, error: null }),
          };
        },
      };
    },
    update() {
      return {
        eq() {
          return {
            select() {
              return {
                maybeSingle: async () => ({ data: row, error: null }),
              };
            },
          };
        },
      };
    },
  };
}

async function main() {
  console.assert(startsWithCits("Cits x") === true, "startsWithCits");

  const admin = { id: "adm", role: "admin", email: "mgr@test.lv" };
  const applicant = { id: "u1", role: "user", "i-mail": "app@test.lv" };
  const promRow = { id: "req1", statuss: "pending", user_id: "u1", veids: "Cits (tests)" };
  const supabase = {
    from(t) {
      if (t === "prombutnes_dati") return promTable(promRow);
      if (t === "users") return { select: () => usersSelectBuilder([admin, applicant]) };
    },
  };

  const sent = [];
  const resend = {
    emails: {
      send: async (opts) => {
        sent.push(opts);
        return { error: null };
      },
    },
  };
  const r = await onRequestCreated({ supabase, resend, requestId: "req1", veids: "Cits" });
  console.assert(r.ok && r.notified, "result ok");
  console.assert(sent.length === 2, "two emails, got " + sent.length);
  console.assert(String(sent[0].to).includes("mgr@test.lv"), "manager to");
  console.assert(String(sent[1].to).includes("app@test.lv"), "applicant to");
  console.assert(String(sent[1].subject).includes("Pārbaude"), "applicant subject");

  const sent2 = [];
  const resend2 = { emails: { send: async (o) => { sent2.push(o); return { error: null }; } } };
  const sameApp = { id: "u2", role: "user", email: "mgr@test.lv" };
  const prom2 = { id: "req2", statuss: "pending", user_id: "u2", veids: "Cits" };
  const sb2 = {
    from(t) {
      if (t === "prombutnes_dati") return promTable(prom2);
      if (t === "users") return { select: () => usersSelectBuilder([admin, sameApp]) };
    },
  };
  await onRequestCreated({ supabase: sb2, resend: resend2, requestId: "req2" });
  console.assert(sent2.length === 1, "dedupe same email, got " + sent2.length);

  const sent3 = [];
  const resend3 = { emails: { send: async (o) => { sent3.push(o); return { error: null }; } } };
  const noMail = { id: "u3", role: "user" };
  const prom3 = { id: "req3", statuss: "pending", user_id: "u3", veids: "Cits" };
  const sb3 = {
    from(t) {
      if (t === "prombutnes_dati") return promTable(prom3);
      if (t === "users") return { select: () => usersSelectBuilder([admin, noMail]) };
    },
  };
  const r3 = await onRequestCreated({ supabase: sb3, resend: resend3, requestId: "req3" });
  console.assert(sent3.length === 1, "no applicant mail: one send");
  console.assert(r3.warning && r3.warning.includes("Pieteicēja"), "warning");

  console.log("epasts_sazina.js: all checks OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
