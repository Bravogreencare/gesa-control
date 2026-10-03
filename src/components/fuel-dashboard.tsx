'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type FuelSummaryItem = {
  key: string;
  label: string;
  unit: string;
  quantity: number;
  amount: number;
  count: number;
};

export type FuelEvolutionPoint = {
  period: string;
  values: Record<string, { quantity: number; amount: number }>;
};

export type TopVehicleItem = {
  plate: string;
  vehicle: string;
  principalFuel: string;
  quantity: number;
  unit: string;
  amount: number;
};

type Mode = 'quantity' | 'amount';

type Props = {
  items: FuelSummaryItem[];
  evolution: FuelEvolutionPoint[];
  topVehicles: TopVehicleItem[];
};

const COLORS: Record<string, string> = {
  DIESEL_B5: '#116CB8',
  REGULAR: '#159252',
  PREMIUM: '#E52B41',
  GNV: '#2A8BE1',
  GLP: '#7890A8',
  GNL: '#063563',
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
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('es-PE', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);
}

export default function FuelDashboard({ items, evolution, topVehicles }: Props) {
  const [mode, setMode] = useState<Mode>('quantity');

  const activeItems = useMemo(() => items.filter((item) => item.count > 0), [items]);

  const barData = useMemo(
    () =>
      activeItems
        .map((item) => {
          const value = mode === 'quantity' ? item.quantity : item.amount;
          return {
            ...item,
            value,
            display: mode === 'quantity' ? `${formatQuantity(value)} ${item.unit}` : formatMoney(value),
            color: COLORS[item.key] || '#116CB8',
          };
        })
        .sort((a, b) => b.value - a.value),
    [activeItems, mode],
  );

  const pieData = useMemo(
    () =>
      activeItems
        .filter((item) => item.amount > 0)
        .map((item) => ({
          key: item.key,
          name: item.label,
          value: item.amount,
          color: COLORS[item.key] || '#116CB8',
        }))
        .sort((a, b) => b.value - a.value),
    [activeItems],
  );

  const totalSpend = pieData.reduce((sum, item) => sum + item.value, 0);

  const evolutionData = useMemo(
    () =>
      evolution.map((point) => {
        const row: Record<string, string | number> = { period: point.period };
        activeItems.forEach((item) => {
          row[item.key] = mode === 'quantity'
            ? Number(point.values[item.key]?.quantity || 0)
            : Number(point.values[item.key]?.amount || 0);
        });
        return row;
      }),
    [activeItems, evolution, mode],
  );

  return (
    <section className="fuel-dashboard">
      <div className="fuel-dashboard-header">
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

      <div className="fuel-kpi-grid">
        {items.map((item) => (
          <article className="fuel-kpi-card" key={item.key}>
            <div className="fuel-kpi-label">
              <span className="fuel-dot" style={{ background: COLORS[item.key] || '#116CB8' }} />
              <span>{item.label}</span>
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

      <div className="dashboard-analytics-grid">
        <article className="analytics-card analytics-card-wide">
          <div className="analytics-card-header">
            <div>
              <h3>Consumo por tipo de combustible</h3>
              <p>{mode === 'quantity'
                ? 'Volumen total consumido por cada tipo de combustible (unidades según tipo).'
                : 'Importe facturado acumulado por tipo de combustible.'}</p>
            </div>
          </div>
          <div className="chart-box chart-box-bar">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 105, bottom: 8, left: 10 }}>
                <CartesianGrid stroke="#E8EEF5" horizontal={false} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#73849A', fontSize: 11 }}
                  tickFormatter={(value: number) => mode === 'amount' ? `S/ ${formatCompact(value)}` : formatCompact(value)}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={125}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#234261', fontSize: 12, fontWeight: 700 }}
                />
                <Tooltip
                  cursor={{ fill: '#F3F7FB' }}
                  formatter={(value: unknown, _name: unknown, entry: { payload?: { unit?: string } }) => {
                    const numeric = Number(value || 0);
                    return [mode === 'amount' ? formatMoney(numeric) : `${formatQuantity(numeric)} ${entry.payload?.unit || ''}`, mode === 'amount' ? 'Importe' : 'Cantidad'];
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                  {barData.map((item) => <Cell key={item.key} fill={item.color} />)}
                  <LabelList dataKey="display" position="right" fill="#173A5E" fontSize={12} fontWeight={800} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h3>Distribución del gasto</h3>
              <p>Participación por tipo de combustible (en soles).</p>
            </div>
          </div>
          <div className="spend-layout">
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={91}
                    paddingAngle={1.5}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  >
                    {pieData.map((item) => <Cell key={item.key} fill={item.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: unknown) => formatMoney(Number(value || 0))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{formatMoney(totalSpend)}</strong>
                <span>Gasto total</span>
              </div>
            </div>
            <div className="spend-legend">
              {pieData.map((item) => {
                const pct = totalSpend > 0 ? (item.value / totalSpend) * 100 : 0;
                return (
                  <div className="spend-legend-row" key={item.key}>
                    <span className="fuel-dot" style={{ background: item.color }} />
                    <span className="spend-legend-name">{item.name}</span>
                    <strong>{formatMoney(item.value)}</strong>
                    <small>{pct.toFixed(1)}%</small>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <article className="analytics-card analytics-card-wide">
          <div className="analytics-card-header">
            <div>
              <h3>Evolución del consumo</h3>
              <p>{mode === 'quantity'
                ? 'Comportamiento semanal; cada serie conserva la unidad propia de su combustible.'
                : 'Evolución semanal del gasto por tipo de combustible.'}</p>
            </div>
          </div>
          <div className="chart-box chart-box-line">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#E8EEF5" strokeDasharray="3 3" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#73849A', fontSize: 11 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={58}
                  tick={{ fill: '#73849A', fontSize: 11 }}
                  tickFormatter={(value: number) => mode === 'amount' ? `S/ ${formatCompact(value)}` : formatCompact(value)}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => {
                    const numeric = Number(value || 0);
                    const item = activeItems.find((fuel) => fuel.label === String(name));
                    return [mode === 'amount' ? formatMoney(numeric) : `${formatQuantity(numeric)} ${item?.unit || ''}`, String(name)];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {activeItems.map((item) => (
                  <Line
                    key={item.key}
                    type="monotone"
                    dataKey={item.key}
                    name={item.label}
                    stroke={COLORS[item.key] || '#116CB8'}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="analytics-card top-vehicles-card">
          <div className="analytics-card-header">
            <div>
              <h3>Top vehículos por consumo</h3>
              <p>Vehículos con mayor gasto acumulado en el periodo visible.</p>
            </div>
          </div>
          <div className="ranking-table-wrap">
            <table className="ranking-table">
              <thead>
                <tr><th>#</th><th>Placa</th><th>Vehículo</th><th>Combustible</th><th>Consumo</th><th>Gasto</th></tr>
              </thead>
              <tbody>
                {topVehicles.map((vehicle, index) => (
                  <tr key={vehicle.plate}>
                    <td>{index + 1}</td>
                    <td><strong>{vehicle.plate}</strong></td>
                    <td>{vehicle.vehicle}</td>
                    <td>{vehicle.principalFuel}</td>
                    <td>{formatQuantity(vehicle.quantity)} {vehicle.unit}</td>
                    <td><strong>{formatMoney(vehicle.amount)}</strong></td>
                  </tr>
                ))}
                {!topVehicles.length ? <tr><td colSpan={6} className="empty-row">Sin datos suficientes.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
