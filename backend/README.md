# AgroVision Backend

Backend principal del proyecto AgroVision.

Este servicio expone los endpoints REST consumidos por el frontend y centraliza la lógica de negocio relacionada con cultivos, vegetación, análisis de riesgo, alertas, recomendaciones, reportes, notebook de campo y análisis visual.

---

# Requisitos

- Node.js 20 o superior
- npm
- TypeScript

---

# Instalación

Desde la carpeta `backend` ejecutar:

```bash
npm install
```

---

# Variables de entorno

Crear un archivo `.env` utilizando como referencia `.env.example`.

Variables mínimas:

```env
PORT=3000
NODE_ENV=development
AI_SERVICE_URL=http://localhost:8000
```

---

# Scripts disponibles

| Comando | Descripción |
|----------|-------------|
| `npm run dev` | Ejecuta el servidor en modo desarrollo. |
| `npm run build` | Compila el proyecto TypeScript. |
| `npm run start` | Ejecuta la versión compilada. |
| `npm run smoke:test` | Ejecuta el Smoke Test de los endpoints críticos. |
| `npm run mi:test` | Ejecuta la prueba del módulo de análisis. |
| `npm run field-report:test` | Ejecuta la prueba del servicio de reportes de campo. |

---

# Ejecución

Modo desarrollo:

```bash
npm run dev
```

Compilar proyecto:

```bash
npm run build
```

Ejecutar versión compilada:

```bash
npm run start
```

Ejecutar Smoke Test:

```bash
npm run smoke:test
```

Ejecutar Test del módulo de análisis:

```bash
npm run mi:test
```

Ejecutar la prueba del servicio de reportes:

```bash
npm run field-reports:test
```

---

# Módulos principales

- Crops
- Vegetation
- Analysis
- Risk
- Alerts
- Recommendations
- Reports
- Field Notebook
- Vision

---

# Endpoints críticos

| Método | Endpoint |
|----------|------------------------------|
| GET | `/api/health` |
| GET | `/api/crops/profiles` |
| GET | `/api/vegetation/indices?fieldId=field-001` |
| GET | `/api/analysis/zone/zone-03` |
| GET | `/api/risk/field/field-001` |
| GET | `/api/alerts` |
| GET | `/api/recommendations` |
| GET | `/api/reports/prescriptive/zone-03` |
| GET | `/api/field-notebook/zone/zone-03` |
| POST | `/api/vision/analyze` |

---

# Contrato de respuesta

Todos los endpoints utilizan el contrato `ApiResponse`.

Ejemplo:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "error": null,
  "timestamp": "2026-07-26T10:00:00.000Z"
}
```