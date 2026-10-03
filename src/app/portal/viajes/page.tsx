import PortalSidebar from '@/components/portal-sidebar';
import PortalTopbar from '@/components/portal-topbar';
import { getPortalContext } from '@/lib/portal/context';

function money(value: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value || 0);
}

function shortDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
}

export default async function ViajesPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams;
  const { supabase, user, available, selectedId, company } = await getPortalContext(params.empresa);
  const controlLabel = company?.etiqueta_control_operativo === 'CECO' ? 'CECO' : 'Viaje';

  const { data: supplies } = await supabase
    .from('abastecimientos')
    .select(`
      id,referencia_control,kilometraje,
      vehiculos(id,placa,marca,modelo),
      viajes(id,codigo_corto,origen,destino,estado,fecha_inicio,fecha_fin),
      despachos(fecha_evento,total,productos(nombre))
    `)
    .eq('empresa_id', selectedId)
    .limit(1000);

  const grouped = new Map<string, any>();
  ((supplies || []) as any[]).forEach((row) => {
    const key = row.referencia_control || row.viajes?.codigo_corto || 'SIN_ASIGNAR';
    const current = grouped.get(key) || {
      key,
      count: 0,
      amount: 0,
      plates: new Set<string>(),
      from: null as string | null,
      to: null as string | null,
      route: row.viajes ? [row.viajes.origen, row.viajes.destino].filter(Boolean).join(' → ') : '',
      state: row.viajes?.estado || '',
    };
    current.count += 1;
    current.amount += Number(row.despachos?.total || 0);
    if (row.vehiculos?.placa) current.plates.add(row.vehiculos.placa);
    const day = row.despachos?.fecha_evento || null;
    if (day && (!current.from || day < current.from)) current.from = day;
    if (day && (!current.to || day > current.to)) current.to = day;
    grouped.set(key, current);
  });

  const rows = Array.from(grouped.values()).sort((a, b) => b.amount - a.amount);
  const assigned = rows.filter((row) => row.key !== 'SIN_ASIGNAR').length;
  const unassigned = rows.find((row) => row.key === 'SIN_ASIGNAR')?.count || 0;

  return (
    <main className="portal-shell">
      <PortalSidebar empresaId={selectedId} active="viajes" />
      <section className="workspace">
        <PortalTopbar selectedId={selectedId} available={available} userEmail={user.email} />
        <div className="content portal-content">
          <div className="module-heading">
            <div>
              <p className="eyebrow">PORTAL DEL CLIENTE · IMPUTACIÓN OPERATIVA</p>
              <h1>{controlLabel === 'CECO' ? 'Centros de costo' : 'Viajes'}</h1>
              <p className="muted">El cliente puede controlar sus despachos por {controlLabel.toLowerCase()}; este dato es independiente de la facturación.</p>
            </div>
            <span className="neutral-badge">Control principal: {controlLabel}</span>
          </div>

          <section className="kpi-grid four">
            <article className="card kpi premium-kpi"><span>{controlLabel}s con consumo</span><strong>{assigned}</strong><small>Referencias identificadas</small></article>
            <article className="card kpi premium-kpi"><span>Sin asignar</span><strong>{unassigned}</strong><small>Abastecimientos pendientes</small></article>
            <article className="card kpi premium-kpi"><span>Abastecimientos</span><strong>{(supplies || []).length}</strong><small>Registros analizados</small></article>
            <article className="card kpi premium-kpi"><span>Configuración</span><strong>{controlLabel}</strong><small>Definida para la empresa</small></article>
          </section>

          <section className="card table-card portal-table premium-table client-section-card">
            <div className="card-title-row"><div><p className="eyebrow">CONTROL</p><h2>Consumo por {controlLabel}</h2></div><span className="quality-badge">Vista del cliente</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>{controlLabel}</th><th>Ruta / referencia</th><th>Vehículos</th><th>Abastecimientos</th><th>Desde</th><th>Hasta</th><th>Importe</th><th>Estado</th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key}>
                      <td><strong>{row.key === 'SIN_ASIGNAR' ? 'Sin asignar' : row.key}</strong></td>
                      <td>{row.route || '—'}</td>
                      <td>{Array.from(row.plates).join(', ') || '—'}</td>
                      <td>{row.count}</td>
                      <td>{shortDate(row.from)}</td>
                      <td>{shortDate(row.to)}</td>
                      <td><strong>{money(row.amount)}</strong></td>
                      <td><span className="quality-badge">{row.state || (row.key === 'SIN_ASIGNAR' ? 'PENDIENTE' : 'ACTIVO')}</span></td>
                    </tr>
                  ))}
                  {!rows.length ? <tr><td className="empty-row" colSpan={8}>No hay información de {controlLabel.toLowerCase()} para mostrar.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
