"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function NewAbsencePage() {
  const [types, setTypes] = useState<any[]>([]);
  const [typeId, setTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comment, setComment] = useState("");
  const [user, setUser] = useState<any>(null);

  // 🔹 Ielādē user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);

  // 🔹 Ielādē prombūtņu veidus
  useEffect(() => {
    const fetchTypes = async () => {
      const { data } = await supabase
        .from("prombutnes_veidi")
        .select("*");

      setTypes(data || []);
    };
    fetchTypes();
  }, []);

  // 🔹 Submit funkcija
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const { error } = await supabase.from("prombutnes_dati").insert({
      user_id: user.id,
      type_id: Number(typeId),
      start_date: startDate,
      end_date: endDate,
      comment: comment,
    });

    if (error) {
      alert("Kļūda: " + error.message);
    } else {
      alert("Prombūtne pieteikta!");
      setStartDate("");
      setEndDate("");
      setComment("");
      setTypeId("");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-xl shadow">
      <h1 className="text-xl font-bold mb-4">
        Pieteikt prombūtni
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Veids */}
        <select
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          required
          className="w-full border p-2 rounded"
        >
          <option value="">Izvēlies veidu</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {/* Sākuma datums */}
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />

        {/* Beigu datums */}
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />

        {/* Komentārs */}
        <textarea
          placeholder="Komentārs (nav obligāts)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          Pieteikt
        </button>
      </form>
    </div>
  );
}