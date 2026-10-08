# Telemetry

Persiste mediciones con la instancia compartida de Prisma. No modifica sensores ni reglas agronómicas.

## API

| Método del servicio | HTTP | Ruta |
| --- | --- | --- |
| `createReading(input)` | POST | `/api/telemetry` |
| `createReadingsBatch(input)` | POST | `/api/telemetry/batch` |
| `getReadingsBySensorId(sensorId)` | GET | `/api/telemetry/sensor/:sensorId` |
| `getReadingsByFieldId(fieldId)` | GET | `/api/telemetry/field/:fieldId` |
| `getLatestReadingsByFieldId(fieldId)` | GET | `/api/telemetry/field/:fieldId/latest` |

Las rutas están registradas en `app.ts`. Se utilizan `prisma.telemetryReading.create`, `createMany` y `findMany`.

## Contrato

Cada respuesta de lectura contiene `id`, `sensorId` y `fieldId` numéricos; `metric`, `unit` y `recordedAt` textuales; `value` numérico; `quality` string o null. Prisma Decimal se convierte a number y DateTime a ISO 8601. No se usa `timestamp`.

Ejemplo POST (los IDs deben existir):

```json
{
  "sensorId": 1,
  "fieldId": 1,
  "metric": "SOIL_MOISTURE",
  "value": 32.1256,
  "unit": "%",
  "quality": null,
  "recordedAt": "2026-10-08T00:00:00Z"
}
```

`quality` y `recordedAt` son opcionales al crear. Si faltan, se almacenan null y la hora actual del servidor, respectivamente. POST devuelve 201 y la lectura creada.

El batch recibe directamente un arreglo no vacío de esos objetos, según `CreateTelemetryBatchInput`. Todos se validan antes de llamar a `createMany`. La inserción es atómica y no omite duplicados; devuelve 201 con `data: { "count": N }`, no las filas insertadas.

## Consultas y validación

Las consultas históricas se ordenan por `recordedAt` descendente e ID descendente para desempatar. `/latest` devuelve la última lectura de cada combinación `sensorId`/`metric`, mediante ese orden y `distinct`. Los listados vacíos devuelven 200 con `[]`.

Se validan IDs enteros positivos dentro de PostgreSQL Int, números finitos dentro del rango Decimal(12,4), textos no vacíos y fechas ISO con zona horaria. PostgreSQL redondea valores a cuatro decimales. Los campos desconocidos (incluido `timestamp`) se rechazan. Las claves foráneas comprueban que Sensor y Field existan; el schema no impone que el Field de la lectura sea el mismo asignado al Sensor.

Errores: 400 para validación, referencias inexistentes o valores fuera de rango; 409 para conflictos de unicidad; 500 para otros errores internos. Se conserva el envelope compartido sin exponer detalles de conexión.

## Verificación

Desde `backend`: `npm run build` y `npm run telemetry:test`. La prueba recorre las cinco rutas en la app real con todas las consultas Telemetry sustituidas por Prisma simulado: conversión Decimal/DateTime, fecha por defecto, filtros y orden, distinct, batch, entradas inválidas y errores. No conecta ni modifica PostgreSQL. La atomicidad y el resultado real de distinct dependen de Prisma/PostgreSQL y requieren comprobación de integración contra una base de pruebas. No se modifica el schema ni se ejecutan migraciones.
