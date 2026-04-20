(function () {
  const LS_EVENTS_KEY = "pdd_saliedesana_pasakumi_v1";

  function ensureStyles() {
    if (typeof document === "undefined") return;
    if (document.getElementById("pdd-saliedesana-style-v1")) return;
    const s = document.createElement("style");
    s.id = "pdd-saliedesana-style-v1";
    s.textContent = `
      .sal-wrap { display:grid; gap:1rem; }
      .sal-head { border:1px solid #a7f3d0; background:linear-gradient(180deg,#ecfdf5,#d1fae5); border-radius:12px; padding:.85rem .95rem; }
      .sal-head h2 { margin:0; font-size:1.08rem; color:#065f46; }
      .sal-accordion { border:1px solid #a7f3d0; border-radius:12px; background:#f0fdf4; overflow:hidden; }
      .sal-accordion summary { list-style:none; cursor:pointer; user-select:none; position:relative; padding:.62rem .75rem; font-weight:700; color:#065f46; }
      .sal-accordion summary::-webkit-details-marker { display:none; }
      .sal-accordion summary::after { content:"▸"; position:absolute; right:.65rem; top:50%; transform:translateY(-50%); color:#10b981; transition:transform .15s ease; }
      .sal-accordion[open] > summary::after { transform:translateY(-50%) rotate(90deg); }
      .sal-accordion-body { border-top:1px solid #bbf7d0; padding:.7rem; display:grid; gap:.7rem; }
      .sal-subnote { margin:0; font-size:.8rem; color:#047857; }
      .sal-cal-wrap { border:1px solid #bbf7d0; border-radius:12px; background:#fff; padding:.65rem; display:grid; gap:.55rem; }
      .sal-cal-head { display:flex; align-items:center; justify-content:space-between; gap:.45rem; flex-wrap:wrap; }
      .sal-cal-grid { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:.35rem; }
      .sal-cal-dow { text-align:center; font-size:.72rem; color:#64748b; font-weight:700; }
      .sal-cal-cell { min-height:88px; border:1px solid #d1d5db; border-radius:10px; padding:.3rem .34rem; background:#fff; display:flex; flex-direction:column; gap:.2rem; }
      .sal-cal-cell.out { opacity:.45; }
      .sal-cal-cell.today { box-shadow: inset 0 0 0 2px rgba(16,185,129,.35); border-color:#34d399; }
      .sal-cal-day { display:flex; align-items:center; justify-content:space-between; gap:.3rem; font-size:.78rem; font-weight:700; color:#0f172a; }
      .sal-cal-list { display:grid; gap:.2rem; }
      .sal-cal-pill { border:1px solid #86efac; background:#dcfce7; color:#166534; border-radius:999px; padding:1px 7px; font-size:.67rem; line-height:1.25; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .sal-cal-add { margin-top:auto; text-align:left; border:1px dashed #34d399; background:#f0fdf4; color:#047857; border-radius:8px; padding:.2rem .3rem; font-size:.7rem; cursor:pointer; }
      .sal-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:45; display:flex; align-items:center; justify-content:center; padding:1rem; }
      .sal-modal { width:min(560px,100%); border-radius:12px; border:1px solid #86efac; background:#fff; padding:.85rem; display:grid; gap:.65rem; }
      .sal-modal h3 { margin:0; color:#065f46; font-size:1rem; }
      .sal-modal-note { margin:0; font-size:.8rem; color:#64748b; }
    `;
    document.head.appendChild(s);
  }

  function toYmd(dateLike) {
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function monthLabelLv(date) {
    return new Intl.DateTimeFormat("lv-LV", { month: "long", year: "numeric" }).format(date);
  }

  function buildMonthGrid(monthDate) {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday first
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - startOffset);
    const list = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      list.push(d);
    }
    return list;
  }

  function loadLocalEvents() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LS_EVENTS_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((x) => ({
          id: String(x?.id ?? ""),
          date: String(x?.date ?? ""),
          title: String(x?.title ?? "").trim(),
          note: String(x?.note ?? "").trim(),
        }))
        .filter((x) => x.id && x.date && x.title);
    } catch {
      return [];
    }
  }

  function saveLocalEvents(events) {
    try {
      localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(Array.isArray(events) ? events : []));
    } catch {
      // ignore storage errors
    }
  }

  function createSaliedesanaPanel(html, React) {
    const { useMemo, useState, useEffect } = React;
    const DOW_LV = ["Pr", "Ot", "Tr", "Ce", "Pk", "Se", "Sv"];

    function renderCalendar({
      month,
      onMonthChange,
      events,
      onAddAtDay,
      passive = false,
    }) {
      const monthGrid = useMemo(() => buildMonthGrid(month), [month]);
      const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
      return html`
        <div class="sal-cal-wrap">
          <div class="sal-cal-head">
            <button type="button" class="btn btn-ghost btn-small" onClick=${() => onMonthChange(-1)}>←</button>
            <strong style=${{ textTransform: "capitalize" }}>${monthLabelLv(month)}</strong>
            <button type="button" class="btn btn-ghost btn-small" onClick=${() => onMonthChange(1)}>→</button>
          </div>
          <div class="sal-cal-grid">
            ${DOW_LV.map((d) => html`<div key=${`${monthKey}-dow-${d}`} class="sal-cal-dow">${d}</div>`)}
            ${monthGrid.map((d) => {
              const dKey = toYmd(d);
              const inMonth = d.getMonth() === month.getMonth();
              const isToday = dKey === toYmd(new Date());
              const dayEvents = (events || []).filter((e) => e.date === dKey);
              return html`
                <div key=${`${monthKey}-cell-${dKey}`} class=${`sal-cal-cell ${inMonth ? "" : "out"} ${isToday ? "today" : ""}`}>
                  <div class="sal-cal-day">
                    <span>${d.getDate()}</span>
                  </div>
                  <div class="sal-cal-list">
                    ${dayEvents.slice(0, 2).map((e) => html`<span key=${e.id} class="sal-cal-pill" title=${e.title}>${e.title}</span>`)}
                  </div>
                  ${passive
                    ? null
                    : html`<button type="button" class="sal-cal-add" onClick=${() => onAddAtDay(dKey)}>+ Pievienot</button>`}
                </div>
              `;
            })}
          </div>
        </div>
      `;
    }

    return function SaliedesanaPanel() {
      ensureStyles();
      const [openTeam, setOpenTeam] = useState(true);
      const [openHolidays, setOpenHolidays] = useState(false);
      const [teamMonth, setTeamMonth] = useState(new Date());
      const [holidayMonth, setHolidayMonth] = useState(new Date());
      const [events, setEvents] = useState([]);
      const [cardOpen, setCardOpen] = useState(false);
      const [cardDate, setCardDate] = useState("");
      const [cardTitle, setCardTitle] = useState("");
      const [cardNote, setCardNote] = useState("");

      useEffect(() => {
        setEvents(loadLocalEvents());
      }, []);

      function moveMonth(kind, delta) {
        if (kind === "team") setTeamMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
        if (kind === "hol") setHolidayMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
      }

      function openCardAt(dateKey) {
        setCardDate(dateKey);
        setCardTitle("");
        setCardNote("");
        setCardOpen(true);
      }

      function saveCard(ev) {
        ev?.preventDefault?.();
        const title = String(cardTitle ?? "").trim();
        if (!title) return;
        const next = [
          ...events,
          { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: cardDate, title, note: String(cardNote ?? "").trim() },
        ];
        setEvents(next);
        saveLocalEvents(next);
        setCardOpen(false);
      }

      return html`
        <section class="sal-wrap">
          <div class="sal-head">
            <h2>Saliedēšanas pasākumi, svētku dienas u.c.</h2>
          </div>

          <details class="sal-accordion" open=${openTeam} onToggle=${(e) => setOpenTeam(Boolean(e.currentTarget.open))}>
            <summary>Saliedēšanas pasākumi</summary>
            <div class="sal-accordion-body">
              <p class="sal-subnote">Izvēlies dienu kalendārā un pievieno saliedēšanas pasākuma kartiņu.</p>
              ${renderCalendar({
                month: teamMonth,
                onMonthChange: (delta) => moveMonth("team", delta),
                events,
                onAddAtDay: openCardAt,
                passive: false,
              })}
            </div>
          </details>

          <details class="sal-accordion" open=${openHolidays} onToggle=${(e) => setOpenHolidays(Boolean(e.currentTarget.open))}>
            <summary>Svētku dienas</summary>
            <div class="sal-accordion-body">
              <p class="sal-subnote">Atsevišķs kalendāra skats svētku dienu plānošanai un pārskatam.</p>
              ${renderCalendar({
                month: holidayMonth,
                onMonthChange: (delta) => moveMonth("hol", delta),
                events: [],
                onAddAtDay: () => {},
                passive: true,
              })}
            </div>
          </details>

          ${cardOpen
            ? html`
                <div class="sal-modal-bg" onClick=${() => setCardOpen(false)}>
                  <div class="sal-modal" onClick=${(e) => e.stopPropagation()}>
                    <h3>Saliedēšanas pasākuma kartiņa</h3>
                    <p class="sal-modal-note">Datums: <strong>${cardDate || "—"}</strong></p>
                    <p class="sal-modal-note">Kartiņas detalizēto saturu precizēsim nākamajā solī.</p>
                    <form class="stack" onSubmit=${saveCard}>
                      <div class="field">
                        <label>Pasākuma nosaukums</label>
                        <input class="input" required value=${cardTitle} onInput=${(e) => setCardTitle(e.target.value)} />
                      </div>
                      <div class="field">
                        <label>Piezīme</label>
                        <textarea class="textarea" value=${cardNote} onInput=${(e) => setCardNote(e.target.value)} />
                      </div>
                      <div class="row" style=${{ gap: ".45rem" }}>
                        <button type="submit" class="btn btn-primary btn-small">Saglabāt</button>
                        <button type="button" class="btn btn-ghost btn-small" onClick=${() => setCardOpen(false)}>Aizvērt</button>
                      </div>
                    </form>
                  </div>
                </div>
              `
            : null}
        </section>
      `;
    };
  }

  window.SALIEDESANA = {
    createSaliedesanaPanel,
    toYmd,
  };
})();
