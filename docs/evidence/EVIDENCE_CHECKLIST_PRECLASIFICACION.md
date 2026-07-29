# Checklist de evidencias — preclasificación

**Caso oficial de demo:** `field-001` · `zone-03` · `ORANGE` · riesgo `HIGH`

**Propósito:** confirmar que cada pantalla y contrato crítico tiene evidencia lista para la demo interna, o un bloqueo explícito.
**Corte de esta matriz:** 28/jul/2026.

## Matriz de evidencias por módulo

| Módulo | Pantalla / alcance | Endpoint o fuente | Captura esperada | JSON / resultado esperado | Responsable | Estado | Bloqueo o condición |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Frontend | Dashboard | `GET /api/dashboard/summary` | `dashboard-zone-03.png` | Caso `field-001` / `zone-03`, `ORANGE`, score 35, NDVI 0.24, humedad 28 % y 38 °C | Brandon | Pendiente de captura | La pantalla usa `dashboardMock` como fallback/control de demo; el endpoint ya tiene validación documentada, pero falta la captura. |
| Frontend | Alerts | `GET /api/alerts` | `alerts-zone-03.png` | Alertas activas de `zone-03`, incluida evidencia multifuente | Brandon | Pendiente de captura | El servicio tiene fallback local; la captura debe identificar si se hizo contra API o fallback. |
| Frontend | Recommendations | `GET /api/recommendations` | `recommendations-zone-03.png` | Recomendación prioritaria de riego/inspección para `zone-03` con evidencia relacionada | Brandon | Pendiente de captura | El servicio tiene fallback local; la captura debe identificar si se hizo contra API o fallback. |
| Frontend | Reports | `GET /api/reports/prescriptive/zone-03` | `reports-zone-03.png` | `report-zone-03-001`, alertas, recomendaciones, acciones tomadas y pendientes | Brandon | Pendiente de captura | El servicio tiene fallback local; la captura debe identificar si se hizo contra API o fallback. |
| Frontend | Vision AI | `POST /api/vision/analyze` o mock controlado | `vision-ai-zone-03.png` | Señales `visualAnomaly`, `dryAreaDetected` y `chlorosisDetected` con fuente `VISION` | Brandon | Pendiente de captura | La UI usa `visionAIMock`; no representa una inferencia de modelo real. |
| Frontend | Crops | `GET /api/crops/profiles` | No requerida para el recorrido oficial | Perfiles de cultivo disponibles para el caso `ORANGE` | Brandon | Listo sin captura | Smoke test registrado como PASS; no es una pantalla del recorrido oficial. |
| Backend | Contratos críticos | Dashboard, alerts, recommendations, reports, notebook y crops | `docs/backend/SMOKE_TEST_RESULTS.md` | Respuestas HTTP 200 bajo contrato `ApiResponse` y datos del caso oficial | Leo | Verificado el 28/jul/2026 | Sin bloqueo técnico; Dashboard fue validado por separado porque el script de smoke aún no lo incluye. |
| AI Service | Análisis visual preliminar | `POST /api/vision/analyze` | `vision-ai-zone-03.png` y `docs/ai/AI_LIMITATIONS.md` | Respuesta `ApiResponse` con evidencia visual compatible | Leo | Verificado como mock | El endpoint backend responde, pero no prueba un modelo entrenado ni el servicio FastAPI independiente; debe declararse como mock. |
| Reportes | Reporte prescriptivo | `GET /api/reports/prescriptive/zone-03` | `reports-zone-03.png` | Evidencia, `activeAlerts`, recomendaciones, `actionsTaken` y `pendingActions` | Jorge | Verificado el 28/jul/2026 | Responde HTTP 200 bajo `ApiResponse`; el enlace Notebook → reporte se construye por `zoneId`. |
| Notebook | Trazabilidad de campo | `GET /api/field-notebook/zone/zone-03` | No requerida; puede adjuntarse captura de apoyo | `fn-001`, `fn-002` y `fn-003`, con responsable, fecha y evidencia | Jorge | Verificado el 28/jul/2026 | Responde HTTP 200; se corrigieron en `fn-001` los IDs documentales de alerta, recomendación y reporte. |
| Documentación | Matriz, mapa, smoke y estructura de reportes | Archivos en `docs/` | README de estructura de capturas | Referencias a rutas, contratos, condiciones y responsables | Marvin | Listo | No hay bloqueo documental abierto; las capturas pendientes deben enlazarse desde el README. |
| Demo | Recorrido oficial completo | Dashboard → Alertas → Recomendaciones → Reporte → Notebook → Vision AI → Evidencia técnica | `docs/backend/ideathon-demo-evidence-map.md` | Caso `field-001` / `zone-03` trazable de inicio a fin | Equipo | Parcialmente listo | Faltan las cinco capturas y evidencia verificable de publicación en Discord y Trello. |

## Asociación obligatoria pantalla → fuente

| Pantalla | Endpoint o fuente oficial |
| --- | --- |
| Dashboard | `GET /api/dashboard/summary` |
| Alerts | `GET /api/alerts` |
| Recommendations | `GET /api/recommendations` |
| Reports | `GET /api/reports/prescriptive/zone-03` |
| Vision AI | `POST /api/vision/analyze` o mock controlado documentado |
| Crops | `GET /api/crops/profiles` |
| Notebook (evidencia técnica, sin pantalla propia) | `GET /api/field-notebook/zone/zone-03` |

## Faltantes y bloqueos por responsable

| Responsable | Falta exacta | Impacto | Cierre esperado |
| --- | --- | --- | --- |
| Brandon | Capturar y adjuntar/compartir las cinco pantallas sugeridas; indicar en cada una si usa API o fallback/mock. | No impide recorrer la UI, pero falta evidencia visual para la demo. | Añadir los archivos o sus enlaces conforme a `screenshots/README.md`. |
| Leo | El endpoint backend de Vision AI sigue siendo un mock y el servicio FastAPI independiente no forma parte del smoke de demo. | Impide afirmar que existe inferencia real o un modelo entrenado. | Presentarlo como análisis preliminar simulado y conservar la referencia a `AI_LIMITATIONS.md`. |
| Jorge | No hay bloqueo para la demo interna. El servicio de reportes integra el Notebook por `zoneId`; el cruce programático por IDs queda como mejora posterior. | Sin impacto en el recorrido actual; los IDs documentales de `fn-001` ya coinciden con las entidades reales. | Solo abordar si se exige que el servicio resuelva relaciones por ID. |
| Marvin | No hay bloqueo documental abierto en el alcance de esta matriz. | Sin impacto actual. | Verificar que los enlaces de capturas se mantengan cuando se reciban. |
| Equipo | Publicar el paquete y sus evidencias en Discord y Trello. | La entrega externa no puede verificarse desde el repositorio. | Adjuntar enlaces o confirmación verificable en la tarjeta. |

## Evidencia existente de referencia

- [Smoke test de backend](../backend/SMOKE_TEST_RESULTS.md): PASS documentado para crops, alerts, recommendations, reports, notebook y Vision AI mock.
- [Estructura de reportes](../reports/REPORTS_STRUCTURE.md): contrato del reporte prescriptivo y evidencia `VISION`.
- [Mapa oficial de demo](../backend/ideathon-demo-evidence-map.md): secuencia de presentación y condiciones de evidencia.
- [Guía de capturas](screenshots/README.md): nombres, contenido mínimo y forma de enlazar archivos pesados.

## Checklist para Trello

- [x] Reporte y notebook responden.
- [x] Reporte `zone-03` incluye evidencia, alerta, recomendación y acciones.
- [x] Notebook mantiene eventos útiles con evidencia, fecha y responsable.
- [x] Checklist y mapa de demo reflejan el estado real después de las pruebas.
- [x] El mapa de demo refleja únicamente pantallas, endpoints y documentos reales.
- [x] Smoke test, checklist y reportes no se contradicen.
- [ ] Se subió evidencia a Discord y Trello.

### Control documental

- [x] El checklist agrupa evidencias por frontend, backend, AI Service, reportes, notebook y documentación.
- [x] Cada pantalla crítica queda vinculada a endpoint o fuente de datos.
- [x] Cada evidencia tiene responsable, estado y bloqueo si existe.
- [x] El mapa de demo explica el recorrido oficial completo.
> La última casilla permanece pendiente: este repositorio no aporta evidencia verificable de publicación en Discord o Trello.
