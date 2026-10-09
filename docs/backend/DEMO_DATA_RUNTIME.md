# Demo integral: datos, servicios y verificación

Fecha de auditoría del código: 2026-10-09.

## Estado verificable

El repositorio está preparado para que frontend, backend, PostgreSQL y AI Service trabajen como un único flujo. Los módulos de negocio del frontend ya no sustituyen errores de red con mocks locales: un fallo de API se muestra como error y los datos visibles proceden del backend.

En la máquina donde se realizó esta auditoría no estaban instalados ni activos Docker o PostgreSQL. Por esa razón, la ejecución real de migración, seed y smoke HTTP queda pendiente hasta levantar la infraestructura. Sí quedaron verificados el esquema Prisma, los contratos TypeScript, los builds de backend/frontend y las pruebas unitarias del AI Service.

## Fuente de datos por módulo

| Interfaz | Fuente | Alcance demo |
|---|---|---|
| Dashboard | PostgreSQL a través de `/api/dashboard/summary` | finca, salud, alertas, vegetación, visión, prescripciones, actividad y próximas acciones |
| Cultivos | PostgreSQL a través de `/api/crops/profiles` | ocho perfiles agronómicos completos |
| Alertas | PostgreSQL | seis alertas con evidencia y acción sugerida |
| Recomendaciones | PostgreSQL | cinco acciones priorizadas, dosificación, plazo e impacto |
| Reportes | PostgreSQL | cuatro reportes prescriptivos trazables por zona |
| Cuaderno de campo | PostgreSQL | cinco registros, responsables, seguimiento y evidencias |
| Vision AI | AI Service + PostgreSQL | tres inspecciones iniciales; cada análisis nuevo se persiste |
| Vegetación | PostgreSQL | 30 snapshots NDVI/NDWI/GNDVI de escenario satelital sintético |
| Mapping | escenario GIS/rover sintético declarado | geometría de seis zonas y simulación reproducible; no es un rover físico |
| Clima | Open-Meteo desde el frontend | condiciones externas reales cuando existe conectividad |

El AI Service está en modo `HEURISTIC` y su modelo en estado `NOT_TRAINED`. Sus resultados se presentan explícitamente como preliminares y no como diagnóstico fitosanitario.

## Contenido mínimo de la semilla

| Entidad | Mínimo esperado |
|---|---:|
| Usuarios / fincas | 1 / 1 |
| Parcelas / ciclos de cultivo | 6 / 7 |
| Perfiles de cultivo | 8 |
| Sensores / lecturas | 7 / 49 |
| Análisis de zona | 10 |
| Evidencias | 25 |
| Snapshots de vegetación | 30 |
| Inspecciones visuales | 3 |
| Alertas / recomendaciones | 6 / 5 |
| Entradas de cuaderno / reportes | 5 / 4 |

Las zonas visibles del GIS están alineadas con la base demo:

- `zone-01` a `zone-03`: `field-001`, naranjo.
- `zone-04` a `zone-05`: `field-002`, maíz.
- `zone-06`: `field-003`, frijol rojo.
- `zone-07` a `zone-10`: escenarios adicionales de frijol, yuca, quequisque y sorgo.

## Puesta en marcha

Desde la raíz del repositorio:

```powershell
npm run db:up
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:audit
```

El archivo `compose.yaml` levanta PostgreSQL 17 en `localhost:5432`. La configuración local del backend debe contener:

```env
DATABASE_URL=postgresql://agrovision:agrovision_demo@localhost:5432/agrovision
AI_SERVICE_URL=http://localhost:8000
PORT=3000
```

Después, en terminales separadas:

```powershell
python -m uvicorn main:app --app-dir ai-service --host 127.0.0.1 --port 8000
npm run dev:backend
npm run dev:frontend
```

Con los tres procesos activos, ejecutar:

```powershell
npm run demo:smoke
```

El smoke valida salud conjunta, dashboard, perfiles, alertas, recomendaciones, análisis de `zone-03`, vegetación, historial visual, reporte, cuaderno y mapping. El resultado correcto es `status: PASS`.

## Criterios de aceptación

- `GET /api/health` responde `UP` para backend, database y AI Service.
- `aiAnalyzerMode` es `HEURISTIC` y `aiModelStatus` es `NOT_TRAINED`.
- `npm run db:audit` no informa perfiles faltantes, mínimos insuficientes ni zonas prioritarias incompletas.
- `npm run demo:smoke` pasa sus once comprobaciones.
- `npm run build:backend` y `npm run build:frontend` terminan sin errores.
- La interfaz no fabrica contenido de negocio cuando un endpoint falla.

## Nota de realismo

La demo es real respecto a persistencia, relaciones, endpoints, trazabilidad y renderizado. Sus valores agronómicos son un escenario sintético coherente para demostración; no deben presentarse como mediciones obtenidas de una finca o satélite real. Mapping, telemetría inicial y vegetación sirven para reproducir el caso; Open-Meteo sí es una fuente externa en tiempo real.
