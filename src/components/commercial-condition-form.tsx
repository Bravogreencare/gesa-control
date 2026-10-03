'use client';

import { useState } from 'react';
import { saveCommercialCondition } from '@/app/comercial/actions';

type Props = {
  empresaId: string;
  initial: {
    modalidad: string;
    frecuencia: string;
    regla: string;
    pago: string;
    linea: number | null;
    dias: number | null;
    agente: string;
  };
};

export default function CommercialConditionForm({ empresaId, initial }: Props) {
  const [modalidad, setModalidad] = useState(initial.modalidad || 'POR_ABASTECIMIENTO');
  const [pago, setPago] = useState(initial.pago || 'CONTADO');
  const consolidated = modalidad === 'CONSOLIDADA';
  const credit = pago === 'CREDITO';

  return (
    <form action={saveCommercialCondition} className="commercial-condition-form">
      <input type="hidden" name="empresa_id" value={empresaId} />

      <div className="commercial-form-section">
        <div className="commercial-form-section-head">
          <span>01</span>
          <div><strong>Modalidad de facturación</strong><small>Define qué sucede después de cada Ticket / Nota de despacho.</small></div>
        </div>
        <div className="commercial-choice-grid">
          <label className={modalidad === 'POR_ABASTECIMIENTO' ? 'commercial-choice active' : 'commercial-choice'}>
            <input type="radio" name="modalidad_facturacion" value="POR_ABASTECIMIENTO" checked={modalidad === 'POR_ABASTECIMIENTO'} onChange={() => setModalidad('POR_ABASTECIMIENTO')} />
            <strong>Por abastecimiento</strong>
            <small>1 abastecimiento → 1 factura.</small>
          </label>
          <label className={modalidad === 'CONSOLIDADA' ? 'commercial-choice active' : 'commercial-choice'}>
            <input type="radio" name="modalidad_facturacion" value="CONSOLIDADA" checked={modalidad === 'CONSOLIDADA'} onChange={() => setModalidad('CONSOLIDADA')} />
            <strong>Consolidada</strong>
            <small>Varios tickets → 1 factura por combustible y corte.</small>
          </label>
        </div>
      </div>

      {consolidated ? (
        <div className="commercial-form-section">
          <div className="commercial-form-section-head">
            <span>02</span>
            <div><strong>Fecha o frecuencia de corte</strong><small>Los tickets se agrupan dentro del periodo definido.</small></div>
          </div>
          <div className="commercial-form-grid">
            <label>Frecuencia
              <select name="frecuencia_corte" defaultValue={initial.frecuencia || 'QUINCENAL'} required>
                <option value="DIARIA">Diaria</option>
                <option value="SEMANAL">Semanal</option>
                <option value="QUINCENAL">Quincenal</option>
                <option value="MENSUAL">Mensual</option>
                <option value="PERSONALIZADA">Personalizada</option>
              </select>
            </label>
            <label>Regla de corte
              <input name="regla_corte" defaultValue={initial.regla || '01-15 / 16-fin de mes'} placeholder="Ej. 01-15 / 16-fin de mes" />
            </label>
          </div>
          <div className="commercial-fixed-rule">
            <strong>Regla obligatoria de GESA</strong>
            <span>La consolidación siempre se separa por tipo de combustible. Una factura no puede mezclar Diésel, G Regular, G Premium, GLP, GNV u otros productos.</span>
          </div>
        </div>
      ) : null}

      <div className="commercial-form-section">
        <div className="commercial-form-section-head">
          <span>{consolidated ? '03' : '02'}</span>
          <div><strong>Condición de pago</strong><small>La línea y los días solo aplican cuando el cliente opera a crédito.</small></div>
        </div>
        <div className="commercial-choice-grid">
          <label className={pago === 'CONTADO' ? 'commercial-choice active' : 'commercial-choice'}>
            <input type="radio" name="condicion_pago" value="CONTADO" checked={pago === 'CONTADO'} onChange={() => setPago('CONTADO')} />
            <strong>Contado</strong><small>Sin línea de crédito.</small>
          </label>
          <label className={pago === 'CREDITO' ? 'commercial-choice active' : 'commercial-choice'}>
            <input type="radio" name="condicion_pago" value="CREDITO" checked={pago === 'CREDITO'} onChange={() => setPago('CREDITO')} />
            <strong>Crédito</strong><small>Con línea aprobada y plazo de pago.</small>
          </label>
        </div>

        {credit ? (
          <div className="commercial-form-grid commercial-credit-grid">
            <label>Línea de crédito (S/)
              <input type="number" name="linea_credito" min="0.01" step="0.01" defaultValue={initial.linea ?? ''} placeholder="100000.00" required />
            </label>
            <label>Días de crédito
              <input type="number" name="dias_credito" min="0" step="1" defaultValue={initial.dias ?? ''} placeholder="15" required />
            </label>
          </div>
        ) : null}
      </div>

      <div className="commercial-form-section">
        <div className="commercial-form-section-head">
          <span>{consolidated ? '04' : '03'}</span>
          <div><strong>Responsable comercial</strong><small>Queda registrado con la condición vigente para seguimiento.</small></div>
        </div>
        <label className="commercial-agent-field">Agente comercial
          <input name="agente_comercial" defaultValue={initial.agente || 'Comercial GESA'} placeholder="Nombre del agente comercial" />
        </label>
      </div>

      <div className="commercial-form-footer">
        <div><strong>Los cambios crean una nueva condición vigente.</strong><span>La condición anterior queda histórica y la modificación se registra en auditoría.</span></div>
        <button type="submit" className="commercial-save-button">Guardar condición comercial</button>
      </div>
    </form>
  );
}
