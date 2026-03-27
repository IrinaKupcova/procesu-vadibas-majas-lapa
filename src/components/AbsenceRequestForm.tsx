import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { AbsenceType } from "@/types/database";

type Props = {
  userId: string;
  onCreated: () => void;
};

export function AbsenceRequestForm({ userId, onCreated }: Props) {
  const [types, setTypes] = useState<AbsenceType[]>([]);
  const [typeId, setTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase
      .from("prombutnes_veidi")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setTypes((data as AbsenceType[]) ?? []);
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!typeId) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("prombutnes_dati").insert({
        user_id: userId,
        type_id: Number(typeId),
        start_date: startDate,
        end_date: endDate,
        comment: comment.trim() || null,
        status: "pending",
      });
      if (error) {
        alert("Kļūda: " + error.message);
        return;
      }
      setStartDate("");
      setEndDate("");
      setComment("");
      setTypeId("");
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="list-panel">
      <h2>Pieteikt prombūtni</h2>
      <form className="stack" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="ptype">Veids</label>
          <select
            id="ptype"
            className="select"
            required
            value={typeId}
            onChange={(ev) => setTypeId(ev.target.value)}
          >
            <option value="">Izvēlies veidu</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="row" style={{ gap: "0.75rem" }}>
          <div className="field" style={{ flex: "1 1 140px" }}>
            <label htmlFor="pstart">No</label>
            <input
              id="pstart"
              type="date"
              className="input"
              required
              value={startDate}
              onChange={(ev) => setStartDate(ev.target.value)}
            />
          </div>
          <div className="field" style={{ flex: "1 1 140px" }}>
            <label htmlFor="pend">Līdz</label>
            <input
              id="pend"
              type="date"
              className="input"
              required
              value={endDate}
              onChange={(ev) => setEndDate(ev.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="pcom">Komentārs</label>
          <textarea
            id="pcom"
            className="textarea"
            placeholder="Piemēram, saskaņošanas konteksts (nav obligāts)"
            value={comment}
            onChange={(ev) => setComment(ev.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Sūta…" : "Nosūtīt saskaņošanai"}
        </button>
      </form>
    </div>
  );
}
