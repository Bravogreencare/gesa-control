import Link from 'next/link';
import { redirect } from 'next/navigation';
import CommercialShell from '@/components/commercial-shell';
import { createClient } from '@/lib/supabase/server';

function money(value?: number | null) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 2 }).format(Number(value || 0));
}

function modalityLabel(value?: string | null) {
  return value === 'CONSOLIDADA' ? 'Consolidada' : 'Por abastecimiento';
}

function cutLabel(value?: string | null, rule?: string | null) {
  if (!value || value === 'INMEDIATA') return 'Inmediata';
  const labels: Record<string, string> = { DIARIA: 'Diaria', SEMANAL: 'Semanal', QUINCENAL: 'Quincenal', MENSUAL: 'Mensual', PERSONALIZADA: 'Personalizada' };
  return rule ? `${labels[value] || value} · ${rule}` : (labels[value] || value);
}

export default async function CommercialPage() {
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

  const [{ data: companies }, { data: conditions }] = await Promise.all([
    supabase.from('empresas').select('id,ruc,razon_social,nombre_comercial,estado,modalidad_facturacion,periodicidad_facturacion,separacion_factura_por_producto').eq('estado', 'ACTIVA').order('razon_social'),
    supabase.from('condiciones_comerciales').select('id,empresa_id,modalidad_facturacion,frecuencia_corte,regla_corte,condicion_pago,linea_credito,dias_credito,moneda,separacion_por_producto,agente_comercial,vigente_desde,estado').eq('estado', 'VIGENTE'),
  ]);

  const currentByCompany = new Map((conditions || []).map((item: any) => [item.empresa_id, item]));
  const rows = (companies || []).map((company: any) => ({ company, condition: currentByCompany.get(company.id) as any }));
  const consolidated = rows.filter((row) => row.condition?.modalidad_facturacion === 'CONSOLIDADA' || row.company.modalidad_facturacion === 'CONSOLIDADA').length;
  const credit = rows.filter((row) => row.condition?.condicion_pago === 'CREDITO').length;
  const totalCredit = rows.reduce((sum, row) => sum + Number(row.condition?.linea_credito || 0), 0);

  return (
    <CommercialShell active="inicio" displayName={profile.nombre}>
      <section className="commercial-hero">
        <div>
          <p className="eyebrow">GESTIÓN COMERCIAL GESA</p>
          <h1>Clientes y condiciones comerciales</h1>
          <p>Configura cómo factura cada cliente, sus fechas de corte y las condiciones de crédito. El cliente solo consulta estas reglas desde su portal.</p>
        </div>
        <span className="commercial-rule-badge">Separación por combustible obligatoria</span>
      </section>

      <section className="commercial-kpis">
        <article><span>Clientes activos</span><strong>{rows.length}</strong><small>Empresas habilitadas</small></article>
        <article><span>Con facturación consolidada</span><strong>{consolidated}</strong><small>Cortes programados</small></article>
        <article><span>Clientes a crédito</span><strong>{credit}</strong><small>Condición comercial vigente</small></article>
        <article><span>Líneas aprobadas</span><strong>{money(totalCredit)}</strong><small>Suma de líneas configuradas</small></article>
      </section>

      <section className="commercial-card" id="clientes">
        <div className="commercial-card-head">
          <div>
            <p className="eyebrow">CARTERA</p>
            <h2>Clientes GESA</h2>
            <p>La modalidad y el crédito son definidos por el equipo comercial, no por el usuario cliente.</p>
          </div>
          <Link className="commercial-secondary-link" href="/comercial/cortes">Ver cortes pendientes →</Link>
        </div>

        <div className="commercial-table-wrap">
          <table className="commercial-table">
            <thead>
              <tr><th>Cliente</th><th>RUC</th><th>Facturación</th><th>Corte</th><th>Pago</th><th>Línea de crédito</th><th>Agente</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map(({ company, condition }) => {
                const mode = condition?.modalidad_facturacion || company.modalidad_facturacion;
                return (
                  <tr key={company.id}>
                    <td><strong>{company.razon_social}</strong>{company.nombre_comercial ? <small>{company.nombre_comercial}</small> : null}</td>
                    <td>{company.ruc}</td>
                    <td><span className={mode === 'CONSOLIDADA' ? 'commercial-status blue' : 'commercial-status'}>{modalityLabel(mode)}</span></td>
                    <td>{cutLabel(condition?.frecuencia_corte || (mode === 'POR_ABASTECIMIENTO' ? 'INMEDIATA' : company.periodicidad_facturacion), condition?.regla_corte)}</td>
                    <td>{condition?.condicion_pago === 'CREDITO' ? <span className="commercial-status green">Crédito · {condition.dias_credito || 0} días</span> : 'Contado'}</td>
                    <td>{condition?.condicion_pago === 'CREDITO' ? money(condition.linea_credito) : '—'}</td>
                    <td>{condition?.agente_comercial || 'Sin asignar'}</td>
                    <td><Link className="commercial-primary-link" href={`/comercial/clientes/${company.id}`}>Configurar →</Link></td>
                  </tr>
                );
              })}
              {!rows.length ? <tr><td colSpan={8} className="empty-row">No hay clientes activos.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </CommercialShell>
  );
}
