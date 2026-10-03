import PortalSidebar from '@/components/portal-sidebar';
import PortalTopbar from '@/components/portal-topbar';
import { getPortalContext } from '@/lib/portal/context';

function money(value?: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 4 }).format(Number(value || 0));
}

function date(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
}

export default async function PreciosPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams;
  const { supabase, user, available, selectedId } = await getPortalContext(params.empresa);

  const { data: board } = await supabase
    .from('precios_pizarra')
    .select('id,unidad,moneda,base_fiscal,valor,vigente_desde,estaciones(id,nombre,provincia),productos(id,nombre)')
    .order('vigente_desde', { ascending: false })
    .limit(300);

  const { data: refinery } = await supabase
    .from('precios_refineria')
    .select('id,unidad,moneda,base_fiscal,valor,vigente_desde,fuente,terminal,productos(id,nombre)')
    .order('vigente_desde', { ascending: false })
    .limit(100);

  const latestRefByProduct = new Map<string, any>();
  ((refinery || []) as any[]).forEach((row) => {
    const id = row.productos?.id;
    if (id && !latestRefByProduct.has(id)) latestRefByProduct.set(id, row);
  });

  const seen = new Set<string>();
  const rows = ((board || []) as any[]).filter((row) => {
    const key = `${row.estaciones?.id || ''}:${row.productos?.id || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((row) => {
    const ref = latestRefByProduct.get(row.productos?.id);
    const comparable = Boolean(ref && ref.unidad === row.unidad && ref.moneda === row.moneda && ref.base_fiscal === row.base_fiscal);
    const amplitude = comparable ? Number(row.valor) - Number(ref.valor) : null;
    return { ...row, ref, comparable, amplitude };
  });

  return (
    <main className="portal-shell">
      <PortalSidebar empresaId={selectedId} active="precios" />
      <section className="workspace">
        <PortalTopbar selectedId={selectedId} available={available} userEmail={user.email} />
        <div className="content portal-content">
          <div className="module-heading">
            <div>
              <p className="eyebrow">PORTAL DEL CLIENTE · PRECIOS</p>
              <h1>Precios y estaciones</h1>
              <p className="muted">Consulta precios vigentes de la red y, cuando los datos son homologables, su referencia pública de refinería.</p>
            </div>
            <span className="neutral-badge">Sin mostrar margen interno de GESA</span>
          </div>

          <section className="card client-section-card methodology-card">
            <strong>Regla de comparación</strong>
            <p>Solo se calcula diferencia cuando producto, unidad, moneda y base fiscal son compatibles. Si no coinciden, la referencia se marca como “No comparable”.</p>
          </section>

          <section className="card table-card portal-table premium-table client-section-card">
            <div className="card-title-row"><div><p className="eyebrow">RED GESA</p><h2>Precios vigentes por estación</h2></div><span className="quality-badge">{rows.length} combinaciones</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Estación</th><th>Provincia</th><th>Producto</th><th>Precio pizarra</th><th>Unidad</th><th>Vigencia</th><th>Referencia refinería</th><th>Fuente</th><th>Diferencia</th><th>Comparabilidad</th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.estaciones?.nombre || '—'}</strong></td>
                      <td>{row.estaciones?.provincia || '—'}</td>
                      <td>{row.productos?.nombre || '—'}</td>
                      <td><strong>{money(row.valor)}</strong></td>
                      <td>{row.unidad}</td>
                      <td>{date(row.vigente_desde)}</td>
                      <td>{row.comparable ? money(row.ref?.valor) : '—'}</td>
                      <td>{row.ref?.fuente || '—'}</td>
                      <td>{row.comparable ? money(row.amplitude) : '—'}</td>
                      <td><span className={row.comparable ? 'quality-badge' : 'neutral-badge'}>{row.comparable ? 'COMPARABLE' : 'NO COMPARABLE'}</span></td>
                    </tr>
                  ))}
                  {!rows.length ? <tr><td className="empty-row" colSpan={10}>Todavía no hay precios de pizarra cargados.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
