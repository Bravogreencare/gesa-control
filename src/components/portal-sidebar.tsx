import Link from 'next/link';

type Props = {
  empresaId: string;
  active: 'inicio' | 'abastecimientos' | 'viajes' | 'rendimiento' | 'facturacion' | 'vehiculos' | 'precios' | 'alertas';
};

const items = [
  ['inicio', 'Inicio', '/portal'],
  ['abastecimientos', 'Abastecimientos', '/portal/abastecimientos'],
  ['viajes', 'Viajes / CECO', '/portal/viajes'],
  ['rendimiento', 'Rendimiento', '/portal/rendimiento'],
  ['facturacion', 'Facturación y crédito', '/portal/facturacion'],
  ['vehiculos', 'Vehículos', '/portal/vehiculos'],
  ['precios', 'Precios y estaciones', '/portal/precios'],
  ['alertas', 'Alertas', '/portal/alertas'],
] as const;

export default function PortalSidebar({ empresaId, active }: Props) {
  return (
    <aside className="portal-sidebar">
      <div className="official-brand">
        <div className="sidebar-logo-wrap">
          <img src="/gesa-logo-clean.svg" alt="GESA - Tu estación de confianza" className="gesa-logo" />
        </div>
      </div>
      <div className="product-name">GESA CONTROL</div>
      <div className="product-sub">Portal del cliente</div>
      <nav>
        {items.map(([key, label, href]) => (
          <Link
            key={key}
            className={active === key ? 'nav-item active' : 'nav-item'}
            href={`${href}?empresa=${empresaId}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-signature">
        <span>Red GESA</span>
        <small>Información para mover tu operación.</small>
      </div>
    </aside>
  );
}
