'use client';

import { useState } from 'react';

export type FuelSummaryItem = {
  key: string;
  label: string;
  unit: string;
  quantity: number;
  amount: number;
  count: number;
};

function formatQuantity(value: number) {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(value || 0);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(value || 0);
}

export default function FuelSummaryToggle({ items }: { items: FuelSummaryItem[] }) {
  const [mode, setMode] = useState<'quantity' | 'amount'>('quantity');

  return (
    <section className="fuel-summary-section">
      <div className="fuel-summary-header">
        <div>
          <p className="eyebrow">CONSUMO POR TIPO DE COMBUSTIBLE</p>
          <h2>Indicadores de consumo</h2>
          <p className="muted">Visualiza el consumo físico o su equivalente facturado en soles.</p>
        </div>

        <div className="fuel-view-toggle" role="group" aria-label="Cambiar visualización del consumo">
          <button
            type="button"
            className={mode === 'quantity' ? 'active' : ''}
            onClick={() => setMode('quantity')}
            aria-pressed={mode === 'quantity'}
          >
            Cantidad
          </button>
          <button
            type="button"
            className={mode === 'amount' ? 'active' : ''}
            onClick={() => setMode('amount')}
            aria-pressed={mode === 'amount'}
          >
            Soles
          </button>
        </div>
      </div>

      <div className="fuel-summary-grid">
        {items.map((item) => (
          <article className="card fuel-summary-card" key={item.key}>
            <div className="fuel-summary-card-top">
              <span className={`fuel-type-dot fuel-${item.key.toLowerCase()}`} aria-hidden="true" />
              <span className="fuel-type-label">{item.label}</span>
            </div>
            <strong>
              {mode === 'quantity'
                ? `${formatQuantity(item.quantity)} ${item.unit}`
                : formatMoney(item.amount)}
            </strong>
            <small>{item.count} abastecimiento{item.count === 1 ? '' : 's'}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
