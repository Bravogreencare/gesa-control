import type { Metadata } from 'next';
import './globals.css';
import './sprint1.css';
import './gesa-brand.css';
import './fuel-dashboard.css';
import './gesa-logo-embedded.css';

export const metadata: Metadata = {
  title: 'GESA CONTROL',
  description: 'Portal corporativo de abastecimientos y analítica de flota',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
