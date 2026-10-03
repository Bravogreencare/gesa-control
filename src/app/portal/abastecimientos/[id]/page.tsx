import Link from 'next/link';
import { Paperclip } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import SupplyInlineEditor from '@/components/supply-inline-editor';
import { createClient } from '@/lib/supabase/server';

function money(value: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value || 0);
}

function isHttpUrl(value?: string | null) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export default async function SupplyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const { data } = await supabase
    .from('abastecimientos')
    .select(`
      id,kilometraje,documento_identidad,referencia_control,estado_conciliacion,creado_en,editado_cliente_en,
      empresas(id,ruc,razon_social,modalidad_facturacion,periodicidad_facturacion,etiqueta_control_operativo),
      vehiculos(id,placa,marca,modelo,tipo),
      viajes(id,codigo_corto,periodo,origen,destino),
      despachos(
        id,id_externo,numero_recibo,numero_nota_despacho,archivo_nota_despacho_path,fecha_evento,turno,isla,lado,manguera,cantidad,unidad,precio_unitario,total,moneda,
        estaciones(id,nombre,direccion,distrito,provincia,departamento),
        productos(id,nombre,codigo),
        despacho_documentos(comprobantes(id,ruc_emisor,ruc_receptor,tipo,serie,numero,fecha_emision,subtotal,igv,total,moneda,estado,archivo_path))
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (!data) notFound();
  const row = data as any;
  const d = row.despachos;
  const doc = d?.despacho_documentos?.[0]?.comprobantes;
  const controlLabel = row.empresas?.etiqueta_control_operativo === 'CECO' ? 'CECO' : 'Viaje';
  const controlValue = row.referencia_control || row.viajes?.codigo_corto || '';
  const consolidatedBilling = row.empresas?.modalidad_facturacion === 'CONSOLIDADA';

  const { data: membership } = await supabase
    .from('membresias')
    .select('rol')
    .eq('empresa_id', row.empresas?.id)
    .eq('activo', true)
    .maybeSingle();
  const canEdit = membership?.rol !== 'AUDITOR';

  return (
    <main className="detail-shell branded-detail-shell">
      <div className="detail-top branded-detail-top">
        <Link href={`/portal/abastecimientos?empresa=${row.empresas?.id}`}>← Volver a abastecimientos</Link>
        <img src="/gesa-logo-clean.svg" alt="GESA" className="detail-logo" />
      </div>
      <section className="detail-card branded-detail-card">
        <div className="detail-header branded-detail-header">
          <div>
            <p className="eyebrow">DETALLE DE ABASTECIMIENTO</p>
            <h1>{row.vehiculos?.placa || 'Vehículo'}</h1>
            <p>{row.empresas?.razon_social}</p>
          </div>
          <div className="detail-status-stack">
            <span className="quality-badge">{row.estado_conciliacion}</span>
            <span className="neutral-badge">{consolidatedBilling ? 'Facturación consolidada' : 'Facturación por consumo'}</span>
          </div>
        </div>

        <div className="detail-grid">
          <article><span>Fecha / hora</span><strong>{d?.fecha_evento ? new Date(d.fecha_evento).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : '—'}</strong></article>
          <article><span>DNI / documento</span><strong>{row.documento_identidad || '—'}</strong></article>
          <article><span>Estación</span><strong>{d?.estaciones?.nombre || '—'}</strong></article>
          <article><span>Kilometraje</span><strong>{row.kilometraje ?? '—'}</strong></article>
          <article><span>{controlLabel}</span><strong>{controlValue || `Sin ${controlLabel.toLowerCase()}`}</strong></article>
          <article><span>Producto</span><strong>{d?.productos?.nombre || '—'}</strong></article>
          <article><span>Cantidad</span><strong>{d?.cantidad || 0} {d?.unidad || ''}</strong></article>
          <article><span>Precio unitario</span><strong>{money(Number(d?.precio_unitario || 0))}</strong></article>
          <article><span>Importe</span><strong>{money(Number(d?.total || 0))}</strong></article>
          <article className="detail-edit-tile">
            <span>Corrección cliente</span>
            <SupplyInlineEditor
              abastecimientoId={row.id}
              documentoIdentidad={row.documento_identidad}
              referenciaControl={controlValue}
              kilometraje={row.kilometraje}
              controlLabel={controlLabel}
              canEdit={canEdit}
            />
          </article>
        </div>

        <div className="detail-columns">
          <section>
            <h2>Datos del despacho</h2>
            <dl>
              <div><dt>Ticket / recibo</dt><dd>{d?.numero_recibo || '—'}</dd></div>
              <div><dt>Nota de despacho</dt><dd>{d?.numero_nota_despacho || '—'}</dd></div>
              <div><dt>ID externo</dt><dd>{d?.id_externo || '—'}</dd></div>
              <div><dt>Turno</dt><dd>{d?.turno || '—'}</dd></div>
              <div><dt>Isla</dt><dd>{d?.isla || '—'}</dd></div>
              <div><dt>Lado / manguera</dt><dd>{[d?.lado,d?.manguera].filter(Boolean).join(' / ') || '—'}</dd></div>
              <div><dt>Dirección</dt><dd>{d?.estaciones?.direccion || '—'}</dd></div>
            </dl>
            {d?.archivo_nota_despacho_path ? (
              <div className="detail-attachment">
                {isHttpUrl(d.archivo_nota_despacho_path)
                  ? <a href={d.archivo_nota_despacho_path} target="_blank" rel="noreferrer"><Paperclip size={15} /> Ver nota de despacho</a>
                  : <span><Paperclip size={15} /> Nota de despacho adjunta</span>}
              </div>
            ) : null}
          </section>
          <section>
            <h2>Factura / comprobante</h2>
            {doc ? <>
              <dl>
                <div><dt>Documento</dt><dd>{doc.serie}-{doc.numero}</dd></div>
                <div><dt>Tipo</dt><dd>{doc.tipo}</dd></div>
                <div><dt>RUC emisor</dt><dd>{doc.ruc_emisor}</dd></div>
                <div><dt>RUC receptor</dt><dd>{doc.ruc_receptor}</dd></div>
                <div><dt>Subtotal</dt><dd>{money(Number(doc.subtotal || 0))}</dd></div>
                <div><dt>IGV</dt><dd>{money(Number(doc.igv || 0))}</dd></div>
                <div><dt>Total</dt><dd><strong>{money(Number(doc.total || 0))}</strong></dd></div>
              </dl>
              {doc.archivo_path ? (
                <div className="detail-attachment">
                  {isHttpUrl(doc.archivo_path)
                    ? <a href={doc.archivo_path} target="_blank" rel="noreferrer"><Paperclip size={15} /> Ver comprobante</a>
                    : <span><Paperclip size={15} /> Comprobante adjunto</span>}
                </div>
              ) : null}
            </> : <p className="muted">{consolidatedBilling ? 'Este despacho está pendiente de incorporarse a una factura consolidada.' : 'El despacho todavía no tiene un comprobante asociado.'}</p>}
          </section>
        </div>
      </section>
    </main>
  );
}
