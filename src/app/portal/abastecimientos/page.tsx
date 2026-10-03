import Link from 'next/link';
import { Paperclip } from 'lucide-react';
import LogoutButton from '@/components/logout-button';
import PortalSidebar from '@/components/portal-sidebar';
import SupplyInlineEditor from '@/components/supply-inline-editor';
import { getPortalContext } from '@/lib/portal/context';

function money(value: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value || 0);
}

function number(value: number, digits = 3) {
  return new Intl.NumberFormat('es-PE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value || 0);
}

function isHttpUrl(value?: string | null) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export default async function AbastecimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string; q?: string; desde?: string; hasta?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user, available, selectedId, membership, company, condition } = await getPortalContext(params.empresa);

  const controlLabel = company?.etiqueta_control_operativo === 'CECO' ? 'CECO' : 'Viaje';
  const consolidatedBilling = condition?.modalidad_facturacion === 'CONSOLIDADA' || company?.modalidad_facturacion === 'CONSOLIDADA';
  const canEdit = membership.rol !== 'AUDITOR';

  const { data: supplies } = await supabase
    .from('abastecimientos')
    .select(`
      id, kilometraje, documento_identidad, referencia_control, estado_conciliacion, creado_en, editado_cliente_en,
      vehiculos(id,placa,marca,modelo),
      viajes(id,codigo_corto,periodo),
      despachos(
        id,fecha_evento,numero_recibo,numero_nota_despacho,numero_ticket_nota,
        archivo_nota_despacho_path,archivo_ticket_nota_path,cantidad,unidad,precio_unitario,total,moneda,
        estaciones(id,nombre,provincia), productos(id,nombre),
        despacho_documentos(comprobantes(id,tipo,serie,numero,total,fecha_emision,archivo_path,estado_cobranza))
      )
    `)
    .eq('empresa_id', selectedId)
    .order('creado_en', { ascending: false })
    .limit(500);

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
    const ticketNota = d?.numero_ticket_nota || d?.numero_nota_despacho || d?.numero_recibo;
    const haystack = [
      row.documento_identidad,
      row.vehiculos?.placa,
      row.referencia_control,
      row.viajes?.codigo_corto,
      d?.estaciones?.nombre,
      d?.estaciones?.provincia,
      d?.productos?.nombre,
      ticketNota,
      doc ? `${doc.serie}-${doc.numero}` : '',
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });

  const totalSpent = rows.reduce((acc, row) => acc + Number(row.despachos?.total || 0), 0);
  const uniqueVehicles = new Set(rows.map((r) => r.vehiculos?.id).filter(Boolean)).size;
  const invoicedRows = rows.filter((row) => row.despachos?.despacho_documentos?.[0]?.comprobantes).length;

  return (
    <main className="portal-shell">
      <PortalSidebar empresaId={selectedId} active="abastecimientos" />

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
          <div className="module-heading abastecimientos-heading">
            <div>
              <p className="eyebrow">PORTAL DEL CLIENTE · CONTROL OPERATIVO</p>
              <h1>Abastecimientos</h1>
              <p className="muted">{company?.razon_social} · RUC {company?.ruc}</p>
            </div>
            <div className="module-heading-badges">
              <span className="quality-badge">{rows.length} registros visibles</span>
              <span className="neutral-badge">{consolidatedBilling ? 'Facturación consolidada' : 'Factura por abastecimiento'}</span>
              <span className="neutral-badge">1 factura = 1 combustible</span>
              <span className="neutral-badge">Control por {controlLabel}</span>
            </div>
          </div>

          <section className="kpi-grid four">
            <article className="card kpi premium-kpi"><span>Importe</span><strong>{money(totalSpent)}</strong><small>Resultado filtrado</small></article>
            <article className="card kpi premium-kpi"><span>Abastecimientos</span><strong>{rows.length}</strong><small>Tickets / notas visibles</small></article>
            <article className="card kpi premium-kpi"><span>Vehículos</span><strong>{uniqueVehicles}</strong><small>Placas identificadas</small></article>
            <article className="card kpi premium-kpi"><span>Con factura</span><strong>{invoicedRows}</strong><small>{consolidatedBilling ? 'Tickets ya incluidos en factura' : 'Abastecimientos facturados'}</small></article>
          </section>

          <section className="card module-filter-card">
            <form method="get" className="module-filters">
              <input type="hidden" name="empresa" value={selectedId} />
              <label>
                Buscar
                <input name="q" defaultValue={params.q || ''} placeholder={`Placa, DNI, ${controlLabel.toLowerCase()}, ticket/nota o factura`} />
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

          <section className="card table-card portal-table premium-table abastecimientos-card">
            <div className="card-title-row">
              <div>
                <p className="eyebrow">HISTORIAL</p>
                <h2>Registro de abastecimientos</h2>
                <p className="table-helper">Cada consumo genera un único Ticket / Nota de despacho. La factura puede emitirse por ese abastecimiento o consolidar varios tickets del mismo combustible según la condición comercial definida por GESA.</p>
              </div>
              <span className="quality-badge">Fuente transaccional GESA</span>
            </div>
            <div className="table-wrap abastecimientos-table-wrap">
              <table className="abastecimientos-table">
                <thead>
                  <tr>
                    <th>Fecha/hora</th>
                    <th>D. identidad</th>
                    <th>Placa</th>
                    <th>Estación</th>
                    <th>Combustible</th>
                    <th>Und</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                    <th>Ticket / Nota</th>
                    <th>{controlLabel}</th>
                    <th>KM</th>
                    <th>Factura / comprobante</th>
                    <th>Documentos</th>
                    <th>Estado</th>
                    <th>Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const d = row.despachos;
                    const doc = d?.despacho_documentos?.[0]?.comprobantes;
                    const controlValue = row.referencia_control || row.viajes?.codigo_corto || '';
                    const ticketNota = d?.numero_ticket_nota || d?.numero_nota_despacho || d?.numero_recibo || '—';
                    const facturaLabel = doc
                      ? `${doc.serie}-${doc.numero}`
                      : consolidatedBilling
                        ? 'Pend. consolidación'
                        : 'Pendiente';
                    const ticketFile = d?.archivo_ticket_nota_path || d?.archivo_nota_despacho_path;
                    const hasTicketAttachment = Boolean(ticketFile);
                    const hasInvoiceAttachment = Boolean(doc?.archivo_path);

                    return (
                      <tr key={row.id}>
                        <td>{d?.fecha_evento ? new Date(d.fecha_evento).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : '—'}</td>
                        <td>{row.documento_identidad || '—'}</td>
                        <td><strong>{row.vehiculos?.placa || '—'}</strong></td>
                        <td>
                          <strong className="station-name">{d?.estaciones?.nombre || '—'}</strong>
                          {d?.estaciones?.provincia ? <small className="cell-subtext">{d.estaciones.provincia}</small> : null}
                        </td>
                        <td>{d?.productos?.nombre || '—'}</td>
                        <td>{d?.unidad || '—'}</td>
                        <td>{money(Number(d?.precio_unitario || 0))}</td>
                        <td>{number(Number(d?.cantidad || 0))}</td>
                        <td><strong>{money(Number(d?.total || 0))}</strong></td>
                        <td><strong>{ticketNota}</strong></td>
                        <td>{controlValue || '—'}</td>
                        <td>{row.kilometraje ?? '—'}</td>
                        <td><span className={doc ? 'doc-number' : 'doc-pending'}>{facturaLabel}</span></td>
                        <td>
                          <div className="attachment-stack">
                            {hasTicketAttachment ? (
                              isHttpUrl(ticketFile)
                                ? <a href={ticketFile} target="_blank" rel="noreferrer" className="attachment-link"><Paperclip size={13} /> Ticket / Nota</a>
                                : <span className="attachment-link static"><Paperclip size={13} /> Ticket / Nota</span>
                            ) : null}
                            {hasInvoiceAttachment ? (
                              isHttpUrl(doc.archivo_path)
                                ? <a href={doc.archivo_path} target="_blank" rel="noreferrer" className="attachment-link"><Paperclip size={13} /> Factura</a>
                                : <span className="attachment-link static"><Paperclip size={13} /> Factura</span>
                            ) : null}
                            {!hasTicketAttachment && !hasInvoiceAttachment ? <span className="no-attachment">Sin adjunto</span> : null}
                          </div>
                        </td>
                        <td><span className="quality-badge">{row.estado_conciliacion || 'PENDIENTE'}</span></td>
                        <td>
                          <SupplyInlineEditor
                            abastecimientoId={row.id}
                            documentoIdentidad={row.documento_identidad}
                            referenciaControl={controlValue}
                            kilometraje={row.kilometraje}
                            controlLabel={controlLabel}
                            canEdit={canEdit}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {!rows.length ? <tr><td colSpan={16} className="empty-row">No hay abastecimientos que coincidan con los filtros seleccionados.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
