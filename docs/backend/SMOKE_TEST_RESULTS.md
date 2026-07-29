# Smoke Test Results

## Fecha

20 de julio de 2026

## Última validación

28 de julio de 2026

## Fecha de modificacion

26 de julio del 2026

---

## Objetivo

Verificar que los endpoints críticos del backend respondan correctamente y cumplan el contrato `ApiResponse`.

---

## Resultados

| Método | Endpoint | Estado |
|---------|----------|--------|
| GET | /api/health | PASS |
| GET | /api/dashboard/summary | PASS |
| GET | /api/crops/profiles | PASS |
| GET | /api/vegetation/indices?fieldId=field-001 | PASS |
| GET | /api/analysis/zone/zone-03 | PASS |
| GET | /api/risk/field/field-001 | PASS |
| GET | /api/alerts | PASS |
| GET | /api/recommendations | PASS |
| GET | /api/reports/prescriptive/zone-03 | PASS |
| GET | /api/field-notebook/zone/zone-03 | PASS |
| POST | /api/vision/analyze | PASS |

---

## Observaciones

- Todos los endpoints respondieron correctamente.
- Todas las respuestas utilizaron el contrato `ApiResponse`.
- No se detectaron errores de tipado ni rutas sin montar.
- El endpoint de visión utiliza actualmente una respuesta simulada (mock) compatible con el AI Service.
- El smoke se ejecutó con el backend compilado activo en `localhost:3000`; ejecutar solo `npm run smoke:test` sin iniciar el servidor produce `ECONNREFUSED`.
- `GET /api/dashboard/summary` se verificó por separado porque el script actual no lo incluye: respondió HTTP 200 con `criticalZoneId: "zone-03"`, `dominantRiskLevel: "HIGH"` y `healthScore: 35`.
- El reporte de `zone-03` respondió HTTP 200 con 10 evidencias, 4 alertas, 4 recomendaciones, 2 acciones realizadas y 1 acción pendiente.

---

## Errores encontrados

No se detectaron errores durante la compilación, el arranque del servidor ni la ejecución del smoke test.

---

## Correcciones aplicadas

No fue necesario realizar correcciones. Los endpoints y la estructura del proyecto se mantuvieron estables durante la validación.

## Build

Comando ejecutado:

```bash
npm run build
```

- Ejecutado y Sin errores de tipado


Resultado:
Verificado | 200 | OK | GET  /api/health
Verificado | 200 | OK | GET  /api/dashboard/summary
Verificado | 200 | OK | GET  /api/crops/profiles
Verificado | 200 | OK | GET  /api/vegetation/indices?fieldId=field-001
Verificado | 200 | OK | GET  /api/analysis/zone/zone-03
Verificado | 200 | OK | GET  /api/risk/field/field-001
Verificado | 200 | OK | GET  /api/alerts
Verificado | 200 | OK | GET  /api/recommendations
Verificado | 200 | OK | GET  /api/reports/prescriptive/zone-03
Verificado | 200 | OK | GET  /api/field-notebook/zone/zone-03
Verificado | 200 | OK | POST /api/vision/analyze
```

Estado del build:

Build completed successfully.

```
