# Sensors

## Responsabilidad

Gestionar la identidad y configuración de dispositivos asociados con Fields. Sensor no almacena mediciones; esas pertenecen a Telemetry.

## Modelo Prisma

`Sensor`: `id`, `fieldId`, `type`, `name`, `status` e `installedAt`.

## Relaciones

Sensor pertenece a Field y tiene muchas `TelemetryReading`.

## Archivos

Controller y service son skeletons documentados; router está vacío y compilable; tipos y schemas están listos.

## Service API prevista

`getSensors()`, `getSensorById(id)`, `getSensorsByFieldId(fieldId)`, `createSensor(input)` y `updateSensor(id, input)`.

## Endpoints previstos

- `GET /api/sensors`
- `GET /api/sensors/:id`
- `GET /api/sensors/field/:fieldId`
- `POST /api/sensors`
- `PATCH /api/sensors/:id`

## Validación

`createSensorSchema`, `updateSensorSchema`, `sensorIdParamSchema` y `fieldIdParamSchema`.

## Estado actual

Preparado sin handlers, mocks ni registro en `app.ts`.

## Pendientes para persistencia real

Implementar controller/service con el Prisma compartido y registrar las rutas.

## Fuera de alcance

Lecturas, agregaciones y procesamiento de telemetría.
