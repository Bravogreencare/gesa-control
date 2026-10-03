import Link from 'next/link';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/logout-button';
import { createClient } from '@/lib/supabase/server';

function money(value: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value || 0);
}

function number(value: number, digits = 3) {
  return new Intl.NumberFormat('es-PE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value || 0);
}

export default async function AbastecimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string; q?: string; desde?: string; hasta?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: memberships } = await supabase
    .from('membresias')
    .select('empresa_id, rol, empresas(id,ruc,razon_social,nombre_comercial)')
    .eq('activo', true);

  const available = (memberships || []) as any[];
  if (!available.length) redirect('/portal');

  const params = await searchParams;
  const selectedId = available.some((m) => m.empresa_id === params.empresa)
    ? params.empresa!
    : available[0].empresa_id;
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
    .limit(250);

  const q = (params.q || '').trim().toLowerCase();
  const desde = params.desde ? new Date(`${params.desde}T00:00:00-05:00`) : null;
  const hasta = params.hasta ? new Date(`${params.hasta}T23:59:59-05:00`) : null;

  const rows = ((supplies || []) as any[]).filter((row) => {
    const d = row.despachos;
    const doc = d?.despacho_documentos?.[0]?.comprobantes;
    const eventDate = d?.fecha_evento ? new Date(d.fecha_evento) : null;
    if (desde && eventDate && eventDate < desde) return false;
    if (hasta && eventDate && eventDate > hasta) return false;
    if (!q) return true;
    const haystack = [
      row.vehiculos?.placa,
      row.viajes?.codigo_corto,
      d?.estaciones?.nombre,
      d?.productos?.nombre,
      d?.numero_recibo,
      doc ? `${doc.serie}-${doc.numero}` : '',
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });

  const totalGallons = rows.reduce((acc, row) => acc + Number(row.despachos?.cantidad || 0), 0);
  const totalSpent = rows.reduce((acc, row) => acc + Number(row.despachos?.total || 0), 0);
  const uniqueVehicles = new Set(rows.map((r) => r.vehiculos?.id).filter(Boolean)).size;

  return (
    <main className="portal-shell">
      <aside className="portal-sidebar">
        <div className="official-brand">
          <img src="/gesa-logo-clean.svg" alt="GESA - Tu estación de confianza" className="gesa-logo" />
        </div>
        <div className="product-name">GESA CONTROL</div>
        <div className="product-sub">Portal corporativo</div>
        <nav>
          <Link className="nav-item" href={`/portal?empresa=${selectedId}`}>Inicio</Link>
          <Link className="nav-item active" href={`/portal/abastecimientos?empresa=${selectedId}`}>Abastecimientos</Link>
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
              {available.map((m) => (
                <option key={m.empresa_id} value={m.empresa_id}>{m.empresas?.razon_social}</option>
              ))}
            </select>
            <button type="submit" className="small-button">Cambiar</button>
          </form>
          <div className="top-actions"><span className="user-email">{user.email}</span><LogoutButton /></div>
        </header>

        <div className="content portal-content">
          <div className="module-heading">
            <div>
              <p className="eyebrow">CONTROL OPERATIVO</p>
              <h1>Abastecimientos</h1>
              <p className="muted">{company?.razon_social} · RUC {company?.ruc}</p>
            </div>
            <span className="quality-badge">{rows.length} registros visibles</span>
          </div>

          <section className="kpi-grid four">
            <article className="card kpi premium-kpi"><span>Galones</span><strong>{number(totalGallons)}</strong><small>Resultado filtrado</small></article>
            <article className="card kpi premium-kpi"><span>Importe</span><strong>{money(totalSpent)}</strong><small>Resultado filtrado</small></article>
            <article className="card kpi premium-kpi"><span>Abastecimientos</span><strong>{rows.length}</strong><small>Registros visibles</small></article>
            <article className="card kpi premium-kpi"><span>Vehículos</span><strong>{uniqueVehicles}</strong><small>Placas identificadas</small></article>
          </section>

          <section className="card module-filter-card">
            <form method="get" className="module-filters">
              <input type="hidden" name="empresa" value={selectedId} />
              <label>
                Buscar
                <input name="q" defaultValue={params.q || ''} placeholder="Placa, viaje, estación, producto o comprobante" />
              </label>
              <label>
                Desde
                <input type="date" name="desde" defaultValue={params.desde || ''} />
              </label>
              <label>
                Hasta
                <input type="date" name="hasta" defaultValue={params.hasta || ''} />
              </label>
              <div className="module-filter-actions">
                <button className="small-button" type="submit">Filtrar</button>
                <Link className="table-link" href={`/portal/abastecimientos?empresa=${selectedId}`}>Limpiar</Link>
              </div>
            </form>
          </section>

          <section className="card table-card portal-table premium-table">
            <div className="card-title-row">
              <div><p className="eyebrow">HISTORIAL</p><h2>Registro de abastecimientos</h2></div>
              <span className="quality-badge">Fuente transaccional GESA</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Fecha/hora</th><th>Placa</th><th>Km</th><th>Viaje</th><th>Estación</th><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Importe</th><th>Comprobante</th><th>Estado</th><th></th></tr>
                </thead>
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
                        <td>{number(Number(d?.cantidad || 0))} {d?.unidad || ''}</td>
                        <td>{money(Number(d?.precio_unitario || 0))}</td>
                        <td><strong>{money(Number(d?.total || 0))}</strong></td>
                        <td>{doc ? `${doc.serie}-${doc.numero}` : 'Pendiente'}</td>
                        <td><span className="quality-badge">{row.estado_conciliacion || 'PENDIENTE'}</span></td>
                        <td><Link className="table-link" href={`/portal/abastecimientos/${row.id}`}>Ver →</Link></td>
                      </tr>
                    );
                  })}
                  {!rows.length ? <tr><td colSpan={12} className="empty-row">No hay abastecimientos que coincidan con los filtros seleccionados.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
