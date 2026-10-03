'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function saveCommercialCondition(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('usuarios_internos_gesa')
    .select('rol,activo')
    .eq('usuario_id', user.id)
    .eq('activo', true)
    .maybeSingle();

  if (!profile || !['COMERCIAL', 'ADMIN_GESA'].includes(profile.rol)) {
    redirect('/portal');
  }

  const empresaId = String(formData.get('empresa_id') || '');
  const modalidad = String(formData.get('modalidad_facturacion') || 'POR_ABASTECIMIENTO');
  const frecuencia = String(formData.get('frecuencia_corte') || '');
  const reglaCorte = String(formData.get('regla_corte') || '');
  const condicionPago = String(formData.get('condicion_pago') || 'CONTADO');
  const lineaRaw = String(formData.get('linea_credito') || '').trim();
  const diasRaw = String(formData.get('dias_credito') || '').trim();
  const agente = String(formData.get('agente_comercial') || '').trim();

  const lineaCredito = lineaRaw ? Number(lineaRaw) : null;
  const diasCredito = diasRaw ? Number(diasRaw) : null;

  const { error } = await supabase.rpc('comercial_guardar_condicion', {
    p_empresa_id: empresaId,
    p_modalidad: modalidad,
    p_frecuencia: modalidad === 'CONSOLIDADA' ? frecuencia : null,
    p_regla_corte: modalidad === 'CONSOLIDADA' ? reglaCorte : null,
    p_condicion_pago: condicionPago,
    p_linea_credito: condicionPago === 'CREDITO' ? lineaCredito : null,
    p_dias_credito: condicionPago === 'CREDITO' ? diasCredito : null,
    p_agente_comercial: agente || 'Comercial GESA',
  });

  if (error) {
    redirect(`/comercial/clientes/${empresaId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/comercial');
  revalidatePath('/comercial/cortes');
  revalidatePath(`/comercial/clientes/${empresaId}`);
  revalidatePath('/portal/facturacion');
  redirect(`/comercial/clientes/${empresaId}?saved=1`);
}
