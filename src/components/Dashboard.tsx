type Props = {
  onOpenPrombutnes: () => void;
};

export function Dashboard({ onOpenPrombutnes }: Props) {
  return (
    <section aria-labelledby="dashboard-title">
      <h2 id="dashboard-title" className="app-sub" style={{ marginBottom: "1rem", fontSize: "1rem" }}>
        Moduļi
      </h2>
      <div className="card-grid">
        <button type="button" className="card" onClick={onOpenPrombutnes}>
          <h3>Prombūtnes</h3>
          <p>Calendārs, pieteikumi un vadītāja akcepts (atvaļinājums, komandējums u.c.).</p>
        </button>
        <div className="card" style={{ opacity: 0.65, cursor: "default" }}>
          <h3>Resursi</h3>
          <p>Plānots — aprīkojums, telpas, grafiki.</p>
        </div>
        <div className="card" style={{ opacity: 0.65, cursor: "default" }}>
          <h3>Uzdevumi</h3>
          <p>Plānots — komandas uzdevumu dēlis.</p>
        </div>
      </div>
    </section>
  );
}
