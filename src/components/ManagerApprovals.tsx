import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { AbsenceWithMeta } from "@/types/database";

type Props = {
  currentUserId: string;
  onChanged: () => void;
};

export function ManagerApprovals({ currentUserId, onChanged }: Props) {
  const [pending, setPending] = useState<AbsenceWithMeta[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data: rows, error } = await supabase
      .from("prombutnes_dati")
      .select("*, type:prombutnes_veidi(*)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    const { data: profs } = await supabase.from("profiles").select("id, full_name");
    const pmap = new Map((profs ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p]));
    const list = (rows ?? []).map((r: Record<string, unknown>) => ({
      ...(r as AbsenceWithMeta),
      type: r.type as AbsenceWithMeta["type"],
      employee: pmap.get((r as { user_id: string }).user_id) ?? null,
    }));
    setPending(list);
  }

  useEffect(() => {
    void load();
  }, []);

  async function settle(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    try {
      const { error } = await supabase
        .from("prombutnes_dati")
        .update({
          status,
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) {
        alert(error.message);
        return;
      }
      await load();
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  if (pending.length === 0) {
    return (
      <div className="list-panel">
        <h2>Gaidošie akcepti</h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>Nav iesniegumu, kas gaidītu apstiprinājumu.</p>
      </div>
    );
  }

  return (
    <div className="list-panel">
      <h2>Gaidošie akcepti</h2>
      {pending.map((a) => (
        <div key={a.id} className="abs-item">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <strong>{a.employee?.full_name ?? a.user_id}</strong>
            <span className="badge badge-pending">Gaida</span>
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            {a.type?.name} · {a.start_date} — {a.end_date}
          </div>
          {a.comment && <p style={{ margin: "0.35rem 0 0", fontSize: "0.88rem" }}>{a.comment}</p>}
          <div className="row" style={{ marginTop: "0.55rem" }}>
            <button
              type="button"
              className="btn btn-small btn-primary"
              disabled={busyId === a.id}
              onClick={() => settle(a.id, "approved")}
            >
              Apstiprināt
            </button>
            <button
              type="button"
              className="btn btn-small btn-danger"
              disabled={busyId === a.id}
              onClick={() => settle(a.id, "rejected")}
            >
              Noraidīt
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
