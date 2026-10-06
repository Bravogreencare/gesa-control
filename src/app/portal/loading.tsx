export default function PortalLoading() {
  return (
    <main className="portal-loading-shell" aria-busy="true" aria-label="Cargando GESA CONTROL">
      <aside className="portal-loading-sidebar">
        <div className="portal-loading-logo shimmer" />
        <div className="portal-loading-nav shimmer" />
        <div className="portal-loading-nav shimmer" />
        <div className="portal-loading-nav shimmer" />
        <div className="portal-loading-nav shimmer" />
      </aside>
      <section className="portal-loading-workspace">
        <div className="portal-loading-topbar shimmer" />
        <div className="portal-loading-content">
          <div className="portal-loading-hero shimmer" />
          <div className="portal-loading-grid">
            <div className="portal-loading-card shimmer" />
            <div className="portal-loading-card shimmer" />
            <div className="portal-loading-card shimmer" />
            <div className="portal-loading-card shimmer" />
          </div>
          <div className="portal-loading-chart shimmer" />
        </div>
      </section>
    </main>
  );
}
