/**
 * Prombūtnes pieteikums — palīgfunkcijas (Cits periods u.tml.).
 *
 * Darbinieku izvēlne un forma ir index.html → AbsenceRequestForm:
 * noklusējumā atlasīts pašreizējais lietotājs, pārējie no public.users, ja vajag cits.
 * Šis fails netiek obligāti ielādēts lapā; globālie palīgi zem window.PDD_CITS_PERIOD_HELPERS.
 */

function pad2(n) {
  const x = Number(n);
  return Number.isFinite(x) ? String(x).padStart(2, "0") : "";
}

function normalizeTimeLv(t) {
  if (!t) return "";
  if (typeof t === "string") {
    const s = String(t).trim();
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (m) return `${pad2(m[1])}:${pad2(m[2])}`;
    return s;
  }
  if (typeof t === "object") {
    const hh = pad2(t.hour ?? t.h ?? t.stundas);
    const mm = pad2(t.minute ?? t.m ?? t.minūtes);
    if (hh && mm) return `${hh}:${mm}`;
  }
  return String(t);
}

function buildCitsPeriodLabelLv({ allDay, fromTime, toTime }) {
  if (allDay === true) return "Visa diena";
  const fromLv = normalizeTimeLv(fromTime);
  const toLv = normalizeTimeLv(toTime);
  if (fromLv && toLv) return `Laikā no ${fromLv} līdz ${toLv}`;
  if (fromLv && !toLv) return `Laikā no ${fromLv}`;
  if (!fromLv && toLv) return `Laikā līdz ${toLv}`;
  return "";
}

function buildCitsCommentWithPeriodLv({ allDay, fromTime, toTime, comment }) {
  const label = buildCitsPeriodLabelLv({ allDay, fromTime, toTime });
  const c = String(comment ?? "").trim();
  if (label && c) return `${label} · ${c}`;
  if (label) return label;
  return c || null;
}

window.PDD_CITS_PERIOD_HELPERS = {
  buildCitsPeriodLabelLv,
  buildCitsCommentWithPeriodLv,
};