# AgroVision AI Service

## Responsabilidad actual

Recibir una imagen multipart real, validar su tamaño, MIME y firma binaria, y producir el contrato técnico que el backend normaliza para la aplicación.

## Ejecución

```text
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Endpoints

- `GET /health`
- `POST /vision/analyze`

El análisis recibe `image`, `cropType`, `fieldId`, `zoneId` e `imageFileName`. Se admiten JPEG, PNG y WebP de hasta 10 MB.

## Contrato de salida

El servicio devuelve predicción, confianza, métricas técnicas, métricas visuales, evidencia, explicación y recomendación. No devuelve `ApiResponse`: esa envoltura y los datos de inspección pertenecen al backend.

## Estado del analizador

La recepción multipart está preparada, pero `visionAnalyser.py` continúa usando la heurística temporal. No existe todavía un modelo entrenado ni carga de pesos en FastAPI.

## Entrenamiento y registro

`training/` contiene el motor reproducible de EfficientNet-B0, evaluación y exportación. `model_registry/registry.json` mantiene los tres cultivos en `NOT_TRAINED` hasta que existan checkpoints reales. PyTorch se instala únicamente en el entorno de entrenamiento mediante `requirements-training.txt`; no forma parte del runtime base del API.

Instrucciones: `docs/ai/TRAINING_GUIDE.md` y `docs/ai/MODEL_REGISTRY.md`.
