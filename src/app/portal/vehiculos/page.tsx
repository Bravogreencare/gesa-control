import PortalSidebar from '@/components/portal-sidebar';
import PortalTopbar from '@/components/portal-topbar';
import { getPortalContext } from '@/lib/portal/context';

function money(value: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value || 0);
}

export default async function VehiculosPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams;
  const { supabase, user, available, selectedId } = await getPortalContext(params.empresa);

  const { data: vehicles } = await supabase
    .from('vehiculos')
    .select('id,placa,marca,modelo,tipo,capacidad_tanque,rendimiento_objetivo,estado')
    .eq('empresa_id', selectedId)
    .order('placa');

  const { data: supplies } = await supabase
    .from('abastecimientos')
    .select('id,vehiculo_id,kilometraje,despachos(total,fecha_evento,productos(nombre))')
    .eq('empresa_id', selectedId)
    .limit(2000);

  const stats = new Map<string, { count: number; amount: number; lastKm: number | null; lastDate: string | null; fuel: string | null }>();
  ((supplies || []) as any[]).forEach((row) => {
    const key = row.vehiculo_id;
    if (!key) return;
    const current = stats.get(key) || { count: 0, amount: 0, lastKm: null, lastDate: null, fuel: null };
    current.count += 1;
    current.amount += Number(row.despachos?.total || 0);
    const d = row.despachos?.fecha_evento || null;
    if (!current.lastDate || (d && d > current.lastDate)) {
      current.lastDate = d;
      current.lastKm = row.kilometraje == null ? current.lastKm : Number(row.kilometraje);
      current.fuel = row.despachos?.productos?.nombre || current.fuel;
    }
    stats.set(key, current);
  });

  const rows = ((vehicles || []) as any[]).map((vehicle) => ({ ...vehicle, ...(stats.get(vehicle.id) || { count: 0, amount: 0, lastKm: null, lastDate: null, fuel: null }) }));
  const active = rows.filter((v) => v.estado === 'ACTIVO').length;
  const withTarget = rows.filter((v) => v.rendimiento_objetivo != null).length;

  return (
    <main className="portal-shell">
      <PortalSidebar empresaId={selectedId} active="vehiculos" />
      <section className="workspace">
        <PortalTopbar selectedId={selectedId} available={available} userEmail={user.email} />
        <div className="content portal-content">
          <div className="module-heading">
            <div>
              <p className="eyebrow">PORTAL DEL CLIENTE · FLOTA</p>
              <h1>Vehículos</h1>
              <p className="muted">Maestra de unidades vinculadas a la empresa y resumen de su actividad de abastecimiento.</p>
            </div>
            <span className="quality-badge">{rows.length} unidades</span>
          </div>

          <section className="kpi-grid four">
            <article className="card kpi premium-kpi"><span>Vehículos</span><strong>{rows.length}</strong><small>Total registrados</small></article>
            <article className="card kpi premium-kpi"><span>Activos</span><strong>{active}</strong><small>Disponibles para control</small></article>
            <article className="card kpi premium-kpi"><span>Con meta de rendimiento</span><strong>{withTarget}</strong><small>Parámetro configurado</small></article>
            <article className="card kpi premium-kpi"><span>Abastecimientos</span><strong>{(supplies || []).length}</strong><small>Histórico vinculado</small></article>
          </section>

          <section className="card table-card portal-table premium-table client-section-card">
            <div className="card-title-row"><div><p className="eyebrow">MAESTRA</p><h2>Flota del cliente</h2></div><span className="neutral-badge">Vista de consulta</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Placa</th><th>Vehículo</th><th>Tipo</th><th>Combustible reciente</th><th>Último KM</th><th>Cargas</th><th>Gasto acumulado</th><th>Tanque</th><th>Rend. objetivo</th><th>Estado</th></tr></thead>
                <tbody>
                  {rows.map((v) => (
                    <tr key={v.id}>
                      <td><strong>{v.placa}</strong></td>
                      <td>{[v.marca, v.modelo].filter(Boolean).join(' ') || '—'}</td>
                      <td>{v.tipo || '—'}</td>
                      <td>{v.fuel || '—'}</td>
                      <td>{v.lastKm ?? '—'}</td>
                      <td>{v.count}</td>
                      <td><strong>{money(v.amount)}</strong></td>
                      <td>{v.capacidad_tanque != null ? `${v.capacidad_tanque}` : '—'}</td>
                      <td>{v.rendimiento_objetivo != null ? `${v.rendimiento_objetivo} km/gal` : '—'}</td>
                      <td><span className="quality-badge">{v.estado}</span></td>
                    </tr>
                  ))}
                  {!rows.length ? <tr><td className="empty-row" colSpan={10}>No hay vehículos registrados.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
