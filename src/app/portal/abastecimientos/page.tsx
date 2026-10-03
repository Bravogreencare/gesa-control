import Link from 'next/link';
import { Paperclip } from 'lucide-react';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/logout-button';
import SupplyInlineEditor from '@/components/supply-inline-editor';
import { createClient } from '@/lib/supabase/server';

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: memberships } = await supabase
    .from('membresias')
    .select('empresa_id, rol, empresas(id,ruc,razon_social,nombre_comercial,modalidad_facturacion,periodicidad_facturacion,etiqueta_control_operativo)')
    .eq('activo', true);

  const available = (memberships || []) as any[];
  if (!available.length) redirect('/portal');

  const params = await searchParams;
  const selectedId = available.some((m) => m.empresa_id === params.empresa)
    ? params.empresa!
    : available[0].empresa_id;
  const membership = available.find((m) => m.empresa_id === selectedId)!;
  const company = membership.empresas;
  const controlLabel = company?.etiqueta_control_operativo === 'CECO' ? 'CECO' : 'Viaje';
  const consolidatedBilling = company?.modalidad_facturacion === 'CONSOLIDADA';
  const canEdit = membership.rol !== 'AUDITOR';

  const { data: supplies } = await supabase
    .from('abastecimientos')
    .select(`
      id, kilometraje, documento_identidad, referencia_control, estado_conciliacion, creado_en, editado_cliente_en,
      vehiculos(id,placa,marca,modelo),
      viajes(id,codigo_corto,periodo),
      despachos(
        id,fecha_evento,numero_recibo,numero_nota_despacho,archivo_nota_despacho_path,cantidad,unidad,precio_unitario,total,moneda,
        estaciones(id,nombre,provincia), productos(id,nombre),
        despacho_documentos(comprobantes(id,tipo,serie,numero,total,fecha_emision,archivo_path))
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
    const haystack = [
      row.documento_identidad,
      row.vehiculos?.placa,
      row.referencia_control,
      row.viajes?.codigo_corto,
      d?.estaciones?.nombre,
      d?.estaciones?.provincia,
      d?.productos?.nombre,
      d?.numero_recibo,
      d?.numero_nota_despacho,
      doc ? `${doc.serie}-${doc.numero}` : '',
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });

  const totalSpent = rows.reduce((acc, row) => acc + Number(row.despachos?.total || 0), 0);
  const uniqueVehicles = new Set(rows.map((r) => r.vehiculos?.id).filter(Boolean)).size;
  const invoicedRows = rows.filter((row) => row.despachos?.despacho_documentos?.[0]?.comprobantes).length;

  return (
    <main className="portal-shell">
      <aside className="portal-sidebar">
        <div className="official-brand">
          <div className="sidebar-logo-wrap">
            <img src="/gesa-logo-clean.svg" alt="GESA - Tu estación de confianza" className="gesa-logo" />
          </div>
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
          <div className="module-heading abastecimientos-heading">
            <div>
              <p className="eyebrow">CONTROL OPERATIVO</p>
              <h1>Abastecimientos</h1>
              <p className="muted">{company?.razon_social} · RUC {company?.ruc}</p>
            </div>
            <div className="module-heading-badges">
              <span className="quality-badge">{rows.length} registros visibles</span>
              <span className="neutral-badge">{consolidatedBilling ? 'Facturación consolidada' : 'Facturación por consumo'}</span>
              <span className="neutral-badge">Control por {controlLabel}</span>
            </div>
          </div>

          <section className="kpi-grid four">
            <article className="card kpi premium-kpi"><span>Importe</span><strong>{money(totalSpent)}</strong><small>Resultado filtrado</small></article>
            <article className="card kpi premium-kpi"><span>Abastecimientos</span><strong>{rows.length}</strong><small>Registros visibles</small></article>
            <article className="card kpi premium-kpi"><span>Vehículos</span><strong>{uniqueVehicles}</strong><small>Placas identificadas</small></article>
            <article className="card kpi premium-kpi"><span>Facturados</span><strong>{invoicedRows}</strong><small>{consolidatedBilling ? 'Despachos ya consolidados' : 'Consumos con comprobante'}</small></article>
          </section>

          <section className="card module-filter-card">
            <form method="get" className="module-filters">
              <input type="hidden" name="empresa" value={selectedId} />
              <label>
                Buscar
                <input name="q" defaultValue={params.q || ''} placeholder={`Placa, DNI, ${controlLabel.toLowerCase()}, ticket, nota o factura`} />
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
                <p className="table-helper">El ticket y la nota identifican el despacho. La factura puede emitirse por consumo o consolidar varios despachos según la configuración del cliente.</p>
              </div>
              <span className="quality-badge">Fuente transaccional GESA</span>
            </div>
            <div className="table-wrap abastecimientos-table-wrap">
              <table className="abastecimientos-table">
                <thead>
                  <tr>
                    <th>Fecha/hora</th>
                    <th>DNI</th>
                    <th>Placa</th>
                    <th>Estación</th>
                    <th>Combustible</th>
                    <th>Und</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                    <th>Ticket</th>
                    <th>Nota despacho</th>
                    <th>{controlLabel}</th>
                    <th>KM</th>
                    <th>Factura / comprobante</th>
                    <th>Adjuntos</th>
                    <th>Estado</th>
                    <th>Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const d = row.despachos;
                    const doc = d?.despacho_documentos?.[0]?.comprobantes;
                    const controlValue = row.referencia_control || row.viajes?.codigo_corto || '';
                    const facturaLabel = doc
                      ? `${doc.serie}-${doc.numero}`
                      : consolidatedBilling
                        ? 'Pend. consolidación'
                        : 'Pendiente';
                    const hasNoteAttachment = Boolean(d?.archivo_nota_despacho_path);
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
                        <td>{d?.numero_recibo || '—'}</td>
                        <td>{d?.numero_nota_despacho || '—'}</td>
                        <td>{controlValue || '—'}</td>
                        <td>{row.kilometraje ?? '—'}</td>
                        <td><span className={doc ? 'doc-number' : 'doc-pending'}>{facturaLabel}</span></td>
                        <td>
                          <div className="attachment-stack">
                            {hasNoteAttachment ? (
                              isHttpUrl(d.archivo_nota_despacho_path)
                                ? <a href={d.archivo_nota_despacho_path} target="_blank" rel="noreferrer" className="attachment-link"><Paperclip size={13} /> Nota</a>
                                : <span className="attachment-link static"><Paperclip size={13} /> Nota</span>
                            ) : null}
                            {hasInvoiceAttachment ? (
                              isHttpUrl(doc.archivo_path)
                                ? <a href={doc.archivo_path} target="_blank" rel="noreferrer" className="attachment-link"><Paperclip size={13} /> Factura</a>
                                : <span className="attachment-link static"><Paperclip size={13} /> Factura</span>
                            ) : null}
                            {!hasNoteAttachment && !hasInvoiceAttachment ? <span className="no-attachment">Sin adjunto</span> : null}
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
                  {!rows.length ? <tr><td colSpan={17} className="empty-row">No hay abastecimientos que coincidan con los filtros seleccionados.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
