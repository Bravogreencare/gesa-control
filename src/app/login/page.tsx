import LoginForm from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="login-shell premium-login">
      <section className="login-brand-panel official-login-panel">
        <div className="login-brand-overlay" />
        <div className="login-brand-content">
          <div className="login-logo-wrap">
            <img src="/gesa-logo-clean.svg" alt="GESA - Tu estación de confianza" className="login-logo" />
          </div>
          <p className="eyebrow light">PORTAL CORPORATIVO</p>
          <h1>Control de abastecimientos para clientes empresariales.</h1>
          <p>Consulta consumos, comprobantes, vehículos, viajes y analítica desde una sola plataforma conectada con la información transaccional de GESA.</p>
        </div>
        <small className="login-brand-footer">GESA CONTROL · acceso privado por empresa</small>
      </section>
      <section className="login-card-wrap">
        <div className="login-card premium-login-card">
          <img src="/gesa-logo-clean.svg" alt="GESA" className="login-card-logo" />
          <p className="eyebrow">ACCESO EMPRESAS</p>
          <h2>Bienvenido</h2>
          <p className="muted">Ingresa con tus credenciales corporativas.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
