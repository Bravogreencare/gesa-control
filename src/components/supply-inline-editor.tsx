'use client';

import { useRef, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

type Props = {
  abastecimientoId: string;
  documentoIdentidad?: string | null;
  referenciaControl?: string | null;
  kilometraje?: number | string | null;
  controlLabel: string;
  canEdit: boolean;
};

export default function SupplyInlineEditor({
  abastecimientoId,
  documentoIdentidad,
  referenciaControl,
  kilometraje,
  controlLabel,
  canEdit,
}: Props) {
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!canEdit) return <span className="row-edit-disabled">Solo lectura</span>;

  async function onSubmit(formData: FormData) {
    setSaving(true);
    setMessage(null);

    const kmRaw = String(formData.get('kilometraje') || '').trim();
    const km = kmRaw ? Number(kmRaw.replace(',', '.')) : null;
    if (kmRaw && (!Number.isFinite(km) || Number(km) < 0)) {
      setMessage('KM inválido');
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.rpc('actualizar_datos_abastecimiento_cliente', {
      p_abastecimiento_id: abastecimientoId,
      p_documento_identidad: String(formData.get('documento_identidad') || ''),
      p_referencia_control: String(formData.get('referencia_control') || ''),
      p_kilometraje: km,
    });

    if (error) {
      setMessage(error.message || 'No se pudo guardar');
      setSaving(false);
      return;
    }

    setMessage('Guardado');
    setSaving(false);
    router.refresh();
    window.setTimeout(() => {
      if (detailsRef.current) detailsRef.current.open = false;
      setMessage(null);
    }, 650);
  }

  return (
    <details className="row-inline-editor" ref={detailsRef}>
      <summary title="Corregir DNI, control operativo o kilometraje" aria-label="Editar datos del abastecimiento">
        <Pencil size={15} strokeWidth={2.2} />
      </summary>
      <div className="row-inline-editor-popover">
        <div className="row-inline-editor-head">
          <div>
            <strong>Corregir datos</strong>
            <span>Se conserva auditoría del cambio.</span>
          </div>
          <button type="button" className="row-inline-close" onClick={() => { if (detailsRef.current) detailsRef.current.open = false; }} aria-label="Cerrar">
            <X size={15} />
          </button>
        </div>
        <form action={onSubmit}>
          <label>
            DNI / documento
            <input name="documento_identidad" defaultValue={documentoIdentidad || ''} inputMode="numeric" placeholder="Ej. 74302716" />
          </label>
          <label>
            {controlLabel}
            <input name="referencia_control" defaultValue={referenciaControl || ''} placeholder={`Código de ${controlLabel.toLowerCase()}`} />
          </label>
          <label>
            Kilometraje
            <input name="kilometraje" defaultValue={kilometraje ?? ''} inputMode="decimal" placeholder="Km registrado" />
          </label>
          <div className="row-inline-editor-actions">
            <span className={message === 'Guardado' ? 'save-message ok' : 'save-message'}>{message || ''}</span>
            <button type="submit" className="small-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </details>
  );
}
