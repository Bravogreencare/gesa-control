# GESA CONTROL

Portal corporativo multiempresa para analítica y control de abastecimientos de clientes de GESA / Grifos Espinoza.

## Objetivo del MVP

Consumir información desde la base transaccional existente de GESA y presentar a cada cliente únicamente sus abastecimientos, vehículos, comprobantes, viajes, rendimiento y analítica de precios.

## Principios

- La base actual de GESA sigue siendo la fuente maestra de despachos y facturación.
- GESA CONTROL no duplica la digitación operativa existente.
- Arquitectura multiempresa con aislamiento por cliente.
- Next.js + TypeScript para la aplicación.
- Supabase PostgreSQL + Auth + Storage para el portal.
- Render para despliegue.
- QR/PIN y autorizaciones digitales quedan para una fase posterior.

## Primer hito

Login → selección de empresa → dashboard → abastecimientos → detalle de comprobante.
