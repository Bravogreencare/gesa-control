import Link from 'next/link';
import LogoutButton from '@/components/logout-button';

type Props = {
  active: 'inicio' | 'clientes' | 'cortes';
  displayName?: string | null;
  children: React.ReactNode;
};

export default function CommercialShell({ active, displayName, children }: Props) {
  return (
    <main className="commercial-shell">
      <aside className="commercial-sidebar">
        <div className="commercial-brand">
          <div className="sidebar-logo-wrap"><img src="/gesa-logo-clean.svg" alt="GESA" className="gesa-logo" /></div>
          <div>
            <strong>GESA CONTROL</strong>
            <span>Gestión comercial</span>
          </div>
        </div>

        <div className="commercial-role-chip">COMERCIAL GESA</div>
        <nav className="commercial-nav">
          <Link className={active === 'inicio' ? 'active' : ''} href="/comercial">Resumen comercial</Link>
          <Link className={active === 'clientes' ? 'active' : ''} href="/comercial#clientes">Clientes y condiciones</Link>
          <Link className={active === 'cortes' ? 'active' : ''} href="/comercial/cortes">Cortes por facturar</Link>
        </nav>

        <div className="commercial-sidebar-note">
          <span>Regla GESA</span>
          <small>Una factura consolidada nunca mezcla tipos de combustible.</small>
        </div>
      </aside>

      <section className="commercial-workspace">
        <header className="commercial-topbar">
          <div>
            <span className="commercial-topbar-label">Sesión interna</span>
            <strong>{displayName || 'Comercial GESA'}</strong>
          </div>
          <LogoutButton />
        </header>
        <div className="commercial-content">{children}</div>
      </section>
    </main>
  );
}
