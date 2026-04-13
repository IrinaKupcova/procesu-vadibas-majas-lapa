(function () {
  function injectCalendarTodayHighlightStyle() {
    if (typeof document === "undefined") return;
    if (document.getElementById("pdd-kalendars-today-style")) return;
    const s = document.createElement("style");
    s.id = "pdd-kalendars-today-style";
    s.textContent = `
      .cal-wrap .cal-cell.cal-cell-today {
        outline: none !important;
        border: 2px solid var(--accent, #0284c7) !important;
        box-shadow:
          0 0 0 2px rgba(2, 132, 199, 0.35),
          inset 0 0 0 1px rgba(2, 132, 199, 0.2);
        background: linear-gradient(
          180deg,
          rgba(2, 132, 199, 0.16),
          rgba(2, 132, 199, 0.05)
        ) !important;
      }
      .cal-wrap .cal-cell.cal-cell-today .cal-day-num {
        color: var(--accent, #0284c7);
        font-weight: 800;
      }
      .cal-wrap .cal-cell.cal-cell-today.cal-cell-out {
        opacity: 1;
      }
    `;
    document.head.appendChild(s);
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", injectCalendarTodayHighlightStyle);
    } else {
      injectCalendarTodayHighlightStyle();
    }
  }

  function toYmd(dateLike) {
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  window.KALENDARS = {
    toYmd,
    injectCalendarTodayHighlightStyle: injectCalendarTodayHighlightStyle,
  };
})();
