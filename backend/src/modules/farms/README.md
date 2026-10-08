# Farms

## Responsabilidad

Gestionar fincas y conservar temporalmente el overview usado por la demostración.

## Modelo Prisma

`Farm`: `id`, `ownerId`, `name`, `location`, `totalAreaSquareMeters` y `createdAt`. Prisma entrega el área como `Decimal`; el service futuro la convertirá con `Number(value)` para la API.

## Relaciones

Farm pertenece a User mediante `ownerId` y contiene varios Fields.

## Archivos

Se mantienen los nombres históricos `service/` y `routs/`. `types/farmTypes.ts` separa `FarmOverview` legacy de los contratos persistidos. `schemas/farmSchemas.ts` valida body y parámetros.

## Service API prevista

`getFarms()`, `getFarmById(id)`, `createFarm(input)` y `updateFarm(id, input)`. `getFarmOverview()` permanece como compatibilidad.

## Endpoints previstos

- `GET /api/farms`
- `GET /api/farms/:id`
- `POST /api/farms`
- `PATCH /api/farms/:id`
- `GET /api/farms/overview` (legacy/compatibility)

## Validación

`createFarmSchema`, `updateFarmSchema` y `farmIdParamSchema`.

## Estado actual

`GET /api/farms/overview` usa un `FarmOverview` hardcodeado. El runtime no fue modificado.

## Pendientes para persistencia real

Sustituir el objeto hardcodeado, implementar los cuatro métodos y decidir cómo construir el overview desde PostgreSQL.

## Fuera de alcance

Geometrías, coordenadas, Fields, sensores, telemetría y autenticación.
