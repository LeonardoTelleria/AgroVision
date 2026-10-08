# Telemetry

## Responsabilidad

Persistir mediciones producidas por Sensors. Una reading identifica la métrica (`metric`), valor, unidad (`unit`), calidad y momento de captura (`recordedAt`).

## Modelo Prisma

`TelemetryReading`: `id`, `sensorId`, `fieldId`, `metric`, `value`, `unit`, `quality` y `recordedAt`. `value` es `Decimal`; el service lo convertirá a `number` para HTTP.

## Relaciones

Cada reading pertenece a un Sensor y a un Field.

## Archivos

`readingTypes.ts` es el contrato oficial. Controller/service son skeletons y el router está vacío y compilable.

## Service API prevista

`createReading(input)`, `createReadingsBatch(input[])`, `getReadingsBySensorId(sensorId)`, `getReadingsByFieldId(fieldId)` y `getLatestReadingsByFieldId(fieldId)`.

## Endpoints previstos

- `POST /api/telemetry`
- `POST /api/telemetry/batch`
- `GET /api/telemetry/sensor/:sensorId`
- `GET /api/telemetry/field/:fieldId`
- `GET /api/telemetry/field/:fieldId/latest`

## Validación

`createTelemetryReadingSchema`, `createTelemetryBatchSchema`, `sensorIdParamSchema` y `fieldIdParamSchema`.

## Estado actual

Contrato alineado con Prisma; no existían consumidores activos del contrato legacy con `timestamp` e IDs string. No está registrado en `app.ts`.

## Pendientes para persistencia real

Implementar las consultas Prisma, orden por `recordedAt`, batch y serialización de Decimal/DateTime.

## Fuera de alcance

Administración del dispositivo Sensor, reglas agronómicas y análisis.
