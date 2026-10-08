# Crops

## Responsabilidad

Mantener en un mismo módulo el catálogo técnico `CropProfile` y los cultivos/ciclos reales `Crop` asociados con un Field.

## Modelo Prisma

`CropProfile` persiste `id`, `cropType`, `displayName`, `mainRisks`, `preferredMetrics` y `createdAt`. `Crop` persiste IDs numéricos, tipo, nombre, etapa, fecha de plantación y estado.

El contrato enriquecido actual de CropProfile también contiene `scientificName`, `analysisFocus`, `riskRules` y `recommendationTemplates`; esas propiedades no existen en Prisma y no se agregaron al schema.

## Relaciones

Crop pertenece a Field y CropProfile. CropProfile puede relacionarse con varios Crops.

## Archivos

`CropCycle` y `CropProfile` se conservan para los mocks. `CropResponse`, `CropProfileResponse`, inputs y `schemas/cropSchemas.ts` preparan persistencia.

## Service API prevista

- CropProfile: `getAllProfiles()` y `getProfileByType(type)`.
- Crop: `getCrops()`, `getCropById(id)`, `getCropsByFieldId(fieldId)`, `createCrop(input)` y `updateCrop(id, input)`.

## Endpoints previstos

Rutas actuales, que no se modifican hoy: `GET /api/crops` y `GET /api/crops/:type`.

Estructura futura: `GET /api/crops/profiles`, `GET /api/crops/profiles/:type`, `GET /api/crops/cycles`, `GET /api/crops/cycles/:id`, `GET /api/crops/field/:fieldId`, `POST /api/crops/cycles` y `PATCH /api/crops/cycles/:id`.

## Validación

`createCropSchema`, `updateCropSchema`, `cropIdParamSchema`, `fieldIdParamSchema` y `cropTypeParamSchema`.

## Estado actual

`cropProfileService.ts` usa `cropProfilesMock`; `cropService.ts` devuelve `CropCycle[]` hardcodeado. `recommendations/data/recommendationsMock.ts` también consume `cropProfilesMock`, por lo que debe conservarse hasta migrar ese consumidor. El frontend reserva `/api/crops/profiles`, pero todavía usa su propio mock.

## Pendientes para persistencia real

Reemplazar ambos orígenes mock y definir el adapter entre los strings persistidos de CropProfile y el contrato técnico enriquecido.

## Fuera de alcance

Cambiar rutas actuales, dividir el módulo, modificar el schema o implementar análisis agronómico.
