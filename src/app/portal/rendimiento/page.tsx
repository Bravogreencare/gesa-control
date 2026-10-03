import PortalSidebar from '@/components/portal-sidebar';
import PortalTopbar from '@/components/portal-topbar';
import { getPortalContext } from '@/lib/portal/context';

function qty(value: number, digits = 2) {
  return new Intl.NumberFormat('es-PE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value || 0);
}

export default async function RendimientoPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams;
  const { supabase, user, available, selectedId } = await getPortalContext(params.empresa);

  const { data: vehicles } = await supabase
    .from('vehiculos')
    .select('id,placa,marca,modelo,rendimiento_objetivo')
    .eq('empresa_id', selectedId)
    .order('placa');

  const { data: supplies } = await supabase
    .from('abastecimientos')
    .select('id,vehiculo_id,kilometraje,despachos(fecha_evento,cantidad,unidad,productos(nombre))')
    .eq('empresa_id', selectedId)
    .limit(3000);

  const byVehicle = new Map<string, any[]>();
  ((supplies || []) as any[]).forEach((row) => {
    if (!row.vehiculo_id) return;
    const list = byVehicle.get(row.vehiculo_id) || [];
    list.push(row);
    byVehicle.set(row.vehiculo_id, list);
  });

  const rows = ((vehicles || []) as any[]).map((v) => {
    const loads = (byVehicle.get(v.id) || []).sort((a, b) => String(a.despachos?.fecha_evento || '').localeCompare(String(b.despachos?.fecha_evento || '')));
    const kmLoads = loads.filter((r) => r.kilometraje != null && Number(r.kilometraje) > 0);
    const firstKm = kmLoads.length ? Number(kmLoads[0].kilometraje) : null;
    const lastKm = kmLoads.length ? Number(kmLoads[kmLoads.length - 1].kilometraje) : null;
    const distance = firstKm != null && lastKm != null && lastKm >= firstKm ? lastKm - firstKm : null;
    const gallonLoads = loads.filter((r) => String(r.despachos?.unidad || '').toLowerCase().includes('gal'));
    const gallons = gallonLoads.reduce((sum, r) => sum + Number(r.despachos?.cantidad || 0), 0);
    const estimated = distance != null && distance > 0 && gallons > 0 ? distance / gallons : null;
    const quality = estimated != null ? 'ESTIMADO' : 'DATOS INSUFICIENTES';
    return { ...v, loads: loads.length, firstKm, lastKm, distance, gallons, estimated, quality };
  });

  const withEstimate = rows.filter((r) => r.estimated != null).length;
  const withTarget = rows.filter((r) => r.rendimiento_objetivo != null).length;

  return (
    <main className="portal-shell">
      <PortalSidebar empresaId={selectedId} active="rendimiento" />
      <section className="workspace">
        <PortalTopbar selectedId={selectedId} available={available} userEmail={user.email} />
        <div className="content portal-content">
          <div className="module-heading">
            <div>
              <p className="eyebrow">PORTAL DEL CLIENTE · ANALÍTICA</p>
              <h1>Rendimiento</h1>
              <p className="muted">Indicadores de kilometraje y combustible con calidad de dato explícita.</p>
            </div>
            <span className="neutral-badge">Compra ≠ consumo real</span>
          </div>

          <section className="card client-section-card methodology-card">
            <strong>Cómo leer este módulo</strong>
            <p>El indicador mostrado es referencial cuando solo contamos con compras y lecturas de odómetro. No se presenta como consumo medido salvo que exista un método de inventario o lleno–lleno validado.</p>
            <div className="method-badges"><span>MEDIDO CON INVENTARIO</span><span>LLENO–LLENO VALIDADO</span><span className="active">ESTIMADO</span><span>DATOS INSUFICIENTES</span></div>
          </section>

          <section className="kpi-grid four">
            <article className="card kpi premium-kpi"><span>Vehículos</span><strong>{rows.length}</strong><small>Unidades evaluadas</small></article>
            <article className="card kpi premium-kpi"><span>Con indicador</span><strong>{withEstimate}</strong><small>Cálculo referencial disponible</small></article>
            <article className="card kpi premium-kpi"><span>Con meta</span><strong>{withTarget}</strong><small>Rendimiento objetivo configurado</small></article>
            <article className="card kpi premium-kpi"><span>Calidad estándar</span><strong>ESTIMADO</strong><small>Mientras no exista inventario validado</small></article>
          </section>

          <section className="card table-card portal-table premium-table client-section-card">
            <div className="card-title-row"><div><p className="eyebrow">FLOTA</p><h2>Indicadores por vehículo</h2></div><span className="quality-badge">Lecturas del cliente</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Placa</th><th>Vehículo</th><th>Cargas</th><th>KM inicial</th><th>KM final</th><th>Recorrido</th><th>Galones adquiridos</th><th>Indicador</th><th>Meta</th><th>Calidad</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.placa}</strong></td>
                      <td>{[r.marca, r.modelo].filter(Boolean).join(' ') || '—'}</td>
                      <td>{r.loads}</td>
                      <td>{r.firstKm ?? '—'}</td>
                      <td>{r.lastKm ?? '—'}</td>
                      <td>{r.distance != null ? `${qty(r.distance, 0)} km` : '—'}</td>
                      <td>{r.gallons > 0 ? `${qty(r.gallons, 3)} gal` : '—'}</td>
                      <td><strong>{r.estimated != null ? `${qty(r.estimated)} km/gal` : '—'}</strong></td>
                      <td>{r.rendimiento_objetivo != null ? `${qty(Number(r.rendimiento_objetivo))} km/gal` : '—'}</td>
                      <td><span className={r.quality === 'ESTIMADO' ? 'quality-badge warning' : 'neutral-badge'}>{r.quality}</span></td>
                    </tr>
                  ))}
                  {!rows.length ? <tr><td className="empty-row" colSpan={10}>No hay vehículos para evaluar.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
