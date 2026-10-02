import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/logout-button';
import { createClient } from '@/lib/supabase/server';

function money(value: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value || 0);
}

function number(value: number, digits = 2) {
  return new Intl.NumberFormat('es-PE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value || 0);
}

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: memberships } = await supabase
    .from('membresias')
    .select('empresa_id, rol, empresas(id,ruc,razon_social,nombre_comercial)')
    .eq('activo', true);

  const available = (memberships || []) as any[];
  if (!available.length) {
    return (
      <main className="empty-access">
        <div className="login-card">
          <Image src="/gesa-logo.svg" alt="GESA" width={200} height={70} className="empty-logo" />
          <p className="eyebrow">GESA CONTROL</p>
          <h2>Usuario autenticado</h2>
          <p className="muted">Tu cuenta todavía no está asociada a una empresa cliente. Un administrador GESA debe asignarte una membresía.</p>
          <LogoutButton />
        </div>
      </main>
    );
  }

  const params = await searchParams;
  const selectedId = available.some((m) => m.empresa_id === params.empresa) ? params.empresa! : available[0].empresa_id;
  const membership = available.find((m) => m.empresa_id === selectedId)!;
  const company = membership.empresas;

  const { data: supplies } = await supabase
    .from('abastecimientos')
    .select(`
      id, kilometraje, estado_conciliacion, creado_en,
      vehiculos(id,placa,marca,modelo),
      viajes(id,codigo_corto,periodo),
      despachos(
        id,fecha_evento,numero_recibo,cantidad,unidad,precio_unitario,total,moneda,
        estaciones(id,nombre), productos(id,nombre),
        despacho_documentos(comprobantes(id,tipo,serie,numero,total,fecha_emision))
      )
    `)
    .eq('empresa_id', selectedId)
    .order('creado_en', { ascending: false })
    .limit(25);

  const rows = ((supplies || []) as any[]);
  const totalGallons = rows.reduce((acc, row) => acc + Number(row.despachos?.cantidad || 0), 0);
  const totalSpent = rows.reduce((acc, row) => acc + Number(row.despachos?.total || 0), 0);
  const uniqueVehicles = new Set(rows.map((r) => r.vehiculos?.id).filter(Boolean)).size;

  return (
    <main className="portal-shell">
      <aside className="portal-sidebar">
        <div className="official-brand">
          <Image src="/gesa-logo.svg" alt="GESA - Tu estación de confianza" width={200} height={70} priority className="gesa-logo" />
        </div>
        <div className="product-name">GESA CONTROL</div>
        <div className="product-sub">Portal corporativo</div>
        <nav>
          <Link className="nav-item active" href="/portal">Inicio</Link>
          <a className="nav-item">Abastecimientos</a>
          <a className="nav-item">Viajes y rutas</a>
          <a className="nav-item">Rendimiento</a>
          <a className="nav-item">Precios y refinería</a>
          <a className="nav-item">Vehículos</a>
          <a className="nav-item">Comprobantes</a>
          <a className="nav-item">Alertas</a>
        </nav>
        <div className="sidebar-signature">
          <span>Red GESA</span>
          <small>Información para mover tu operación.</small>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar portal-topbar">
          <form method="get" className="company-form">
            <span className="label">Empresa</span>
            <select name="empresa" defaultValue={selectedId}>
              {available.map((m) => <option key={m.empresa_id} value={m.empresa_id}>{m.empresas?.razon_social}</option>)}
            </select>
            <button type="submit" className="small-button">Cambiar</button>
          </form>
          <div className="top-actions"><span className="user-email">{user.email}</span><LogoutButton /></div>
        </header>

        <div className="content portal-content">
          <div className="hero compact official-hero">
            <div className="hero-overlay" />
            <div className="hero-copy">
              <p className="eyebrow hero-eyebrow">PORTAL CORPORATIVO DE COMBUSTIBLE</p>
              <h1>Resumen ejecutivo</h1>
              <p>{company?.razon_social}</p>
              <div className="hero-meta"><span>RUC {company?.ruc}</span><span>{membership.rol}</span></div>
            </div>
            <div className="hero-note official-note">Más que combustible,<br/><strong>información para decidir.</strong></div>
          </div>

          <section className="kpi-grid four">
            <article className="card kpi premium-kpi"><span>Galones visibles</span><strong>{number(totalGallons, 3)}</strong><small>{rows.length} registros cargados</small></article>
            <article className="card kpi premium-kpi"><span>Importe visible</span><strong>{money(totalSpent)}</strong><small>Fuente transaccional GESA</small></article>
            <article className="card kpi premium-kpi"><span>Abastecimientos</span><strong>{rows.length}</strong><small>Según acceso actual</small></article>
            <article className="card kpi premium-kpi"><span>Vehículos identificados</span><strong>{uniqueVehicles}</strong><small>Flota visible del cliente</small></article>
          </section>

          <section className="card table-card portal-table premium-table">
            <div className="card-title-row"><div><p className="eyebrow">HISTORIAL</p><h2>Abastecimientos recientes</h2></div><span className="quality-badge">Sincronización GESA CONTROL</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Fecha/hora</th><th>Placa</th><th>Km</th><th>Viaje</th><th>Estación</th><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Importe</th><th>Comprobante</th><th></th></tr></thead>
                <tbody>
                  {rows.map((row) => {
                    const d = row.despachos;
                    const doc = d?.despacho_documentos?.[0]?.comprobantes;
                    return (
                      <tr key={row.id}>
                        <td>{d?.fecha_evento ? new Date(d.fecha_evento).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : '—'}</td>
                        <td><strong>{row.vehiculos?.placa || '—'}</strong></td>
                        <td>{row.kilometraje ?? '—'}</td>
                        <td>{row.viajes?.codigo_corto || '—'}</td>
                        <td>{d?.estaciones?.nombre || '—'}</td>
                        <td>{d?.productos?.nombre || '—'}</td>
                        <td>{number(Number(d?.cantidad || 0), 3)} {d?.unidad || ''}</td>
                        <td>{money(Number(d?.precio_unitario || 0))}</td>
                        <td><strong>{money(Number(d?.total || 0))}</strong></td>
                        <td>{doc ? `${doc.serie}-${doc.numero}` : 'Pendiente'}</td>
                        <td><Link className="table-link" href={`/portal/abastecimientos/${row.id}`}>Ver →</Link></td>
                      </tr>
                    );
                  })}
                  {!rows.length ? <tr><td colSpan={11} className="empty-row">No hay abastecimientos disponibles para este cliente.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
