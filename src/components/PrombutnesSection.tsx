import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { AbsenceRow, AbsenceType, AbsenceWithMeta, ProfileRole } from "@/types/database";
import { AbsenceCalendar } from "./AbsenceCalendar";
import { AbsenceRequestForm } from "./AbsenceRequestForm";
import { ManagerApprovals } from "./ManagerApprovals";

type Props = {
  userId: string;
  role: ProfileRole;
  onBack: () => void;
};

export function PrombutnesSection({ userId, role, onBack }: Props) {
  const [month, setMonth] = useState(() => new Date());
  const [absences, setAbsences] = useState<AbsenceWithMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const { data: rows, error: qErr } = await supabase
      .from("prombutnes_dati")
      .select("*, type:prombutnes_veidi(*)")
      .order("start_date", { ascending: true });
    if (qErr) {
      setError(qErr.message);
      return;
    }
    const { data: profs, error: pErr } = await supabase.from("profiles").select("id, full_name");
    if (pErr) setError(pErr.message);
    const pmap = new Map((profs ?? []).map((p) => [p.id, p]));
    const list: AbsenceWithMeta[] = (rows ?? []).map((r) => {
      const row = r as AbsenceRow & { type: AbsenceType | null };
      return {
        ...row,
        type: row.type,
        employee: pmap.get(row.user_id) ?? null,
      };
    });
    setAbsences(list);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isManager = role === "manager" || role === "admin";

  return (
    <section className="stack" style={{ gap: "1.25rem" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Prombūtnes</h2>
          <p className="app-sub" style={{ margin: "0.25rem 0 0" }}>
            Kopīgs kalendārs un pieteikumu plūsma: darbinieks iesniedz, vadītājs akceptē.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Atpakaļ uz moduļiem
        </button>
      </div>

      {error && (
        <div className="banner-warn" role="alert">
          Neizdevās ielādēt datus: {error}. Pārbaudi Supabase tabulas un RLS politikas.
        </div>
      )}

      <div className="prombutnes-grid">
        <AbsenceCalendar month={month} onMonthChange={setMonth} absences={absences} />
        <AbsenceRequestForm userId={userId} onCreated={() => void refresh()} />
      </div>

      {isManager && <ManagerApprovals currentUserId={userId} onChanged={() => void refresh()} />}

      <div className="list-panel">
        <h2>Mani pieteikumi</h2>
        {absences.filter((a) => a.user_id === userId).length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)" }}>Vēl nav iesniegumu.</p>
        ) : (
          absences
            .filter((a) => a.user_id === userId)
            .map((a) => (
              <div key={a.id} className="abs-item">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span>{a.type?.name}</span>
                  <span className={`badge badge-${a.status === "pending" ? "pending" : a.status === "approved" ? "approved" : "rejected"}`}>
                    {a.status === "pending" ? "Gaida" : a.status === "approved" ? "Apstiprināts" : "Noraidīts"}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                  {a.start_date} — {a.end_date}
                </div>
              </div>
            ))
        )}
      </div>
    </section>
  );
}
