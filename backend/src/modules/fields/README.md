# Fields

## Responsabilidad

Gestionar parcelas productivas pertenecientes a una Farm.

## Modelo Prisma

`Field`: `id`, `farmId`, `name`, `areaSquareMeters`, `soilType`, `irrigationType`, `status` y `createdAt`. `areaSquareMeters` es `Decimal` en Prisma y será convertido a `number` por el service.

## Relaciones

Cada Field pertenece a una Farm. Un Field tiene relaciones con `Crop[]` y `Sensor[]`; no contiene un `cropId` directo.

## Archivos

El tipo `Field` legacy se conserva para el mock actual. `FieldResponse`, inputs y `schemas/fieldSchemas.ts` representan la persistencia futura.

## Service API prevista

`getFields()`, `getFieldById(id)`, `getFieldsByFarmId(farmId)`, `createField(input)` y `updateField(id, input)`.

## Endpoints previstos

- `GET /api/fields`
- `GET /api/fields/:id`
- `GET /api/fields/farm/:farmId`
- `POST /api/fields`
- `PATCH /api/fields/:id`

## Validación

`createFieldSchema`, `updateFieldSchema`, `fieldIdParamSchema` y `farmIdParamSchema`.

## Estado actual

`GET /api/fields` devuelve un arreglo hardcodeado con campos legacy como `cropId`, `drainageStatus` y `lastInspectionAt`. El runtime no fue modificado.

## Pendientes para persistencia real

Implementar el service Prisma y mapear `DateTime` a ISO string y `Decimal` a number.

## Fuera de alcance

Persistencia de Crops, Sensors, Telemetry y geometría GIS.
