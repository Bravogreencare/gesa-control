import Link from 'next/link';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/logout-button';
import FuelDashboard, {
  type FuelEvolutionPoint,
  type FuelSummaryItem,
  type StationFuelItem,
  type TopVehicleItem,
} from '@/components/fuel-dashboard';
import { createClient } from '@/lib/supabase/server';

function money(value: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value || 0);
}

function number(value: number, digits = 2) {
  return new Intl.NumberFormat('es-PE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value || 0);
}

const fuelTypes: Array<Pick<FuelSummaryItem, 'key' | 'label' | 'unit'>> = [
  { key: 'DIESEL_B5', label: 'Diésel B5', unit: 'gal' },
  { key: 'REGULAR', label: 'G Regular', unit: 'gal' },
  { key: 'PREMIUM', label: 'G Premium', unit: 'gal' },
  { key: 'GNV', label: 'GNV', unit: 'm³' },
  { key: 'GLP', label: 'GLP', unit: 'L' },
  { key: 'GNL', label: 'GNL', unit: 'kg' },
];

function normalizeProductName(value?: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function resolveFuelType(productName?: string | null) {
  const name = normalizeProductName(productName);
  if (name.includes('GNV')) return 'GNV';
  if (name.includes('GLP')) return 'GLP';
  if (name.includes('GNL')) return 'GNL';
  if (name.includes('PREMIUM')) return 'PREMIUM';
  if (name.includes('REGULAR')) return 'REGULAR';
  if (name.includes('DIESEL') || name.includes('B5')) return 'DIESEL_B5';
  return null;
}

function getWeekStartKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = (date.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
  return start.toISOString().slice(0, 10);
}

function formatWeekLabel(key: string) {
  const date = new Date(`${key}T00:00:00Z`);
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

type VehicleAggregate = {
  plate: string;
  vehicle: string;
  amount: number;
  fuels: Map<string, { quantity: number; amount: number }>;
};

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: memberships } = await supabase
    .from('membresias')
    .select('empresa_id, rol, empresas(id,ruc,razon_social,nombre_comercial)')
    .eq('activo', true);

  const available = (memberships || []) as any[];
  if (!available.length) {
    return (
      <main className="empty-access">
        <div className="login-card">
          <img src="/gesa-logo-clean.svg" alt="GESA" className="empty-logo" />
          <p className="eyebrow">GESA CONTROL</p>
          <h2>Usuario autenticado</h2>
          <p className="muted">Tu cuenta todavía no está asociada a una empresa cliente. Un administrador GESA debe asignarte una membresía.</p>
          <LogoutButton />
        </div>
      </main>
    );
  }

  const params = await searchParams;
  const selectedId = available.some((m) => m.empresa_id === params.empresa) ? params.empresa! : available[0].empresa_id;
  const membership = available.find((m) => m.empresa_id === selectedId)!;
  const company = membership.empresas;

  const { data: supplies } = await supabase
    .from('abastecimientos')
    .select(`
      id, kilometraje, estado_conciliacion, creado_en,
      vehiculos(id,placa,marca,modelo),
      viajes(id,codigo_corto,periodo),
      despachos(
        id,fecha_evento,numero_recibo,cantidad,unidad,precio_unitario,total,moneda,
        estaciones(id,nombre), productos(id,nombre),
        despacho_documentos(comprobantes(id,tipo,serie,numero,total,fecha_emision))
      )
    `)
    .eq('empresa_id', selectedId)
    .order('creado_en', { ascending: false })
    .limit(1000);

  const rows = ((supplies || []) as any[]);
  const recentRows = rows.slice(0, 25);

  const fuelSummary: FuelSummaryItem[] = fuelTypes.map((fuel) => ({
    ...fuel,
    quantity: 0,
    amount: 0,
    count: 0,
  }));

  const fuelSummaryByKey = new Map(fuelSummary.map((item) => [item.key, item]));
  const fuelDefinitionByKey = new Map(fuelTypes.map((item) => [item.key, item]));
  const weekly = new Map<string, FuelEvolutionPoint['values']>();
  const vehicles = new Map<string, VehicleAggregate>();
  const stationFuel = new Map<string, StationFuelItem>();

  for (const row of rows) {
    const dispatch = row.despachos;
    const fuelKey = resolveFuelType(dispatch?.productos?.nombre);
    if (!fuelKey) continue;

    const quantity = Number(dispatch?.cantidad || 0);
    const amount = Number(dispatch?.total || 0);
    const definition = fuelDefinitionByKey.get(fuelKey);
    const summaryItem = fuelSummaryByKey.get(fuelKey);
    if (summaryItem) {
      summaryItem.quantity += quantity;
      summaryItem.amount += amount;
      summaryItem.count += 1;
    }

    if (dispatch?.fecha_evento) {
      const weekKey = getWeekStartKey(dispatch.fecha_evento);
      if (weekKey) {
        const values = weekly.get(weekKey) || {};
        const current = values[fuelKey] || { quantity: 0, amount: 0 };
        values[fuelKey] = {
          quantity: current.quantity + quantity,
          amount: current.amount + amount,
        };
        weekly.set(weekKey, values);
      }
    }

    const plate = row.vehiculos?.placa || 'SIN-PLACA';
    const vehicleName = [row.vehiculos?.marca, row.vehiculos?.modelo].filter(Boolean).join(' ') || 'Vehículo de flota';
    const aggregate = vehicles.get(plate) || {
      plate,
      vehicle: vehicleName,
      amount: 0,
      fuels: new Map<string, { quantity: number; amount: number }>(),
    };
    aggregate.amount += amount;
    const fuelTotals = aggregate.fuels.get(fuelKey) || { quantity: 0, amount: 0 };
    fuelTotals.quantity += quantity;
    fuelTotals.amount += amount;
    aggregate.fuels.set(fuelKey, fuelTotals);
    vehicles.set(plate, aggregate);

    const station = dispatch?.estaciones?.nombre || 'Estación sin identificar';
    const stationKey = `${station}::${fuelKey}`;
    const stationRow = stationFuel.get(stationKey) || {
      station,
      fuelKey,
      fuelLabel: definition?.label || dispatch?.productos?.nombre || 'Sin clasificar',
      unit: definition?.unit || dispatch?.unidad || '',
      quantity: 0,
      amount: 0,
      count: 0,
    };
    stationRow.quantity += quantity;
    stationRow.amount += amount;
    stationRow.count += 1;
    stationFuel.set(stationKey, stationRow);
  }

  const fuelEvolution: FuelEvolutionPoint[] = Array.from(weekly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => ({ period: formatWeekLabel(key), values }));

  const topVehicles: TopVehicleItem[] = Array.from(vehicles.values())
    .map((vehicle) => {
      const principal = Array.from(vehicle.fuels.entries()).sort((a, b) => b[1].amount - a[1].amount)[0];
      const principalKey = principal?.[0] || '';
      const principalTotals = principal?.[1] || { quantity: 0, amount: 0 };
      const definition = fuelDefinitionByKey.get(principalKey);
      return {
        plate: vehicle.plate,
        vehicle: vehicle.vehicle,
        principalFuel: definition?.label || 'Sin clasificar',
        quantity: principalTotals.quantity,
        unit: definition?.unit || '',
        amount: vehicle.amount,
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const stationBreakdown: StationFuelItem[] = Array.from(stationFuel.values())
    .sort((a, b) => b.amount - a.amount || a.station.localeCompare(b.station, 'es'));

  return (
    <main className="portal-shell">
      <aside className="portal-sidebar">
        <div className="official-brand">
          <div className="sidebar-logo-wrap">
            <img src="/gesa-logo-clean.svg" alt="GESA - Tu estación de confianza" className="gesa-logo" />
          </div>
        </div>
        <div className="product-name">GESA CONTROL</div>
        <div className="product-sub">Portal corporativo</div>
        <nav>
          <Link className="nav-item active" href={`/portal?empresa=${selectedId}`}>Inicio</Link>
          <Link className="nav-item" href={`/portal/abastecimientos?empresa=${selectedId}`}>Abastecimientos</Link>
          <a className="nav-item">Viajes y rutas</a>
          <a className="nav-item">Rendimiento</a>
          <a className="nav-item">Precios y refinería</a>
          <a className="nav-item">Vehículos</a>
          <a className="nav-item">Comprobantes</a>
          <a className="nav-item">Alertas</a>
        </nav>
        <div className="sidebar-signature">
          <span>Red GESA</span>
          <small>Información para mover tu operación.</small>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar portal-topbar">
          <form method="get" className="company-form">
            <span className="label">Empresa</span>
            <select name="empresa" defaultValue={selectedId}>
              {available.map((m) => <option key={m.empresa_id} value={m.empresa_id}>{m.empresas?.razon_social}</option>)}
            </select>
            <button type="submit" className="small-button">Cambiar</button>
          </form>
          <div className="top-actions"><span className="user-email">{user.email}</span><LogoutButton /></div>
        </header>

        <div className="content portal-content">
          <div className="hero compact official-hero">
            <div className="hero-overlay" />
            <div className="hero-copy">
              <p className="eyebrow hero-eyebrow">PORTAL CORPORATIVO DE COMBUSTIBLE</p>
              <h1>Resumen ejecutivo</h1>
              <p>{company?.razon_social}</p>
              <div className="hero-meta"><span>RUC {company?.ruc}</span><span>{membership.rol}</span></div>
            </div>
            <div className="hero-note official-note">Más que combustible,<br/><strong>información para decidir.</strong></div>
          </div>

          <FuelDashboard items={fuelSummary} evolution={fuelEvolution} topVehicles={topVehicles} stationBreakdown={stationBreakdown} />

          <section className="card table-card portal-table premium-table recent-history-card">
            <div className="card-title-row"><div><p className="eyebrow">HISTORIAL</p><h2>Abastecimientos recientes</h2></div><span className="quality-badge">Sincronización GESA CONTROL</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Fecha/hora</th><th>Placa</th><th>Km</th><th>Viaje</th><th>Estación</th><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Importe</th><th>Comprobante</th><th></th></tr></thead>
                <tbody>
                  {recentRows.map((row) => {
                    const d = row.despachos;
                    const doc = d?.despacho_documentos?.[0]?.comprobantes;
                    const fuelKey = resolveFuelType(d?.productos?.nombre);
                    const productLabel = fuelKey ? fuelDefinitionByKey.get(fuelKey)?.label : d?.productos?.nombre;
                    return (
                      <tr key={row.id}>
                        <td>{d?.fecha_evento ? new Date(d.fecha_evento).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : '—'}</td>
                        <td><strong>{row.vehiculos?.placa || '—'}</strong></td>
                        <td>{row.kilometraje ?? '—'}</td>
                        <td>{row.viajes?.codigo_corto || '—'}</td>
                        <td>{d?.estaciones?.nombre || '—'}</td>
                        <td>{productLabel || '—'}</td>
                        <td>{number(Number(d?.cantidad || 0), 3)} {d?.unidad || ''}</td>
                        <td>{money(Number(d?.precio_unitario || 0))}</td>
                        <td><strong>{money(Number(d?.total || 0))}</strong></td>
                        <td>{doc ? `${doc.serie}-${doc.numero}` : 'Pendiente'}</td>
                        <td><Link className="table-link" href={`/portal/abastecimientos/${row.id}`}>Ver →</Link></td>
                      </tr>
                    );
                  })}
                  {!recentRows.length ? <tr><td colSpan={11} className="empty-row">No hay abastecimientos disponibles para este cliente.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
