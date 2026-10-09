# Vision

## Responsabilidad

Recibir una imagen desde el frontend, validar el multipart, enviarla al AI Service y normalizar el resultado técnico como `VisionAnalyzeResponse`.

## Endpoint

`POST /api/vision/analyze` utiliza `multipart/form-data`.

Campos:

- `image`: archivo obligatorio JPEG, PNG o WebP; máximo 10 MB.
- `cropType`: tipo de cultivo obligatorio.
- `fieldId`: identificador obligatorio del campo actual.
- `zoneId`: identificador opcional de zona.
- `imageFileName`: metadato opcional; el backend utiliza como fuente de verdad el nombre del archivo recibido.

## Flujo

```text
Route -> multipart middleware -> Controller -> Zod -> Service
      -> AI_SERVICE_URL/vision/analyze -> normalización -> ApiResponse
```

El backend no analiza píxeles ni decide cómo cargar el futuro modelo. Esa responsabilidad pertenece al AI Service.

## Respuesta normalizada

La propiedad `data` de `ApiResponse` contiene `inspectionId`, contexto de Field/Zone/Crop, predicción, confianza, métricas visuales, explicación, acción recomendada, evidencia y fecha ISO.

## Errores

- `400`: multipart o metadatos inválidos.
- `413`: imagen mayor de 10 MB.
- `415`: formato o contenido no admitido.
- `422`: validación rechazada por el AI Service.
- `502`: AI Service inaccesible o contrato de respuesta inválido.
- `504`: timeout del AI Service.

Todos los errores generados por este módulo utilizan `fail()` y nunca devuelven HTML.

## Pendiente

La persistencia Prisma y el pipeline de inferencia/transfer learning se implementarán en fases posteriores. Hasta entonces `fieldId` conserva el identificador utilizado por la interfaz demo.
