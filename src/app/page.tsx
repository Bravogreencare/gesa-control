const kpis = [
  { label: 'Galones del mes', value: '12,580.40', delta: '+6.2%' },
  { label: 'Gasto del mes', value: 'S/ 195,742.36', delta: '+4.8%' },
  { label: 'Abastecimientos', value: '286', delta: '+12.6%' },
  { label: 'Vehículos activos', value: '38', delta: 'de 42 vehículos' },
  { label: 'Rendimiento promedio', value: '8.52 km/gal', delta: '-2.1%' },
];

const rows = [
  ['26/09/2026 19:40','BAU-295','0','—','GESA Puente Piedra','G-PREMIUM','10.689','23.39','250.00','F288-00161299'],
  ['26/09/2026 16:22','AMN-928','315,013','58241','GESA Javier Prado','Diésel B5 S-50','54.100','15.49','837.99','F001-182931'],
  ['26/09/2026 14:15','ABC-123','210,445','58240','GESA Pisco','Diésel B5 S-50','60.000','15.50','930.00','B001-012334'],
  ['26/09/2026 11:03','XYZ-456','418,270','58239','GESA Mala','Diésel B5 S-50','48.250','15.51','748.62','F001-182930'],
  ['26/09/2026 09:27','DEF-789','125,660','58238','GESA Nazca','Gasohol 90','36.800','16.85','620.15','B001-012333'],
];

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">GESA</div>
          <div className="brand-sub">Tu estación de confianza</div>
        </div>
        <div className="product-name">GESA CONTROL</div>
        <div className="product-sub">Portal Corporativo</div>
        <nav>
          {['Inicio','Abastecimientos','Viajes y rutas','Rendimiento','Precios y refinería','Vehículos','Conductores','Comprobantes','Reportes','Alertas','Administración'].map((item, index) => (
            <a key={item} className={index === 0 ? 'nav-item active' : 'nav-item'}>{item}</a>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="label">Empresa</span>
            <button className="select-button">GREEN CARE DEL PERÚ S.A. ▾</button>
          </div>
          <div className="top-actions">
            <button className="date-button">01/09/2026 - 30/09/2026 ▾</button>
            <div className="user-pill"><strong>DB</strong><span>Daniel Bravo<br/><small>Administrador</small></span></div>
          </div>
        </header>

        <div className="content">
          <div className="hero">
            <div>
              <p className="eyebrow">PORTAL CORPORATIVO DE COMBUSTIBLE</p>
              <h1>Resumen ejecutivo</h1>
              <p>Información consolidada de abastecimientos y consumo de flota en la red GESA.</p>
            </div>
            <div className="hero-note">Más que combustible,<br/>información para decidir.</div>
          </div>

          <section className="kpi-grid">
            {kpis.map((kpi) => (
              <article className="card kpi" key={kpi.label}>
                <span>{kpi.label}</span>
                <strong>{kpi.value}</strong>
                <small>{kpi.delta}</small>
              </article>
            ))}
          </section>

          <section className="analytics-grid">
            <article className="card chart-card">
              <div className="card-head"><h2>Consumo mensual</h2><span>Últimos 6 meses</span></div>
              <div className="fake-chart">
                <div className="line line-a"/><div className="line line-b"/><div className="line line-c"/>
                <div className="axis-labels"><span>Abr</span><span>May</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Sep</span></div>
              </div>
              <div className="legend"><span>● Diésel B5 S-50</span><span>● Diésel B5 S-500</span><span>● Gasohol</span></div>
            </article>

            <article className="card distribution-card">
              <div className="card-head"><h2>Gasto por estación</h2><span>Total del mes</span></div>
              <div className="donut"><div><strong>S/ 195,742</strong><small>Total del mes</small></div></div>
              <ul className="station-list">
                <li><span>GESA Puente Piedra</span><strong>28.5%</strong></li>
                <li><span>GESA Javier Prado</span><strong>24.1%</strong></li>
                <li><span>GESA Pisco</span><strong>18.7%</strong></li>
                <li><span>Otras estaciones</span><strong>28.7%</strong></li>
              </ul>
            </article>

            <article className="card latest-card">
              <div className="card-head"><h2>Últimos abastecimientos</h2><a>Ver todos →</a></div>
              <div className="latest-list">
                {rows.slice(0,4).map(r => <div key={r[0]+r[1]}><span>{r[1]}</span><strong>{r[6]} gal</strong><small>S/ {r[8]}</small></div>)}
              </div>
            </article>
          </section>

          <section className="card table-card">
            <div className="tabs"><strong>Abastecimientos</strong><span>Viajes y rutas</span><span>Rendimiento</span><span>Precios</span><span>Alertas</span></div>
            <div className="filters">
              <input placeholder="Buscar por placa, viaje, comprobante..." />
              <button>Todas las estaciones ▾</button>
              <button>Todos los productos ▾</button>
              <button className="primary">Buscar</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr>{['Fecha/Hora','Placa','Km','Viaje','Estación','Producto','Galones','Precio','Importe','Comprobante'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{rows.map((r,i) => <tr key={i}>{r.map((c,j)=><td key={j}>{j===8 ? `S/ ${c}` : c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </section>

          <footer className="demo-footer">Maqueta funcional · datos demostrativos · integración GESA pendiente</footer>
        </div>
      </section>
    </main>
  );
}
