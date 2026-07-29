# Mapa de evidencia — demo ideathon

**Caso oficial:** `field-001` → `zone-03` → `ORANGE` → riesgo `HIGH`.

## Recorrido oficial

```text
Dashboard (/api/dashboard/summary)
  ↓ zona crítica: score 35, NDVI 0.24, humedad 28 %, temperatura 38 °C
Alertas (/api/alerts)
  ↓ riesgo alto respaldado por sensor, satélite y visión
Recomendaciones (/api/recommendations)
  ↓ inspección de riego y riego correctivo priorizado
Reportes (/api/reports/prescriptive/zone-03)
  ↓ consolida evidencia, alertas, recomendaciones y acciones
Notebook, evidencia técnica sin pantalla propia (/api/field-notebook/zone/zone-03)
  ↓ confirma eventos, responsables, fechas, evidencia y seguimiento
Vision AI (/api/vision/analyze o mock controlado)
  ↓ anomalía visual, áreas secas y clorosis como evidencia VISION
Evidencia técnica
  ↓ capturas, JSON/smoke y notas de bloqueo de la matriz
```

La presentación debe seguir este orden. El Notebook se muestra después del reporte para confirmar las acciones tomadas y pendientes. Vision AI cierra el recorrido como detalle de la evidencia visual que respalda la decisión; no debe presentarse como un modelo productivo mientras la UI y el servicio permanezcan en modo mock controlado.

## Guion y evidencia mínima por paso

| Paso | Mostrar | Fuente técnica | Evidencia mínima |
| --- | --- | --- | --- |
| 1. Dashboard | Prioridad de `zone-03` y métricas del caso oficial | `GET /api/dashboard/summary` | Captura `dashboard-zone-03.png` y smoke/JSON del endpoint. |
| 2. Alertas | Alertas HIGH y evidencia multifuente | `GET /api/alerts` | Captura `alerts-zone-03.png` y PASS de smoke. |
| 3. Recomendaciones | Acción de riego/inspección priorizada | `GET /api/recommendations` | Captura `recommendations-zone-03.png` y PASS de smoke. |
| 4. Reportes | `report-zone-03-001`, acciones y trazabilidad | `GET /api/reports/prescriptive/zone-03` | Captura `reports-zone-03.png`, PASS de smoke y contrato en `REPORTS_STRUCTURE.md`. |
| 5. Notebook | JSON de `fn-001`, `fn-002` y `fn-003`; no existe una pantalla dedicada | `GET /api/field-notebook/zone/zone-03` | PASS de smoke y JSON con evidencia, fecha y responsable por evento. |
| 6. Vision AI | `visualAnomaly`, `dryAreaDetected`, `chlorosisDetected` | `POST /api/vision/analyze` o mock documentado | Captura `vision-ai-zone-03.png` y PASS de smoke marcado como mock. |
| 7. Evidencia técnica | Matriz, resultados de smoke y condiciones conocidas | `docs/evidence/` y `docs/backend/` | Abrir checklist y README de capturas; declarar faltantes antes de cerrar. |

## Trazabilidad del caso

```text
ZoneInsight (ins-003, source: VISION)
  → Alert (alert-zone-03-visual_anomaly)
  → Recommendation (rec-zone-03-visual_anomaly)
  → Report (report-zone-03-001)
  → Notebook: fn-001 inspección, fn-002 riego, fn-003 seguimiento pendiente
```

El reporte incorpora las acciones del Notebook por `zoneId`. `fn-001` conserva además los IDs reales de alerta, recomendación y reporte para trazabilidad documental, pero el servicio de reportes no realiza todavía ese cruce estricto por ID. Es una mejora posterior, no un bloqueo para la demo interna.

## Condiciones que se deben declarar en demo

- Dashboard usa actualmente un mock/fallback controlado en frontend; el endpoint real fue validado con HTTP 200 el 28/jul/2026 y debe acompañar la captura.
- Vision AI responde con un mock compatible con el contrato; no se debe afirmar que hay un modelo de visión real conectado.
- Alerts, Recommendations y Reports pueden usar fallback local si la API no está disponible. Cada captura debe indicar explícitamente la fuente usada.

Los faltantes, responsables y estado de cierre están centralizados en [EVIDENCE_CHECKLIST_PRECLASIFICACION.md](../evidence/EVIDENCE_CHECKLIST_PRECLASIFICACION.md).
