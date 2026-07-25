# Capturas para demo interna

Esta carpeta reserva la evidencia visual del caso oficial `field-001` / `zone-03` / `ORANGE`. No es obligatorio versionar archivos pesados: si se alojan fuera del repositorio, agregar aquí un enlace y la fecha de captura.

## Nombres sugeridos

| Archivo | Pantalla | Fuente que debe verse o declararse |
| --- | --- | --- |
| `dashboard-zone-03.png` | Dashboard | `/api/dashboard/summary` o mock controlado. |
| `alerts-zone-03.png` | Alerts | `/api/alerts` o fallback local. |
| `recommendations-zone-03.png` | Recommendations | `/api/recommendations` o fallback local. |
| `reports-zone-03.png` | Reports | `/api/reports/prescriptive/zone-03` o fallback local. |
| `vision-ai-zone-03.png` | Vision AI | `/api/vision/analyze` o mock controlado. |

## Criterio de captura

Cada imagen debe mostrar `zone-03` o el contenido inequívocamente asociado al caso oficial. En el comentario de la imagen, PR o tarjeta de Trello indicar:

- fecha y persona que la capturó;
- URL/endoint usado o la leyenda `mock controlado` / `fallback local`;
- resultado visible relevante (riesgo HIGH, recomendación, reporte o evidencia VISION).

## Archivos pesados o externos

Si una imagen no se sube al repositorio, dejar un registro con este formato:

```text
dashboard-zone-03.png — enlace: <URL> — capturada por: <nombre> — fecha: <AAAA-MM-DD> — fuente: <endpoint o mock>
```

No incluir credenciales, tokens, datos personales ni URLs privadas no autorizadas en las capturas.
