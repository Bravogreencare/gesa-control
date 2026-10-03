import { Paperclip } from 'lucide-react';
import PortalSidebar from '@/components/portal-sidebar';
import PortalTopbar from '@/components/portal-topbar';
import { getPortalContext } from '@/lib/portal/context';

function money(value?: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value || 0));
}

function date(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
}

function label(value?: string | null) {
  return (value || '—').replaceAll('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

export default async function FacturacionPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams;
  const { supabase, user, available, selectedId, company, condition } = await getPortalContext(params.empresa);

  const { data: invoices } = await supabase
    .from('comprobantes')
    .select(`
      id,tipo,serie,numero,fecha_emision,periodo_desde,periodo_hasta,fecha_vencimiento,
      subtotal,igv,total,saldo_pendiente,estado,estado_cobranza,archivo_path,
      productos(id,nombre),
      despacho_documentos(despacho_id)
    `)
    .eq('empresa_id', selectedId)
    .order('fecha_emision', { ascending: false })
    .limit(150);

  const { data: supplies } = await supabase
    .from('abastecimientos')
    .select(`
      id,
      despachos(
        id,fecha_evento,total,numero_ticket_nota,numero_nota_despacho,numero_recibo,
        productos(id,nombre),
        despacho_documentos(comprobante_id)
      )
    `)
    .eq('empresa_id', selectedId)
    .limit(1000);

  const invoiceRows = (invoices || []) as any[];
  const pendingRows = ((supplies || []) as any[]).filter((row) => {
    const links = row.despachos?.despacho_documentos || [];
    return !links.length;
  });

  const pendingByProduct = new Map<string, { name: string; count: number; amount: number; from: string | null; to: string | null }>();
  pendingRows.forEach((row) => {
    const d = row.despachos;
    const productId = d?.productos?.id || 'SIN_PRODUCTO';
    const current = pendingByProduct.get(productId) || { name: d?.productos?.nombre || 'Sin clasificar', count: 0, amount: 0, from: null, to: null };
    current.count += 1;
    current.amount += Number(d?.total || 0);
    const day = d?.fecha_evento ? String(d.fecha_evento).slice(0, 10) : null;
    if (day && (!current.from || day < current.from)) current.from = day;
    if (day && (!current.to || day > current.to)) current.to = day;
    pendingByProduct.set(productId, current);
  });

  const totalPending = invoiceRows.reduce((sum, row) => sum + Number(row.saldo_pendiente || 0), 0);
  const billed = invoiceRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const consolidated = condition?.modalidad_facturacion === 'CONSOLIDADA' || company?.modalidad_facturacion === 'CONSOLIDADA';

  return (
    <main className="portal-shell">
      <PortalSidebar empresaId={selectedId} active="facturacion" />
      <section className="workspace">
        <PortalTopbar selectedId={selectedId} available={available} userEmail={user.email} />
        <div className="content portal-content">
          <div className="module-heading">
            <div>
              <p className="eyebrow">PORTAL DEL CLIENTE · FACTURACIÓN</p>
              <h1>Facturación y crédito</h1>
              <p className="muted">Consulta tus condiciones comerciales, cortes, facturas y tickets pendientes.</p>
            </div>
            <div className="module-heading-badges">
              <span className="quality-badge">{consolidated ? 'Consolidada' : 'Por abastecimiento'}</span>
              <span className="neutral-badge">Separación obligatoria por combustible</span>
            </div>
          </div>

          <section className="client-module-grid commercial-summary-grid">
            <article className="card client-info-card">
              <span className="client-card-label">Modalidad</span>
              <strong>{consolidated ? 'Facturación consolidada' : 'Factura por cada abastecimiento'}</strong>
              <small>{consolidated ? 'Los tickets se agrupan al corte, siempre por tipo de combustible.' : 'Cada Ticket / Nota de despacho genera su propio comprobante.'}</small>
            </article>
            <article className="card client-info-card">
              <span className="client-card-label">Fecha / regla de corte</span>
              <strong>{condition?.regla_corte || label(condition?.frecuencia_corte)}</strong>
              <small>{consolidated ? 'Condición definida por el agente comercial GESA.' : 'Emisión asociada al abastecimiento.'}</small>
            </article>
            <article className="card client-info-card">
              <span className="client-card-label">Condición de pago</span>
              <strong>{label(condition?.condicion_pago)}</strong>
              <small>{condition?.dias_credito != null ? `${condition.dias_credito} días de crédito` : 'Sin plazo de crédito configurado'}</small>
            </article>
            <article className="card client-info-card">
              <span className="client-card-label">Línea de crédito</span>
              <strong>{money(condition?.linea_credito)}</strong>
              <small>Configurada por el área comercial de GESA.</small>
            </article>
          </section>

          <section className="kpi-grid four">
            <article className="card kpi premium-kpi"><span>Facturado</span><strong>{money(billed)}</strong><small>Comprobantes visibles</small></article>
            <article className="card kpi premium-kpi"><span>Saldo pendiente</span><strong>{money(totalPending)}</strong><small>Cobranza registrada</small></article>
            <article className="card kpi premium-kpi"><span>Facturas</span><strong>{invoiceRows.length}</strong><small>Documentos emitidos</small></article>
            <article className="card kpi premium-kpi"><span>Tickets por facturar</span><strong>{pendingRows.length}</strong><small>{consolidated ? 'Esperando corte / consolidación' : 'Pendientes de comprobante'}</small></article>
          </section>

          {consolidated ? (
            <section className="card client-section-card">
              <div className="card-title-row">
                <div><p className="eyebrow">PRÓXIMA CONSOLIDACIÓN</p><h2>Tickets pendientes por combustible</h2></div>
                <span className="neutral-badge">Nunca se mezclan combustibles en una factura</span>
              </div>
              <div className="consolidation-grid">
                {Array.from(pendingByProduct.values()).map((group) => (
                  <article className="consolidation-card" key={group.name}>
                    <strong>{group.name}</strong>
                    <span>{group.count} tickets</span>
                    <b>{money(group.amount)}</b>
                    <small>{group.from && group.to ? `${date(group.from)} - ${date(group.to)}` : 'Sin rango disponible'}</small>
                  </article>
                ))}
                {!pendingRows.length ? <p className="muted">No hay tickets pendientes de consolidación.</p> : null}
              </div>
            </section>
          ) : null}

          <section className="card table-card portal-table premium-table client-section-card">
            <div className="card-title-row">
              <div><p className="eyebrow">COMPROBANTES</p><h2>Facturas emitidas</h2></div>
              <span className="quality-badge">1 factura = 1 tipo de combustible</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Factura</th><th>Emisión</th><th>Periodo</th><th>Combustible</th><th>Tickets</th><th>Neto</th><th>IGV</th><th>Total</th><th>Vence</th><th>Saldo</th><th>Estado</th><th>Archivo</th></tr>
                </thead>
                <tbody>
                  {invoiceRows.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.serie}-{row.numero}</strong></td>
                      <td>{date(row.fecha_emision)}</td>
                      <td>{row.periodo_desde || row.periodo_hasta ? `${date(row.periodo_desde)} - ${date(row.periodo_hasta)}` : '—'}</td>
                      <td>{row.productos?.nombre || '—'}</td>
                      <td>{row.despacho_documentos?.length || 0}</td>
                      <td>{money(row.subtotal)}</td>
                      <td>{money(row.igv)}</td>
                      <td><strong>{money(row.total)}</strong></td>
                      <td>{date(row.fecha_vencimiento)}</td>
                      <td>{money(row.saldo_pendiente)}</td>
                      <td><span className="quality-badge">{label(row.estado_cobranza || row.estado)}</span></td>
                      <td>{row.archivo_path ? <span className="attachment-link static"><Paperclip size={13} /> Factura</span> : <span className="no-attachment">Pendiente</span>}</td>
                    </tr>
                  ))}
                  {!invoiceRows.length ? <tr><td className="empty-row" colSpan={12}>Todavía no hay comprobantes emitidos para esta empresa.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
