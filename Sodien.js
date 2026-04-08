function ymd(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
}

function pick(v) {
  return String(v ?? "").trim();
}

function isTodayAway(a, today) {
  const st = pick(a?.status).toLowerCase();
  if (st && st !== "approved" && st !== "apstiprinats" && st !== "apstiprināts" && st !== "saskanots" && st !== "saskaņots") {
    return false;
  }
  const from = pick(a?.start_date || a?.Sakuma_datums || a?.sakuma_datums);
  const to = pick(a?.end_date || a?.Beigu_datums || a?.beigu_datums);
  if (!from || !to) return false;
  return from <= today && today <= to;
}

function displayName(a) {
  return pick(a?.employee?.["Vārds uzvārds"] || a?.employee?.full_name || a?.user_id) || "—";
}

function typeName(a) {
  return pick(a?.type?.name || a?.type_id) || "—";
}

function todayRows(absences) {
  const today = ymd(new Date());
  const list = Array.isArray(absences) ? absences : [];
  return list.filter((a) => isTodayAway(a, today));
}

function renderTodayInfo({ html, absences }) {
  if (typeof html !== "function") return null;
  const rows = todayRows(absences);
  return html`
    <section class="list-panel" style=${{ marginTop: "1rem", background: "var(--bg)" }}>
      <h3 style=${{ margin: "0 0 0.65rem", fontSize: "1rem" }}>Kas šodien aktuāls</h3>
      <p style=${{ margin: "0 0 0.65rem", color: "var(--muted)", fontSize: "0.9rem" }}>Šodien nav darbā</p>
      ${rows.length
        ? html`
            <div class="stack" style=${{ gap: "0.5rem" }}>
              ${rows.map(
                (a, i) => html`
                  <div
                    key=${`today-away-${a.id ?? i}`}
                    style=${{
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "0.55rem 0.65rem",
                      background: "var(--surface)",
                    }}
                  >
                    <div style=${{ fontWeight: 600 }}>
                      ${displayName(a)} <span style=${{ color: "var(--muted)", fontWeight: 400 }}>(${typeName(a)})</span>
                    </div>
                    <div style=${{ fontSize: "0.88rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                      Mani aizvieto: ${pick(a?.Mani_aizvieto) || "—"}
                    </div>
                    <div style=${{ fontSize: "0.88rem", color: "var(--muted)" }}>
                      Papildu informācija: ${pick(a?.Papildu_info) || "—"}
                    </div>
                  </div>
                `
              )}
            </div>
          `
        : html`<p style=${{ margin: 0, color: "var(--muted)" }}>Šodien nav neviena prombūtnes ieraksta.</p>`}
    </section>
  `;
}

window.PDDSodien = {
  renderTodayInfo,
};
