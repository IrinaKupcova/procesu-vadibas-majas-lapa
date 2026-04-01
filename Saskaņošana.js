(() => {
  function n(s) {
    return String(s ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function pickKey(keys, aliases, fallback) {
    const normAliases = aliases.map(n);
    const hit = keys.find((k) => normAliases.includes(n(k)));
    return hit || fallback;
  }

  function toIso(raw) {
    const s = String(raw ?? "").trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return s;
  }

  function detectCols(rows) {
    const keys = Array.from(new Set((rows ?? []).flatMap((r) => Object.keys(r || {}))));
    return {
      name: pickKey(keys, ["Vārds uzvārds", "Vards uzvards", "full_name"], "Vārds uzvārds"),
      status: pickKey(
        keys,
        ["Apstiprinātāja statuss", "Apstiprinataja statuss", "apstiprinataja_statuss", "approver_status"],
        "Apstiprinātāja statuss"
      ),
      from: pickKey(
        keys,
        ["Apstiprinājuma lomas periods no", "Apstiprinajuma lomas periods no", "apstiprinajuma_lomas_periods_no"],
        "Apstiprinājuma lomas periods no"
      ),
      to: pickKey(
        keys,
        [
          "Apstiprinājuma lomas periods līdz",
          "Apstiprinajuma lomas periods līdz",
          "Apstiprinajuma lomas periods lidz",
          "apstiprinajuma_lomas_periods_lidz",
        ],
        "Apstiprinājuma lomas periods līdz"
      ),
    };
  }

  function mode(raw) {
    const v = n(raw);
    if (v.includes("noklusejuma")) return "default";
    if (v.includes("noteikto periodu") || v.includes("noteilto periodu")) return "period";
    return "none";
  }

  function getByNormKey(obj, keyName) {
    if (!obj || !keyName) return null;
    if (Object.prototype.hasOwnProperty.call(obj, keyName)) return obj[keyName];
    const wanted = n(keyName);
    const hit = Object.keys(obj).find((k) => n(k) === wanted);
    return hit ? obj[hit] : null;
  }

  async function loadState(supabase, managerName) {
    const { data, error } = await supabase.from("users").select("*");
    if (error) return { error };
    const rows = data ?? [];
    const cols = detectCols(rows);
    const manager = rows.find((u) => n(u?.[cols.name]) === n(managerName)) ?? null;
    const today = toIso(new Date().toISOString().slice(0, 10));
    const deputy =
      rows.find((u) => {
        if (manager && String(u.id) === String(manager.id)) return false;
        if (mode(u?.[cols.status]) !== "period") return false;
        const f = toIso(u?.[cols.from]);
        const t = toIso(u?.[cols.to]);
        return !!f && !!t && f <= today && today <= t;
      }) ?? null;
    return {
      rows,
      cols,
      manager,
      deputy,
      deputyUserId: deputy ? String(deputy.id) : null,
      deputyFrom: deputy?.[cols.from] ?? null,
      deputyTo: deputy?.[cols.to] ?? null,
    };
  }

  async function saveState(supabase, managerName, deputyUserId, fromStr, toStr) {
    const state = await loadState(supabase, managerName);
    if (state.error) return state;
    const { rows, cols, manager } = state;
    if (!manager) return { error: { message: "Nav atrasts pamatvadītājs users tabulā." } };

    async function updateOneUser(id, payload, requireWrite) {
      const draft = { ...payload };
      let lastError = null;
      for (let i = 0; i < 6; i++) {
        const { data, error } = await supabase
          .from("users")
          .update(draft)
          .eq("id", id)
          .select("id");
        if (!error) {
          const affected = Array.isArray(data) ? data.length : 0;
          if (requireWrite && affected < 1) {
            return {
              error: {
                message:
                  "DB neatļāva saglabāt izvēlēto apstiprinātāju (RLS/politika neļauj update uz šo users rindu).",
              },
            };
          }
          return { ok: true, affected };
        }
        lastError = error;
        const msg = String(error?.message || "");
        const m = /Could not find the '([^']+)' column/i.exec(msg) || /column "([^"]+)" does not exist/i.exec(msg);
        const missing = m?.[1];
        if (missing && Object.prototype.hasOwnProperty.call(draft, missing)) {
          delete draft[missing];
          continue;
        }
        return { error };
      }
      return { error: lastError || { message: "Nezināma kļūda pie users update." } };
    }

    const clearIds = Array.from(
      new Set(
        rows
          .filter((u) => mode(u?.[cols.status]) !== "none" || u?.[cols.from] || u?.[cols.to])
          .map((u) => u.id)
          .concat(manager?.id ? [manager.id] : [])
          .concat(deputyUserId ? [deputyUserId] : [])
      )
    );

    for (const id of clearIds) {
      const res = await updateOneUser(id, { [cols.status]: null, [cols.from]: null, [cols.to]: null }, false);
      if (res.error) return res;
    }

    // Ja manager rindu nevar atjaunot (RLS), neturam to kā fatālu kļūdu: galvenais ir saglabāt izvēlēto periodisko.
    await updateOneUser(
      manager.id,
      { [cols.status]: "pec noklusējuma vienmēr", [cols.from]: null, [cols.to]: null },
      false
    );

    if (deputyUserId) {
      const deputyRes = await updateOneUser(
        deputyUserId,
        { [cols.status]: "uz noteikto periodu", [cols.from]: fromStr || null, [cols.to]: toStr || null },
        true
      );
      if (deputyRes.error) return deputyRes;

      // Verify write actually persisted (RLS can silently affect 0 rows in some setups)
      const { data: chk, error: chkErr } = await supabase
        .from("users")
        .select("*")
        .eq("id", deputyUserId)
        .maybeSingle();
      if (chkErr) return { error: chkErr };
      const okMode = mode(getByNormKey(chk, cols.status)) === "period";
      const gotFrom = toIso(getByNormKey(chk, cols.from));
      const gotTo = toIso(getByNormKey(chk, cols.to));
      const expFrom = toIso(fromStr);
      const expTo = toIso(toStr);
      const okFrom = !expFrom || gotFrom === expFrom;
      const okTo = !expTo || gotTo === expTo;
      if (!okMode || !okFrom || !okTo) {
        return {
          error: {
            message: `DB nesaglabāja pagaidu apstiprinātāju. status="${String(
              getByNormKey(chk, cols.status) ?? ""
            )}", no="${gotFrom}", līdz="${gotTo}"`,
          },
        };
      }
    }
    return { ok: true };
  }

  window.SASKANOSANA = { loadState, saveState };
})();
