import LoginForm from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="login-shell premium-login">
      <section className="login-brand-panel official-login-panel">
        <div className="login-brand-overlay" />
        <div className="login-brand-content">
          <div className="login-logo gesa-logo-embedded" role="img" aria-label="GESA - Tu estación de confianza" />
          <p className="eyebrow light">PORTAL CORPORATIVO</p>
          <h1>Control de abastecimientos para clientes empresariales.</h1>
          <p>Consulta consumos, comprobantes, vehículos, viajes y analítica desde una sola plataforma conectada con la información transaccional de GESA.</p>
        </div>
        <small className="login-brand-footer">GESA CONTROL · acceso privado por empresa</small>
      </section>
      <section className="login-card-wrap">
        <div className="login-card premium-login-card">
          <div className="login-card-logo gesa-logo-embedded" role="img" aria-label="GESA" />
          <p className="eyebrow">ACCESO EMPRESAS</p>
          <h2>Bienvenido</h2>
          <p className="muted">Ingresa con tus credenciales corporativas.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
