# GESA CONTROL — Arquitectura inicial

## Principio rector
La base transaccional/facturación existente de GESA se mantiene como fuente maestra de despachos y comprobantes. GESA CONTROL consume y sincroniza esos datos para ofrecer control y analítica a clientes corporativos.

## Flujo
Base GESA → adaptador de integración → Supabase → portal Next.js → clientes corporativos.

## Multiempresa
Cada cliente corporativo se representa con `empresa_id`. Los datos de flota, viajes, abastecimientos, comprobantes y alertas quedan aislados por RLS. GESA tendrá acceso administrativo mediante una capa de servicio/backend, no mediante exposición directa de datos de otros clientes.

## MVP
1. Login y membresías.
2. Empresas, vehículos, estaciones y productos.
3. Sincronización/importación de despachos GESA.
4. Historial de abastecimientos.
5. Comprobantes.
6. Viajes.
7. Rendimiento con calidad de dato explícita.
8. Refinería vs. pizarra.
9. Alertas.

## Fase 2
Autorización digital opcional mediante QR/PIN de un solo uso, límites y revocación.

## Fase 3
GPS, telemetría e integraciones comerciales/fiscales avanzadas.

## Seguridad
- Supabase Auth.
- RLS por empresa.
- Storage privado para comprobantes.
- No se almacenan secretos en GitHub.
- La integración con la base real de GESA debe ser inicialmente de solo lectura cuando sea posible.
