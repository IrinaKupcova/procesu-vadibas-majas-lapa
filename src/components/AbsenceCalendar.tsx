import type { CSSProperties } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { lv } from "date-fns/locale";
import type { AbsenceWithMeta } from "@/types/database";

type Props = {
  month: Date;
  onMonthChange: (d: Date) => void;
  absences: AbsenceWithMeta[];
};

const dow = ["P", "O", "T", "C", "P", "S", "Sv"];

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function chipStyle(a: AbsenceWithMeta): CSSProperties {
  if (a.status === "approved") return { background: a.type?.color ?? "#34d399", color: "#0f172a" };
  if (a.status === "rejected") return { background: "#7f1d1d", color: "#fecaca" };
  return { background: "#854d0e", color: "#fef3c7" };
}

export function AbsenceCalendar({ month, onMonthChange, absences }: Props) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  function entriesForDay(d: Date) {
    const key = dayKey(d);
    return absences.filter((a) => key >= a.start_date && key <= a.end_date);
  }

  const title = format(month, "LLLL yyyy", { locale: lv });

  return (
    <div className="cal-wrap">
      <div className="cal-head">
        <button type="button" className="btn btn-small btn-ghost" onClick={() => onMonthChange(addMonths(month, -1))}>
          ←
        </button>
        <strong style={{ textTransform: "capitalize" }}>{title}</strong>
        <button type="button" className="btn btn-small btn-ghost" onClick={() => onMonthChange(addMonths(month, 1))}>
          →
        </button>
      </div>
      <div className="cal-grid">
        {dow.map((l) => (
          <div key={l} className="cal-dow">
            {l}
          </div>
        ))}
        {days.map((d) => {
          const inMonth = isSameMonth(d, month);
          const items = entriesForDay(d);
          return (
            <div
              key={d.toISOString()}
              className={`cal-cell ${!inMonth ? "cal-cell-out" : ""} ${isToday(d) ? "cal-cell-today" : ""}`}
            >
              <div className="cal-day-num">{format(d, "d")}</div>
              {items.map((a) => (
                <span
                  key={a.id}
                  className="cal-chip"
                  style={chipStyle(a)}
                  title={`${a.employee?.full_name ?? "Darbinieks"} — ${a.type?.name ?? ""} (${a.status})`}
                >
                  {a.employee?.full_name?.split(" ")[0] ?? "?"} · {a.type?.name ?? ""}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
