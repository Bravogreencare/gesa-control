import PortalSidebar from '@/components/portal-sidebar';
import PortalTopbar from '@/components/portal-topbar';
import { getPortalContext } from '@/lib/portal/context';

function date(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-PE', { timeZone: 'America/Lima' });
}

export default async function AlertasPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams;
  const { supabase, user, available, selectedId } = await getPortalContext(params.empresa);

  const { data: alerts } = await supabase
    .from('alertas')
    .select('id,regla,severidad,estado,entidad_tipo,entidad_id,mensaje,creado_en,resuelto_en')
    .eq('empresa_id', selectedId)
    .order('creado_en', { ascending: false })
    .limit(300);

  const rows = (alerts || []) as any[];
  const open = rows.filter((r) => r.estado === 'ABIERTA').length;
  const high = rows.filter((r) => String(r.severidad).toUpperCase() === 'ALTA').length;
  const resolved = rows.filter((r) => r.estado !== 'ABIERTA').length;

  return (
    <main className="portal-shell">
      <PortalSidebar empresaId={selectedId} active="alertas" />
      <section className="workspace">
        <PortalTopbar selectedId={selectedId} available={available} userEmail={user.email} />
        <div className="content portal-content">
          <div className="module-heading">
            <div>
              <p className="eyebrow">PORTAL DEL CLIENTE · CONTROL</p>
              <h1>Alertas</h1>
              <p className="muted">Observaciones automáticas para ayudar a revisar datos y comportamientos fuera de regla.</p>
            </div>
            <span className="neutral-badge">Una alerta no equivale a fraude</span>
          </div>

          <section className="kpi-grid four">
            <article className="card kpi premium-kpi"><span>Alertas</span><strong>{rows.length}</strong><small>Histórico visible</small></article>
            <article className="card kpi premium-kpi"><span>Abiertas</span><strong>{open}</strong><small>Pendientes de revisión</small></article>
            <article className="card kpi premium-kpi"><span>Severidad alta</span><strong>{high}</strong><small>Prioridad de revisión</small></article>
            <article className="card kpi premium-kpi"><span>Cerradas</span><strong>{resolved}</strong><small>Observaciones resueltas</small></article>
          </section>

          <section className="card table-card portal-table premium-table client-section-card">
            <div className="card-title-row"><div><p className="eyebrow">OBSERVACIONES</p><h2>Historial de alertas</h2></div><span className="quality-badge">Reglas GESA CONTROL</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Fecha</th><th>Regla</th><th>Mensaje</th><th>Entidad</th><th>Severidad</th><th>Estado</th><th>Resuelto</th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{date(row.creado_en)}</td>
                      <td><strong>{row.regla}</strong></td>
                      <td>{row.mensaje}</td>
                      <td>{row.entidad_tipo || '—'}</td>
                      <td><span className={String(row.severidad).toUpperCase() === 'ALTA' ? 'status-chip danger' : 'neutral-badge'}>{row.severidad}</span></td>
                      <td><span className="quality-badge">{row.estado}</span></td>
                      <td>{date(row.resuelto_en)}</td>
                    </tr>
                  ))}
                  {!rows.length ? <tr><td className="empty-row" colSpan={7}>No hay alertas registradas para esta empresa.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
