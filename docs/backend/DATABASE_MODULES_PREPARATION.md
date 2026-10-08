# Preparación de módulos de base de datos

## 1. Arquitectura

```text
HTTP -> Route -> Controller -> Zod -> Service -> Prisma compartido -> PostgreSQL
Service result -> ok()/fail() -> ApiResponse<T> -> JSON
```

No se crearán repositories, DAO ni instancias de Prisma por módulo.

## 2. Estado actual

Los contratos HTTP, schemas Zod y límites de los módulos están definidos. Farms, Fields y Crops conservan su runtime mock. Sensors y Telemetry permanecen sin handlers y sin registro en `app.ts`.

## 3. Modelos Prisma

Esta preparación utiliza `User`, `Farm`, `Field`, `CropProfile`, `Crop`, `Sensor` y `TelemetryReading` sin modificar `schema.prisma`.

## 4. Relación entre módulos

```text
User
 ↓
Farm
 ↓
Field
 ├── Crop
 └── Sensor
       ↓
   TelemetryReading
```

Los IDs persistidos son `Int`. Los `DateTime` salen por API como ISO string. Los `Decimal` de áreas y telemetría se convertirán con `Number(value)` en los services.

## 5. Métodos objetivo

- Farms: listar, buscar por ID, crear y actualizar; overview queda como compatibilidad.
- Fields: listar, buscar por ID/Farm, crear y actualizar.
- CropProfile: listar y buscar por tipo.
- Crops: listar, buscar por ID/Field, crear y actualizar.
- Sensors: listar, buscar por ID/Field, crear y actualizar.
- Telemetry: crear una/batch, consultar por Sensor/Field y obtener las últimas por Field.

## 6. Endpoints objetivo

Los endpoints completos están en el README de cada módulo. Las rutas legacy de Farms/Fields/Crops no cambian hoy. Sensors y Telemetry se registrarán cuando tengan handlers reales.

## 7. Tipos

Los contratos nuevos usan IDs `number`, fechas ISO y `number` para Decimals serializados. Los contratos legacy consumidos por mocks se conservan separados.

## 8. Schemas

Cada módulo valida IDs positivos, textos obligatorios, valores finitos/positivos, enums Prisma y fechas ISO según corresponda.

## 9. Mocks pendientes

- `farms/service/farmService.ts`: overview hardcodeado.
- `fields/services/fieldService.ts`: `Field[]` hardcodeado.
- `crops/services/cropService.ts`: `CropCycle[]` hardcodeado.
- `crops/data/cropProfileMock.ts`: `cropProfilesMock` (también consumido por `recommendations/data/recommendationsMock.ts`).

Los mocks de dashboard, análisis y demás módulos están fuera del alcance de esta fase.

## 10. Orden de implementación

```text
FASE 0
Verificar Prisma + build

FASE 1
Conectar databaseHealth a /api/health

FASE 2
Implementar seeds.ts inicial

FASE 3
Farm → Prisma
pruebas POST/GET

FASE 4
Field → Prisma
pruebas POST/GET

FASE 5
CropProfile → Prisma

FASE 6
Crop → Prisma
pruebas POST/GET

FASE 7
Sensor → Prisma
pruebas POST/GET

FASE 8
Telemetry → Prisma
pruebas POST/GET/batch/latest

FASE 9
Completar seed integral

FASE 10
Registrar Sensors y Telemetry en app.ts

FASE 11
Prueba integral de persistencia

FASE 12
Build final

STOP
```

## 11. No tocar todavía

Frontend, IA, Mapping, Dashboard, Analysis, Risk, Vision, Vegetation, Alerts, Recommendations, Reports, Field Notebook, migraciones y relaciones del schema.

## Prueba integral de persistencia

1. Crear u obtener User.
2. Crear Farm.
3. Crear Field.
4. Crear CropProfile.
5. Crear Crop.
6. Crear Sensor.
7. Crear TelemetryReading.
8. Consultar cada entidad.
9. Reiniciar backend.
10. Repetir GET.

Si los datos permanecen después de reiniciar el backend, están persistidos realmente en PostgreSQL.
