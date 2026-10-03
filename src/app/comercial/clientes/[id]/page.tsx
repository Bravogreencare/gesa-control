import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import CommercialShell from '@/components/commercial-shell';
import CommercialConditionForm from '@/components/commercial-condition-form';
import { createClient } from '@/lib/supabase/server';

function money(value?: number | null) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 2 }).format(Number(value || 0));
}

export default async function CommercialClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
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

  const { id } = await params;
  const query = await searchParams;

  const [{ data: company }, { data: condition }, { count: supplyCount }, { count: vehicleCount }] = await Promise.all([
    supabase.from('empresas').select('id,ruc,razon_social,nombre_comercial,estado,modalidad_facturacion,periodicidad_facturacion,separacion_factura_por_producto').eq('id', id).maybeSingle(),
    supabase.from('condiciones_comerciales').select('id,modalidad_facturacion,frecuencia_corte,regla_corte,condicion_pago,linea_credito,dias_credito,moneda,separacion_por_producto,agente_comercial,vigente_desde,estado').eq('empresa_id', id).eq('estado', 'VIGENTE').order('creado_en', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('abastecimientos').select('id', { count: 'exact', head: true }).eq('empresa_id', id),
    supabase.from('vehiculos').select('id', { count: 'exact', head: true }).eq('empresa_id', id).eq('estado', 'ACTIVO'),
  ]);

  if (!company) notFound();

  const initialMode = condition?.modalidad_facturacion || company.modalidad_facturacion || 'POR_ABASTECIMIENTO';
  const initial = {
    modalidad: initialMode,
    frecuencia: condition?.frecuencia_corte || (initialMode === 'CONSOLIDADA' ? company.periodicidad_facturacion || 'QUINCENAL' : 'INMEDIATA'),
    regla: condition?.regla_corte || (initialMode === 'CONSOLIDADA' ? '01-15 / 16-fin de mes' : ''),
    pago: condition?.condicion_pago || 'CONTADO',
    linea: condition?.linea_credito == null ? null : Number(condition.linea_credito),
    dias: condition?.dias_credito == null ? null : Number(condition.dias_credito),
    agente: condition?.agente_comercial || 'Comercial GESA',
  };

  return (
    <CommercialShell active="clientes" displayName={profile.nombre}>
      <div className="commercial-breadcrumb"><Link href="/comercial">← Clientes</Link><span>/</span><strong>{company.razon_social}</strong></div>

      <section className="commercial-client-header">
        <div>
          <p className="eyebrow">FICHA COMERCIAL</p>
          <h1>{company.razon_social}</h1>
          <p>{company.nombre_comercial || 'Cliente GESA'} · RUC {company.ruc}</p>
        </div>
        <div className="commercial-client-summary">
          <span><small>Abastecimientos</small><strong>{supplyCount || 0}</strong></span>
          <span><small>Vehículos</small><strong>{vehicleCount || 0}</strong></span>
          <span><small>Condición</small><strong>{initial.pago === 'CREDITO' ? 'Crédito' : 'Contado'}</strong></span>
        </div>
      </section>

      {query.saved ? <div className="commercial-feedback success">Condición comercial actualizada correctamente.</div> : null}
      {query.error ? <div className="commercial-feedback error">No se pudo guardar la condición: {query.error}</div> : null}

      <div className="commercial-client-layout">
        <section className="commercial-card commercial-form-card">
          <div className="commercial-card-head">
            <div>
              <p className="eyebrow">CONFIGURACIÓN</p>
              <h2>Condición comercial y facturación</h2>
              <p>Este bloque pertenece al usuario interno GESA. El cliente no puede modificar estos datos desde su portal.</p>
            </div>
          </div>
          <CommercialConditionForm empresaId={company.id} initial={initial} />
        </section>

        <aside className="commercial-side-panel">
          <section className="commercial-card">
            <p className="eyebrow">CONDICIÓN VIGENTE</p>
            <dl className="commercial-summary-list">
              <div><dt>Facturación</dt><dd>{initial.modalidad === 'CONSOLIDADA' ? 'Consolidada' : 'Por abastecimiento'}</dd></div>
              <div><dt>Corte</dt><dd>{initial.modalidad === 'CONSOLIDADA' ? `${initial.frecuencia}${initial.regla ? ` · ${initial.regla}` : ''}` : 'Inmediato'}</dd></div>
              <div><dt>Pago</dt><dd>{initial.pago === 'CREDITO' ? `Crédito · ${initial.dias ?? 0} días` : 'Contado'}</dd></div>
              <div><dt>Línea</dt><dd>{initial.pago === 'CREDITO' ? money(initial.linea) : 'No aplica'}</dd></div>
              <div><dt>Combustibles</dt><dd>Facturas separadas obligatoriamente</dd></div>
              <div><dt>Agente</dt><dd>{initial.agente}</dd></div>
            </dl>
          </section>

          <section className="commercial-card commercial-process-card">
            <p className="eyebrow">FLUJO</p>
            <ol>
              <li><span>1</span><div><strong>Abastecimiento</strong><small>Se genera Ticket / Nota de despacho.</small></div></li>
              <li><span>2</span><div><strong>Acumulación</strong><small>Solo si el cliente es consolidado.</small></div></li>
              <li><span>3</span><div><strong>Corte</strong><small>Se agrupan tickets por periodo y combustible.</small></div></li>
              <li><span>4</span><div><strong>Factura</strong><small>Una factura no mezcla tipos de combustible.</small></div></li>
            </ol>
          </section>
        </aside>
      </div>
    </CommercialShell>
  );
}
