import Link from 'next/link';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/logout-button';
import PortalSidebar from '@/components/portal-sidebar';
import FuelDashboard, {
  type FuelDefinition,
  type FuelRecord,
} from '@/components/fuel-dashboard';
import { createClient } from '@/lib/supabase/server';

const moneyFormatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const numberFormatter = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

function money(value: number) {
  return moneyFormatter.format(value || 0);
}

function number(value: number) {
  return numberFormatter.format(value || 0);
}

function limaDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function limaDayUtcBounds() {
  const key = limaDateKey(new Date());
  if (!key) return null;
  const start = new Date(`${key}T05:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

const fuelTypes: FuelDefinition[] = [
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
  const dayBounds = limaDayUtcBounds();

  const analyticsQuery = supabase
    .from('abastecimientos')
    .select(`
      id, creado_en,
      vehiculos(placa,marca,modelo),
      despachos(
        fecha_evento,cantidad,unidad,total,
        estaciones(nombre),
        productos(nombre)
      )
    `)
    .eq('empresa_id', selectedId)
    .order('creado_en', { ascending: false })
    .limit(1000);

  let recentQuery = supabase
    .from('abastecimientos')
    .select(`
      id, kilometraje, creado_en,
      vehiculos(placa),
      viajes(codigo_corto),
      despachos!inner(
        fecha_evento,numero_recibo,numero_nota_despacho,numero_ticket_nota,
        cantidad,unidad,precio_unitario,total,
        estaciones(nombre),
        productos(nombre),
        despacho_documentos(comprobantes(serie,numero))
      )
    `)
    .eq('empresa_id', selectedId)
    .order('creado_en', { ascending: false })
    .limit(50);

  if (dayBounds) {
    recentQuery = recentQuery
      .gte('despachos.fecha_evento', dayBounds.start)
      .lt('despachos.fecha_evento', dayBounds.end);
  }

  const [{ data: analyticsSupplies }, { data: recentSupplies }] = await Promise.all([
    analyticsQuery,
    recentQuery,
  ]);

  const rows = (analyticsSupplies || []) as any[];
  const recentRows = ((recentSupplies || []) as any[]).slice(0, 25);
  const fuelDefinitionByKey = new Map(fuelTypes.map((item) => [item.key, item]));

  const fuelRecords: FuelRecord[] = rows.flatMap((row) => {
    const dispatch = row.despachos;
    const fuelKey = resolveFuelType(dispatch?.productos?.nombre);
    if (!fuelKey || !dispatch?.fecha_evento) return [];

    const definition = fuelDefinitionByKey.get(fuelKey);
    return [{
      date: dispatch.fecha_evento,
      fuelKey,
      fuelLabel: definition?.label || dispatch?.productos?.nombre || 'Sin clasificar',
      unit: definition?.unit || dispatch?.unidad || '',
      quantity: Number(dispatch?.cantidad || 0),
      amount: Number(dispatch?.total || 0),
      station: dispatch?.estaciones?.nombre || 'Estación sin identificar',
      plate: row.vehiculos?.placa || 'SIN-PLACA',
      vehicle: [row.vehiculos?.marca, row.vehiculos?.modelo].filter(Boolean).join(' ') || 'Vehículo de flota',
    }];
  });

  return (
    <main className="portal-shell">
      <PortalSidebar empresaId={selectedId} active="inicio" />

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
              <p className="eyebrow hero-eyebrow">PORTAL DEL CLIENTE · COMBUSTIBLE</p>
              <h1>Resumen ejecutivo</h1>
              <p>{company?.razon_social}</p>
              <div className="hero-meta"><span>RUC {company?.ruc}</span><span>{membership.rol}</span></div>
            </div>
            <div className="hero-note official-note">Más que combustible,<br/><strong>información para decidir.</strong></div>
          </div>

          <FuelDashboard fuelTypes={fuelTypes} records={fuelRecords} />

          <section className="card table-card portal-table premium-table recent-history-card">
            <div className="card-title-row"><div><p className="eyebrow">HOY</p><h2>Abastecimientos del día</h2></div><span className="quality-badge">Sincronización GESA CONTROL</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Fecha/hora</th><th>Placa</th><th>Km</th><th>Viaje</th><th>Estación</th><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Importe</th><th>Ticket / Nota</th><th>Factura</th><th></th></tr></thead>
                <tbody>
                  {recentRows.map((row) => {
                    const d = row.despachos;
                    const doc = d?.despacho_documentos?.[0]?.comprobantes;
                    const fuelKey = resolveFuelType(d?.productos?.nombre);
                    const productLabel = fuelKey ? fuelDefinitionByKey.get(fuelKey)?.label : d?.productos?.nombre;
                    const ticketNota = d?.numero_ticket_nota || d?.numero_nota_despacho || d?.numero_recibo || '—';
                    return (
                      <tr key={row.id}>
                        <td>{d?.fecha_evento ? new Date(d.fecha_evento).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : '—'}</td>
                        <td><strong>{row.vehiculos?.placa || '—'}</strong></td>
                        <td>{row.kilometraje ?? '—'}</td>
                        <td>{row.viajes?.codigo_corto || '—'}</td>
                        <td>{d?.estaciones?.nombre || '—'}</td>
                        <td>{productLabel || '—'}</td>
                        <td>{number(Number(d?.cantidad || 0))} {d?.unidad || ''}</td>
                        <td>{money(Number(d?.precio_unitario || 0))}</td>
                        <td><strong>{money(Number(d?.total || 0))}</strong></td>
                        <td>{ticketNota}</td>
                        <td>{doc ? `${doc.serie}-${doc.numero}` : 'Pendiente'}</td>
                        <td><Link className="table-link" href={`/portal/abastecimientos/${row.id}`}>Ver →</Link></td>
                      </tr>
                    );
                  })}
                  {!recentRows.length ? <tr><td colSpan={12} className="empty-row">No hay abastecimientos registrados hoy.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
