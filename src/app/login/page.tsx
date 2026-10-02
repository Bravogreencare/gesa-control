import LoginForm from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div>
          <div className="brand-mark large">GESA</div>
          <p className="eyebrow light">PORTAL CORPORATIVO</p>
          <h1>Control de abastecimientos para clientes empresariales.</h1>
          <p>Consulta consumos, comprobantes, vehículos, viajes y analítica desde una sola plataforma.</p>
        </div>
        <small>GESA CONTROL · acceso privado por empresa</small>
      </section>
      <section className="login-card-wrap">
        <div className="login-card">
          <p className="eyebrow">ACCESO EMPRESAS</p>
          <h2>Bienvenido</h2>
          <p className="muted">Ingresa con tus credenciales corporativas.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
