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

`cropProfileService.ts` consulta Prisma y devuelve `CropProfileResponse`; `cropService.ts` devuelve `CropCycle[]` hardcodeado. `recommendations/data/recommendationsMock.ts` también consume `cropProfilesMock`, por lo que debe conservarse hasta migrar ese consumidor. El frontend reserva `/api/crops/profiles`, pero todavía usa su propio mock.

## Pendientes para persistencia real

Migrar el origen mock de `cropService.ts` y definir el adapter entre los strings persistidos de CropProfile y el contrato técnico enriquecido.

## Fuera de alcance

Cambiar rutas actuales, dividir el módulo, modificar el schema o implementar análisis agronómico.

## Integración Prisma del catálogo

`cropProfileService.ts` consulta la instancia compartida de Prisma. Los controladores esperan las consultas y devuelven `CropProfileResponse`: `id`, `cropType`, `displayName`, `mainRisks`, `preferredMetrics` y `createdAt` en ISO 8601. Los campos opcionales persistidos conservan sus strings o null; esta respuesta no es el contrato técnico enriquecido `CropProfile`.

`getAllProfiles()` devuelve los registros ordenados por ID; una tabla vacía devuelve `[]`. `getProfileByType()` usa `findFirst` porque `cropType` no es único, seleccionando el menor ID. Si falta el tipo, consulta `GENERAL` en la base de datos; si tampoco existe, el controlador responde 404. Los fallos de base de datos se propagan y producen HTTP 500, sin sustituirse por mocks.

No se modifican rutas ni schema. `cropService.ts`, los mocks de recomendaciones y el servicio frontend conservan sus orígenes actuales. El seed actual no crea perfiles: el catálogo debe estar poblado para devolver registros. La adaptación al contrato técnico enriquecido sigue pendiente.
