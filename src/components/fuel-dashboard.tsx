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

export type FuelDefinition = {
  key: string;
  label: string;
  unit: string;
};

export type FuelRecord = {
  date: string;
  fuelKey: string;
  fuelLabel: string;
  unit: string;
  quantity: number;
  amount: number;
  station: string;
  plate: string;
  vehicle: string;
};

type StationMode = 'quantity' | 'amount';

type Props = {
  fuelTypes: FuelDefinition[];
  records: FuelRecord[];
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

function monthKey(value: string) {
  const direct = value?.match(/^(\d{4})-(\d{2})/);
  if (direct) return `${direct[1]}-${direct[2]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthChipLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  const raw = new Intl.DateTimeFormat('es-PE', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1))).replace('.', '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function weekStartKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = (date.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
  return start.toISOString().slice(0, 10);
}

function weekLabel(key: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${key}T00:00:00Z`));
}

function BarValueLabel(props: any) {
  const { x, y, width, height, value } = props;
  if (x == null || y == null || width == null || height == null || value == null) return null;

  return (
    <text
      x={Number(x) + Number(width) + 9}
      y={Number(y) + Number(height) / 2}
      fill="#173A5E"
      fontSize={12}
      fontWeight={800}
      dominantBaseline="middle"
      textAnchor="start"
    >
      {String(value)}
    </text>
  );
}

export default function FuelDashboard({ fuelTypes, records }: Props) {
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [stationMode, setStationMode] = useState<StationMode>('quantity');

  const availableMonths = useMemo(() => {
    return Array.from(new Set(records.map((record) => monthKey(record.date)).filter((value): value is string => Boolean(value))))
      .sort((a, b) => b.localeCompare(a));
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!selectedMonths.length) return records;
    const allowed = new Set(selectedMonths);
    return records.filter((record) => {
      const key = monthKey(record.date);
      return key ? allowed.has(key) : false;
    });
  }, [records, selectedMonths]);

  const summaries = useMemo(() => {
    return fuelTypes.map((fuel) => {
      const fuelRecords = filteredRecords.filter((record) => record.fuelKey === fuel.key);
      return {
        ...fuel,
        quantity: fuelRecords.reduce((sum, record) => sum + Number(record.quantity || 0), 0),
        amount: fuelRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0),
        count: fuelRecords.length,
      };
    });
  }, [fuelTypes, filteredRecords]);

  const activeItems = useMemo(() => summaries.filter((item) => item.count > 0), [summaries]);

  const barData = useMemo(() => {
    return activeItems
      .map((item) => ({
        ...item,
        value: item.quantity,
        display: `${formatQuantity(item.quantity)}\u00A0${item.unit}`,
        color: COLORS[item.key] || '#116CB8',
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeItems]);

  const pieData = useMemo(() => {
    return activeItems
      .filter((item) => item.amount > 0)
      .map((item) => ({
        key: item.key,
        name: item.label,
        value: item.amount,
        color: COLORS[item.key] || '#116CB8',
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeItems]);

  const totalSpend = pieData.reduce((sum, item) => sum + item.value, 0);

  const evolutionData = useMemo(() => {
    const weekly = new Map<string, Record<string, number>>();

    filteredRecords.forEach((record) => {
      const key = weekStartKey(record.date);
      if (!key) return;
      const row = weekly.get(key) || {};
      row[record.fuelKey] = Number(row[record.fuelKey] || 0) + Number(record.amount || 0);
      weekly.set(key, row);
    });

    return Array.from(weekly.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => ({ period: weekLabel(key), ...values }));
  }, [filteredRecords]);

  const topVehicles = useMemo(() => {
    const vehicles = new Map<string, {
      plate: string;
      vehicle: string;
      amount: number;
      fuels: Map<string, { quantity: number; amount: number }>;
    }>();

    filteredRecords.forEach((record) => {
      const aggregate = vehicles.get(record.plate) || {
        plate: record.plate,
        vehicle: record.vehicle,
        amount: 0,
        fuels: new Map<string, { quantity: number; amount: number }>(),
      };
      aggregate.amount += Number(record.amount || 0);
      const fuel = aggregate.fuels.get(record.fuelKey) || { quantity: 0, amount: 0 };
      fuel.quantity += Number(record.quantity || 0);
      fuel.amount += Number(record.amount || 0);
      aggregate.fuels.set(record.fuelKey, fuel);
      vehicles.set(record.plate, aggregate);
    });

    return Array.from(vehicles.values())
      .map((vehicle) => {
        const principal = Array.from(vehicle.fuels.entries()).sort((a, b) => b[1].amount - a[1].amount)[0];
        const fuelKey = principal?.[0] || '';
        const fuelTotals = principal?.[1] || { quantity: 0, amount: 0 };
        const definition = fuelTypes.find((fuel) => fuel.key === fuelKey);
        return {
          plate: vehicle.plate,
          vehicle: vehicle.vehicle,
          principalFuel: definition?.label || 'Sin clasificar',
          quantity: fuelTotals.quantity,
          unit: definition?.unit || '',
          amount: vehicle.amount,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredRecords, fuelTypes]);

  const stationBreakdown = useMemo(() => {
    const grouped = new Map<string, {
      station: string;
      fuelKey: string;
      unit: string;
      quantity: number;
      amount: number;
      count: number;
    }>();

    filteredRecords.forEach((record) => {
      const key = `${record.station}::${record.fuelKey}`;
      const previous = grouped.get(key) || {
        station: record.station,
        fuelKey: record.fuelKey,
        unit: record.unit,
        quantity: 0,
        amount: 0,
        count: 0,
      };
      previous.quantity += Number(record.quantity || 0);
      previous.amount += Number(record.amount || 0);
      previous.count += 1;
      grouped.set(key, previous);
    });

    return Array.from(grouped.values());
  }, [filteredRecords]);

  const stationColumns = useMemo(() => {
    const used = new Set(stationBreakdown.map((row) => row.fuelKey));
    return fuelTypes.filter((item) => used.has(item.key));
  }, [fuelTypes, stationBreakdown]);

  const stationRows = useMemo(() => {
    const grouped = new Map<string, Map<string, (typeof stationBreakdown)[number]>>();

    stationBreakdown.forEach((row) => {
      const fuels = grouped.get(row.station) || new Map<string, (typeof stationBreakdown)[number]>();
      fuels.set(row.fuelKey, row);
      grouped.set(row.station, fuels);
    });

    return Array.from(grouped.entries())
      .map(([station, fuels]) => ({
        station,
        fuels,
        sortAmount: Array.from(fuels.values()).reduce((sum, row) => sum + row.amount, 0),
      }))
      .sort((a, b) => b.sortAmount - a.sortAmount);
  }, [stationBreakdown]);

  function toggleMonth(key: string) {
    setSelectedMonths((current) => {
      if (!current.length) return [key];
      if (current.includes(key)) {
        const next = current.filter((month) => month !== key);
        return next.length ? next : [];
      }
      return [...current, key].sort((a, b) => b.localeCompare(a));
    });
  }

  return (
    <section className="fuel-dashboard">
      <div className="fuel-dashboard-header">
        <div>
          <p className="eyebrow">ANÁLISIS DE COMBUSTIBLE</p>
          <h2>Indicadores de consumo</h2>
          <p className="muted">Compara consumo, gasto, evolución, vehículos y estaciones según el periodo seleccionado.</p>
        </div>
      </div>

      <div className="month-chip-filter" role="group" aria-label="Filtrar por mes">
        <span className="month-chip-title">Periodo</span>
        <button
          type="button"
          className={!selectedMonths.length ? 'month-chip active' : 'month-chip'}
          onClick={() => setSelectedMonths([])}
          aria-pressed={!selectedMonths.length}
        >
          Todos
        </button>
        <div className="month-chip-scroll">
          {availableMonths.map((key) => {
            const active = selectedMonths.includes(key);
            return (
              <button
                key={key}
                type="button"
                className={active ? 'month-chip active' : 'month-chip'}
                onClick={() => toggleMonth(key)}
                aria-pressed={active}
              >
                {monthChipLabel(key)}
              </button>
            );
          })}
        </div>
        {selectedMonths.length > 1 ? (
          <span className="month-chip-count">{selectedMonths.length} meses</span>
        ) : null}
      </div>

      <div className="dashboard-analytics-grid">
        <article className="analytics-card analytics-card-wide">
          <div className="analytics-card-header">
            <div>
              <h3>Consumo por tipo de combustible</h3>
              <p>Cantidad consumida por producto; cada combustible conserva su propia unidad.</p>
            </div>
          </div>
          <div className="chart-box chart-box-bar">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 145, bottom: 8, left: 10 }}>
                <CartesianGrid stroke="#E8EEF5" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#73849A', fontSize: 11 }} tickFormatter={(value: number) => formatCompact(value)} />
                <YAxis dataKey="label" type="category" width={105} axisLine={false} tickLine={false} tick={{ fill: '#234261', fontSize: 12, fontWeight: 700 }} />
                <Tooltip
                  cursor={{ fill: '#F3F7FB' }}
                  formatter={(value: unknown, _name: unknown, entry: { payload?: { unit?: string } }) => [
                    `${formatQuantity(Number(value || 0))} ${entry.payload?.unit || ''}`,
                    'Cantidad',
                  ]}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                  {barData.map((item) => <Cell key={item.key} fill={item.color} />)}
                  <LabelList dataKey="display" content={<BarValueLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h3>Distribución del gasto</h3>
              <p>Participación por tipo de combustible en soles.</p>
            </div>
          </div>
          <div className="spend-layout">
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={91} paddingAngle={1.5} stroke="#FFFFFF" strokeWidth={2}>
                    {pieData.map((item) => <Cell key={item.key} fill={item.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: unknown) => formatMoney(Number(value || 0))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{formatMoney(totalSpend)}</strong>
                <span>Gasto del periodo</span>
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
              <h3>Evolución del gasto</h3>
              <p>Comportamiento semanal del importe facturado por tipo de combustible.</p>
            </div>
          </div>
          <div className="chart-box chart-box-line">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#E8EEF5" strokeDasharray="3 3" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#73849A', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={68} tick={{ fill: '#73849A', fontSize: 11 }} tickFormatter={(value: number) => `S/ ${formatCompact(value)}`} />
                <Tooltip formatter={(value: unknown, name: unknown) => [formatMoney(Number(value || 0)), String(name)]} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {activeItems.map((item) => (
                  <Line key={item.key} type="monotone" dataKey={item.key} name={item.label} stroke={COLORS[item.key] || '#116CB8'} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="analytics-card top-vehicles-card">
          <div className="analytics-card-header">
            <div>
              <h3>Top vehículos por consumo</h3>
              <p>Vehículos con mayor gasto acumulado en el periodo seleccionado.</p>
            </div>
          </div>
          <div className="ranking-table-wrap">
            <table className="ranking-table">
              <thead><tr><th>#</th><th>Placa</th><th>Vehículo</th><th>Combustible</th><th>Consumo</th><th>Gasto</th></tr></thead>
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
                {!topVehicles.length ? <tr><td colSpan={6} className="empty-row">Sin datos suficientes para el periodo seleccionado.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="analytics-card station-breakdown-card">
          <div className="analytics-card-header station-matrix-header">
            <div>
              <h3>Abastecimiento por estación</h3>
              <p>Solo se muestran estaciones GESA con participación en el periodo seleccionado.</p>
            </div>
            <div className="fuel-view-toggle station-view-toggle" role="group" aria-label="Cambiar vista de estaciones">
              <button type="button" className={stationMode === 'quantity' ? 'active' : ''} onClick={() => setStationMode('quantity')} aria-pressed={stationMode === 'quantity'}>Cantidad</button>
              <button type="button" className={stationMode === 'amount' ? 'active' : ''} onClick={() => setStationMode('amount')} aria-pressed={stationMode === 'amount'}>Soles</button>
            </div>
          </div>
          <div className="station-table-wrap">
            <table className="station-table station-matrix-table">
              <thead>
                <tr>
                  <th>Estación</th>
                  {stationColumns.map((fuel) => (
                    <th key={fuel.key}>
                      <span className="station-product-head">
                        <span className="fuel-dot" style={{ background: COLORS[fuel.key] || '#116CB8' }} />
                        {fuel.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stationRows.map((row) => (
                  <tr key={row.station}>
                    <td><strong>{row.station}</strong></td>
                    {stationColumns.map((fuel) => {
                      const cell = row.fuels.get(fuel.key);
                      return (
                        <td key={fuel.key} className={cell ? 'station-has-value' : 'station-empty-value'}>
                          {cell
                            ? stationMode === 'amount'
                              ? formatMoney(cell.amount)
                              : `${formatQuantity(cell.quantity)} ${cell.unit}`
                            : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!stationRows.length ? <tr><td colSpan={Math.max(1, stationColumns.length + 1)} className="empty-row">Sin abastecimientos por estación para el periodo seleccionado.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
