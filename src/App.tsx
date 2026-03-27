import { useMemo, useState } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { Dashboard } from "@/components/Dashboard";
import { PrombutnesSection } from "@/components/PrombutnesSection";
import { useProfile, useSession } from "@/hooks/useSession";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";

type View = "home" | "prombutnes";

export default function App() {
  const { session, loading } = useSession();
  const { profile } = useProfile(session?.user.id);
  const [view, setView] = useState<View>("home");

  const configured = supabaseConfigured();

  const title = useMemo(
    () => (
      <div>
        <h1 className="app-title">PDD aplikācija</h1>
        <p className="app-sub">Pakalpojumu dizaina daļa — darba organizācija</p>
      </div>
    ),
    [],
  );

  async function signOut() {
    await supabase.auth.signOut();
    setView("home");
  }

  if (!configured) {
    return (
      <div className="app-shell">
        {title}
        <div className="banner-warn">
          Trūkst <code>VITE_SUPABASE_URL</code> un <code>VITE_SUPABASE_ANON_KEY</code>. Izstrādē:
          nokopē <code>.env.example</code> kā <code>.env</code> un restartē kompilētāju. Pirms statiskās
          salikšanas palaid <code>npm run build</code> — iznākums ir mape <code>dist/</code> ar tīru
          statiku (nekāda Node servera nav jādzesē produkcijā); Supabase anon atslēga kompilācijas laikā
          iekļūst JS — tā ir paredzēta pārlūkam, bet repozitorijā <code>.env</code> necomitē.
        </div>
        <p style={{ color: "var(--muted)" }}>
          SQL shēma: <code>supabase/migrations/20260327220000_initial_pdd.sql</code>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-shell">
        {title}
        <p style={{ color: "var(--muted)" }}>Ielādē…</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="app-shell">
        {title}
        <AuthScreen />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        {title}
        <div className="row">
          <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            {profile?.full_name ?? session.user.email}
            {profile?.role === "manager" || profile?.role === "admin"
              ? " · vadītājs"
              : ""}
          </span>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => signOut()}>
            Iziet
          </button>
        </div>
      </header>

      {view === "home" && <Dashboard onOpenPrombutnes={() => setView("prombutnes")} />}
      {view === "prombutnes" && (
        <PrombutnesSection
          userId={session.user.id}
          role={profile?.role ?? "employee"}
          onBack={() => setView("home")}
        />
      )}
    </div>
  );
}
