import Link from 'next/link';
import { redirect } from 'next/navigation';
import CommercialShell from '@/components/commercial-shell';
import { createClient } from '@/lib/supabase/server';

function money(value: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 2 }).format(value || 0);
}

function dateLabel(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function CommercialCutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('usuarios_internos_gesa')
    .select('rol,nombre,activo')
    .eq('usuario_id', user.id)
    .eq('activo', true)
    .maybeSingle();
  if (!profile || !['COMERCIAL', 'ADMIN_GESA'].includes(profile.rol)) redirect('/portal');

  const [{ data: companies }, { data: conditions }, { data: supplies }] = await Promise.all([
    supabase.from('empresas').select('id,ruc,razon_social').eq('estado', 'ACTIVA'),
    supabase.from('condiciones_comerciales').select('empresa_id,modalidad_facturacion,frecuencia_corte,regla_corte,condicion_pago,linea_credito,dias_credito,agente_comercial').eq('estado', 'VIGENTE').eq('modalidad_facturacion', 'CONSOLIDADA'),
    supabase.from('abastecimientos').select(`
      id,empresa_id,
      despachos(
        id,fecha_evento,numero_recibo,numero_nota_despacho,cantidad,unidad,total,
        productos(id,nombre),
        despacho_documentos(comprobante_id)
      )
    `).order('creado_en', { ascending: true }).limit(5000),
  ]);

  const companyById = new Map((companies || []).map((c: any) => [c.id, c]));
  const conditionByCompany = new Map((conditions || []).map((c: any) => [c.empresa_id, c]));
  const groups = new Map<string, any>();

  for (const row of (supplies || []) as any[]) {
    const condition = conditionByCompany.get(row.empresa_id);
    if (!condition) continue;
    const d = row.despachos;
    if (!d || (d.despacho_documentos || []).length) continue;
    const product = d.productos;
    const productId = product?.id || 'sin-producto';
    const key = `${row.empresa_id}::${productId}`;
    const current = groups.get(key) || {
      empresaId: row.empresa_id,
      productId,
      productName: product?.nombre || 'Sin producto',
      unit: d.unidad || '',
      tickets: 0,
      quantity: 0,
      amount: 0,
      firstDate: null as string | null,
      lastDate: null as string | null,
      condition,
    };
    current.tickets += 1;
    current.quantity += Number(d.cantidad || 0);
    current.amount += Number(d.total || 0);
    if (d.fecha_evento && (!current.firstDate || d.fecha_evento < current.firstDate)) current.firstDate = d.fecha_evento;
    if (d.fecha_evento && (!current.lastDate || d.fecha_evento > current.lastDate)) current.lastDate = d.fecha_evento;
    groups.set(key, current);
  }

  const rows = Array.from(groups.values()).sort((a, b) => b.amount - a.amount);
  const totalTickets = rows.reduce((sum, row) => sum + row.tickets, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <CommercialShell active="cortes" displayName={profile.nombre}>
      <section className="commercial-hero compact-commercial-hero">
        <div>
          <p className="eyebrow">FACTURACIÓN CONSOLIDADA</p>
          <h1>Cortes por facturar</h1>
          <p>Vista de tickets todavía no asociados a una factura. La separación por combustible se aplica antes de cualquier consolidación.</p>
        </div>
        <Link className="commercial-secondary-link light" href="/comercial">← Volver a clientes</Link>
      </section>

      <section className="commercial-kpis three">
        <article><span>Grupos pendientes</span><strong>{rows.length}</strong><small>Cliente + combustible</small></article>
        <article><span>Tickets pendientes</span><strong>{totalTickets}</strong><small>Sin factura asociada</small></article>
        <article><span>Importe pendiente</span><strong>{money(totalAmount)}</strong><small>Acumulado de tickets</small></article>
      </section>

      <section className="commercial-card">
        <div className="commercial-card-head">
          <div>
            <p className="eyebrow">COLA DE CORTE</p>
            <h2>Tickets pendientes por cliente y combustible</h2>
            <p>Esta vista no emite facturas todavía; prepara el control para que el proceso de facturación respete la condición comercial vigente.</p>
          </div>
        </div>
        <div className="commercial-table-wrap">
          <table className="commercial-table">
            <thead><tr><th>Cliente</th><th>Combustible</th><th>Periodo acumulado</th><th>Corte</th><th>Tickets</th><th>Cantidad</th><th>Importe</th><th></th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const company = companyById.get(row.empresaId) as any;
                return (
                  <tr key={`${row.empresaId}-${row.productId}`}>
                    <td><strong>{company?.razon_social || 'Cliente'}</strong><small>{company?.ruc || ''}</small></td>
                    <td><span className="commercial-status blue">{row.productName}</span></td>
                    <td>{dateLabel(row.firstDate)} → {dateLabel(row.lastDate)}</td>
                    <td>{row.condition.frecuencia_corte || '—'}{row.condition.regla_corte ? <small>{row.condition.regla_corte}</small> : null}</td>
                    <td><strong>{row.tickets}</strong></td>
                    <td>{row.quantity.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} {row.unit}</td>
                    <td><strong>{money(row.amount)}</strong></td>
                    <td><Link className="commercial-primary-link" href={`/comercial/clientes/${row.empresaId}`}>Ver condición →</Link></td>
                  </tr>
                );
              })}
              {!rows.length ? <tr><td colSpan={8} className="empty-row">No hay tickets pendientes para clientes con facturación consolidada.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </CommercialShell>
  );
}
