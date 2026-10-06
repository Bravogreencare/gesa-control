import { BarChart3, CarFront, ReceiptText } from 'lucide-react';
import LoginForm from '@/components/login-form';

const features = [
  { icon: BarChart3, label: 'Información', detail: 'en tiempo real' },
  { icon: ReceiptText, label: 'Comprobantes', detail: 'y consumos' },
  { icon: CarFront, label: 'Gestión de', detail: 'flotas y viajes' },
];

export default function LoginPage() {
  return (
    <main className="login-shell premium-login gesa-login-v2">
      <section className="login-brand-panel official-login-panel gesa-login-hero">
        <div className="login-brand-overlay gesa-login-overlay" />
        <div className="gesa-login-light gesa-login-light-one" />
        <div className="gesa-login-light gesa-login-light-two" />

        <div className="login-brand-content gesa-login-copy">
          <div className="login-logo-wrap gesa-login-logo-wrap">
            <img src="/gesa-logo-clean.svg" alt="GESA - Tu estación de confianza" className="login-logo" />
          </div>

          <div className="gesa-login-kicker">
            <span>PORTAL CORPORATIVO</span>
            <i />
          </div>

          <h1>
            Control de <span>abastecimientos</span>
            <br />
            para clientes empresariales.
          </h1>

          <p className="gesa-login-description">
            Consulta consumos, comprobantes, vehículos, viajes y analítica desde una sola plataforma conectada con la información transaccional de GESA.
          </p>

          <div className="gesa-login-features" aria-label="Funciones principales">
            {features.map(({ icon: Icon, label, detail }) => (
              <div className="gesa-login-feature" key={label}>
                <span className="gesa-login-feature-icon"><Icon size={21} strokeWidth={1.9} /></span>
                <span>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="market-gesa-brand-chip" aria-label="Market GESA">
          <span className="market-word">market</span>
          <span className="market-leaf" />
          <span className="market-citrus"><i /><i /><i /><i /></span>
          <strong>GESA</strong>
        </div>

        <small className="login-brand-footer gesa-login-footer">GESA CONTROL · acceso privado por empresa</small>
      </section>

      <section className="login-card-wrap gesa-login-card-wrap">
        <div className="gesa-login-backdrop-shape gesa-login-backdrop-one" />
        <div className="gesa-login-backdrop-shape gesa-login-backdrop-two" />

        <div className="login-card premium-login-card gesa-login-card">
          <img src="/gesa-logo-clean.svg" alt="GESA" className="login-card-logo" />
          <p className="eyebrow gesa-login-eyebrow">ACCESO EMPRESAS</p>
          <h2>Bienvenido</h2>
          <p className="muted gesa-login-intro">Ingresa con tus credenciales corporativas para acceder a GESA CONTROL.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
