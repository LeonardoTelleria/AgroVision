# Sensors

Gestiona dispositivos asociados a Fields mediante la instancia compartida de Prisma. Las mediciones pertenecen a Telemetry y no se modifican aquí.

## Servicio y rutas

| Método del servicio | Método HTTP | Ruta |
| --- | --- | --- |
| `getSensors()` | GET | `/api/sensors` |
| `getSensorById(id)` | GET | `/api/sensors/:id` |
| `getSensorsByFieldId(fieldId)` | GET | `/api/sensors/field/:fieldId` |
| `createSensor(input)` | POST | `/api/sensors` |
| `updateSensor(id, input)` | PATCH | `/api/sensors/:id` |

Las rutas están registradas en `app.ts`. Se utilizan `prisma.sensor.findMany`, `findUnique`, `create` y `update`. Los listados se ordenan por ID; un filtro sin resultados devuelve `[]`.

## Contratos y validación

`SensorResponse` devuelve `id`, `fieldId`, `type`, `name`, `status` e `installedAt` en ISO 8601. POST requiere los cinco campos de `CreateSensorInput`; los IDs del body son números enteros positivos dentro del rango PostgreSQL Int y Field debe existir.

```json
{
  "fieldId": 1,
  "type": "SOIL_MOISTURE",
  "name": "Sensor norte",
  "status": "ACTIVE",
  "installedAt": "2026-10-08T00:00:00Z"
}
```

PATCH admite uno o más de `type`, `name` y `status`, según `UpdateSensorInput`. No cambia `fieldId` ni `installedAt`. Estados: `ACTIVE`, `INACTIVE`, `MAINTENANCE`.

Schemas Zod rechazan fechas inválidas, strings vacíos, IDs inválidos, propiedades desconocidas y actualizaciones vacías. Las respuestas usan el envelope compartido de la API: GET/PATCH 200, POST 201; validación o Field inexistente 400; Sensor inexistente 404; conflicto de unicidad 409; fallos internos 500. No se exponen detalles privados de conexión.

## Verificación

Desde `backend`, ejecutar `npm run build` y `npm run sensors:test`. Las pruebas usan la app real por HTTP y sustituyen todas las consultas Sensor por Prisma simulado; no conectan ni escriben en PostgreSQL. Cubren las cinco rutas, filtros, serialización, cambios parciales, entradas inválidas y errores. No se modifica el schema ni se ejecutan migraciones.
