'use client';

import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

type Field = 'referencia_control' | 'kilometraje';

type Props = {
  abastecimientoId: string;
  field: Field;
  value?: string | number | null;
  documentoIdentidad?: string | null;
  referenciaControl?: string | null;
  kilometraje?: string | number | null;
  canEdit: boolean;
  placeholder?: string;
};

export default function EditableSupplyCell({
  abastecimientoId,
  field,
  value,
  documentoIdentidad,
  referenciaControl,
  kilometraje,
  canEdit,
  placeholder = '—',
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value == null ? '' : String(value));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setDraft(value == null ? '' : String(value));
  }, [value]);

  useEffect(() => {
    if (editing) {
      window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [editing]);

  async function save() {
    if (!canEdit || saving) return;

    const nextReference = field === 'referencia_control' ? draft.trim() : (referenciaControl || '');
    const kmText = field === 'kilometraje' ? draft.trim() : (kilometraje == null ? '' : String(kilometraje));
    const nextKm = kmText ? Number(kmText.replace(',', '.')) : null;

    if (kmText && (!Number.isFinite(nextKm) || Number(nextKm) < 0)) {
      setError(true);
      return;
    }

    const original = value == null ? '' : String(value);
    if (draft.trim() === original.trim()) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError(false);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('actualizar_datos_abastecimiento_cliente', {
      p_abastecimiento_id: abastecimientoId,
      p_documento_identidad: documentoIdentidad || '',
      p_referencia_control: nextReference,
      p_kilometraje: nextKm,
    });

    setSaving(false);

    if (rpcError) {
      setError(true);
      return;
    }

    setEditing(false);
    setSaved(true);
    router.refresh();
    window.setTimeout(() => setSaved(false), 1200);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void save();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setDraft(value == null ? '' : String(value));
      setEditing(false);
      setError(false);
    }
  }

  if (editing) {
    return (
      <span className={`editable-supply-cell editing${error ? ' error' : ''}`}>
        <input
          ref={inputRef}
          value={draft}
          inputMode={field === 'kilometraje' ? 'decimal' : 'text'}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => void save()}
          aria-label={field === 'kilometraje' ? 'Editar kilometraje' : 'Editar Viaje o CECO'}
        />
        {saving ? <LoaderCircle size={13} className="editable-cell-spinner" /> : null}
      </span>
    );
  }

  return (
    <span
      className={`editable-supply-cell${canEdit ? ' can-edit' : ''}${saved ? ' saved' : ''}`}
      onDoubleClick={() => canEdit && setEditing(true)}
      title={canEdit ? 'Doble clic para editar' : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onKeyDown={(event) => {
        if (canEdit && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          setEditing(true);
        }
      }}
    >
      <span>{value === null || value === undefined || value === '' ? placeholder : String(value)}</span>
      {saved ? <Check size={13} /> : null}
    </span>
  );
}
