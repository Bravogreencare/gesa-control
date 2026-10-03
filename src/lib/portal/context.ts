import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function getPortalContext(empresa?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: memberships } = await supabase
    .from('membresias')
    .select('empresa_id, rol, empresas(id,ruc,razon_social,nombre_comercial,modalidad_facturacion,periodicidad_facturacion,etiqueta_control_operativo,separacion_factura_por_producto)')
    .eq('activo', true);

  const available = (memberships || []) as any[];
  if (!available.length) redirect('/portal');

  const selectedId = available.some((m) => m.empresa_id === empresa)
    ? empresa!
    : available[0].empresa_id;
  const membership = available.find((m) => m.empresa_id === selectedId)!;
  const company = membership.empresas;

  const { data: condition } = await supabase
    .from('condiciones_comerciales')
    .select('*')
    .eq('empresa_id', selectedId)
    .eq('estado', 'VIGENTE')
    .order('vigente_desde', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    supabase,
    user,
    available,
    selectedId,
    membership,
    company,
    condition: condition as any,
  };
}
