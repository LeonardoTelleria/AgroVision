# Crops

El módulo mantiene el catálogo `CropProfile` y los ciclos `Crop` asociados a un Field. Ambos servicios consultan la instancia compartida de Prisma.

## Ciclos de cultivo

`CropService` implementa `getCrops()`, `getCropById(id)`, `getCropsByFieldId(fieldId)`, `createCrop(input)` y `updateCrop(id, input)` con `prisma.crop.findMany`, `findUnique`, `create` y `update`. Los listados se ordenan por ID. Las respuestas usan `CropResponse`, con IDs numéricos y `plantedAt` en ISO 8601.

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/api/crops/cycles` | 200, listado de ciclos |
| GET | `/api/crops/cycles/:id` | 200, ciclo; 404 si falta |
| GET | `/api/crops/field/:fieldId` | 200, listado filtrado; `[]` si no hay ciclos |
| POST | `/api/crops/cycles` | 201, ciclo creado |
| PATCH | `/api/crops/cycles/:id` | 200, ciclo actualizado; 404 si falta |

POST requiere `fieldId`, `cropProfileId`, `cropType`, `name`, `growthStage`, `plantedAt` y `status`. Ejemplo:

```json
{
  "fieldId": 1,
  "cropProfileId": 1,
  "cropType": "ORANGE",
  "name": "Naranjo",
  "growthStage": "VEGETATIVE",
  "plantedAt": "2026-10-08T00:00:00Z",
  "status": "ACTIVE"
}
```

Los IDs del ejemplo deben existir en la base de datos. PATCH admite uno o más campos de POST salvo `fieldId`, que no es editable según `UpdateCropInput`. Los estados permitidos son `ACTIVE`, `HARVESTED` e `INACTIVE`.

Los schemas Zod rechazan IDs inválidos, fechas sin formato ISO con zona horaria, strings vacíos, propiedades desconocidas y PATCH vacío. Los IDs del body deben ser números enteros positivos dentro del rango PostgreSQL Int. Las respuestas conservan el formato compartido `success/data` o `fail`.

Errores: 400 para entradas inválidas o referencias inexistentes a Field/CropProfile; 404 para un ciclo inexistente; 409 para conflictos de unicidad; 500 para otros errores internos. Los mensajes de conexión no se exponen en HTTP.

## Catálogo de perfiles

Se conservan `GET /api/crops` y `GET /api/crops/:type`. `cropProfileService.ts` devuelve `CropProfileResponse`: `id`, `cropType`, `displayName`, `mainRisks`, `preferredMetrics` y `createdAt` en ISO 8601. Los campos opcionales persistidos conservan sus strings o null.

`getProfileByType()` usa `findFirst` porque `cropType` no es único, seleccionando el menor ID. Si falta el tipo solicitado consulta `GENERAL` en la base de datos; si tampoco existe, responde 404. Una tabla vacía devuelve `[]` al listar. El seed actual no crea perfiles.

El contrato técnico legacy `CropProfile` contiene campos ausentes del schema, como `scientificName`, `analysisFocus`, `riskRules` y `recommendationTemplates`. Su adaptación sigue pendiente. Los mocks usados por recomendaciones y el frontend se conservan. No se modifica el schema ni se ejecutan migraciones.

## Verificación

Desde `backend`, ejecutar `npm run build` y `npm run crops:test`. Las pruebas recorren las cinco rutas por HTTP con consultas Prisma simuladas: serialización, filtros, creación, actualización parcial, validación y errores. No conectan ni escriben en PostgreSQL.
