import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function money(value: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value || 0);
}

export default async function SupplyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const { data } = await supabase
    .from('abastecimientos')
    .select(`
      id,kilometraje,estado_conciliacion,creado_en,
      empresas(id,ruc,razon_social),
      vehiculos(id,placa,marca,modelo,tipo),
      viajes(id,codigo_corto,periodo,origen,destino),
      despachos(
        id,id_externo,numero_recibo,fecha_evento,turno,isla,lado,manguera,cantidad,unidad,precio_unitario,total,moneda,
        estaciones(id,nombre,direccion,distrito,provincia,departamento),
        productos(id,nombre,codigo),
        despacho_documentos(comprobantes(id,ruc_emisor,ruc_receptor,tipo,serie,numero,fecha_emision,subtotal,igv,total,moneda,estado))
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (!data) notFound();
  const row = data as any;
  const d = row.despachos;
  const doc = d?.despacho_documentos?.[0]?.comprobantes;

  return (
    <main className="detail-shell branded-detail-shell">
      <div className="detail-top branded-detail-top">
        <Link href="/portal">← Volver al portal</Link>
        <div className="detail-logo gesa-logo-embedded" role="img" aria-label="GESA" />
      </div>
      <section className="detail-card branded-detail-card">
        <div className="detail-header branded-detail-header">
          <div><p className="eyebrow">DETALLE DE ABASTECIMIENTO</p><h1>{row.vehiculos?.placa || 'Vehículo'}</h1><p>{row.empresas?.razon_social}</p></div>
          <span className="quality-badge">{row.estado_conciliacion}</span>
        </div>

        <div className="detail-grid">
          <article><span>Fecha / hora</span><strong>{d?.fecha_evento ? new Date(d.fecha_evento).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : '—'}</strong></article>
          <article><span>Estación</span><strong>{d?.estaciones?.nombre || '—'}</strong></article>
          <article><span>Kilometraje</span><strong>{row.kilometraje ?? '—'}</strong></article>
          <article><span>Viaje</span><strong>{row.viajes?.codigo_corto || 'Sin viaje'}</strong></article>
          <article><span>Producto</span><strong>{d?.productos?.nombre || '—'}</strong></article>
          <article><span>Cantidad</span><strong>{d?.cantidad || 0} {d?.unidad || ''}</strong></article>
          <article><span>Precio unitario</span><strong>{money(Number(d?.precio_unitario || 0))}</strong></article>
          <article><span>Importe</span><strong>{money(Number(d?.total || 0))}</strong></article>
        </div>

        <div className="detail-columns">
          <section>
            <h2>Datos del despacho</h2>
            <dl>
              <div><dt>Recibo</dt><dd>{d?.numero_recibo || '—'}</dd></div>
              <div><dt>ID externo</dt><dd>{d?.id_externo || '—'}</dd></div>
              <div><dt>Turno</dt><dd>{d?.turno || '—'}</dd></div>
              <div><dt>Isla</dt><dd>{d?.isla || '—'}</dd></div>
              <div><dt>Lado / manguera</dt><dd>{[d?.lado,d?.manguera].filter(Boolean).join(' / ') || '—'}</dd></div>
              <div><dt>Dirección</dt><dd>{d?.estaciones?.direccion || '—'}</dd></div>
            </dl>
          </section>
          <section>
            <h2>Comprobante asociado</h2>
            {doc ? <dl>
              <div><dt>Documento</dt><dd>{doc.serie}-{doc.numero}</dd></div>
              <div><dt>Tipo</dt><dd>{doc.tipo}</dd></div>
              <div><dt>RUC emisor</dt><dd>{doc.ruc_emisor}</dd></div>
              <div><dt>RUC receptor</dt><dd>{doc.ruc_receptor}</dd></div>
              <div><dt>Subtotal</dt><dd>{money(Number(doc.subtotal || 0))}</dd></div>
              <div><dt>IGV</dt><dd>{money(Number(doc.igv || 0))}</dd></div>
              <div><dt>Total</dt><dd><strong>{money(Number(doc.total || 0))}</strong></dd></div>
            </dl> : <p className="muted">El despacho todavía no tiene un comprobante conciliado.</p>}
          </section>
        </div>
      </section>
    </main>
  );
}
