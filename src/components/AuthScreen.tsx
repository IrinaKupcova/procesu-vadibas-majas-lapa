import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Mode = "signin" | "signup";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName || email.split("@")[0] } },
        });
        if (error) setMessage(error.message);
        else
          setMessage(
            "Konts izveidots. Ja ir ieslēgta e-pasta apstiprināšana, pārbaudi pastkasti.",
          );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMessage(error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-box">
      <h1>PDD — Pieslēgšanās</h1>
      <div className="row" style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          className={`btn btn-small ${mode === "signin" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("signin")}
        >
          Ieiet
        </button>
        <button
          type="button"
          className={`btn btn-small ${mode === "signup" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("signup")}
        >
          Reģistrēties
        </button>
      </div>

      <form className="stack" onSubmit={onSubmit}>
        {mode === "signup" && (
          <div className="field">
            <label htmlFor="name">Vārds, uzvārds</label>
            <input
              id="name"
              className="input"
              value={fullName}
              onChange={(ev) => setFullName(ev.target.value)}
              autoComplete="name"
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">E-pasts</label>
          <input
            id="email"
            type="email"
            className="input"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Parole</label>
          <input
            id="password"
            type="password"
            className="input"
            required
            minLength={6}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "…" : mode === "signup" ? "Izveidot kontu" : "Ieiet"}
        </button>
      </form>
      {message && <p style={{ marginTop: "1rem", color: "var(--muted)" }}>{message}</p>}
    </div>
  );
}
