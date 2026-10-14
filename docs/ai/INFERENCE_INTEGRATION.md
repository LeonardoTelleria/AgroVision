# Integración Vision AI

## Alcance

Vision AI ejecuta inferencia real con modelos EfficientNet-B0 independientes para `CORN` y `ORANGE`. `RED_BEAN` permanece no disponible y devuelve HTTP 503. No existen predicciones por nombre de archivo ni fallback de clasificación en React.

Flujo:

```text
React -> Express -> FastAPI -> Model Registry -> TorchScript/checkpoint -> Express -> React
```

El loader verifica cultivo, versión, arquitectura, orden de clases, metadatos y SHA256. Prefiere un TorchScript cuyo contrato y checksum sean válidos; en caso contrario utiliza el `best.pt` firmado por Model Registry. Los modelos se cargan en CPU, quedan en caché y cada modelo protege sus inferencias concurrentes.

## Modelos locales esperados

- `CORN`, versión `corn-1.0.0`: `blight`, `common_rust`, `gray_leaf_spot`, `healthy`.
- `ORANGE`, versión `orange-1.0.0`: `black_spot`, `canker`, `greening`, `healthy`, `melanose`.
- `RED_BEAN`: sin pesos reales.

Los checkpoints, exportaciones y reportes permanecen fuera de Git. Nunca se descargan pesos automáticamente.

## Instalación

Se recomienda Python 3.12 para servir TorchScript. En la instalación local con Python 3.14 las pruebas pasan, pero PyTorch advierte que `torch.jit.load` ya no tiene soporte para esa versión y podría dejar de funcionar en una actualización.

Desde `ai-service`, crea el entorno si aún no existe e instala el runtime HTTP:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

En Git Bash utiliza `./.venv/Scripts/python.exe` o activa el entorno con `source .venv/Scripts/activate`; las barras invertidas de PowerShell no funcionan en Bash.

Instala después PyTorch desde el índice oficial apropiado. CPU:

```powershell
.\.venv\Scripts\python.exe -m pip install torch==2.13.0 torchvision==0.28.0 --index-url https://download.pytorch.org/whl/cpu
```

Verifica:

```powershell
.\.venv\Scripts\python.exe -c "import torch, torchvision; print(torch.__version__, torchvision.__version__, torch.cuda.is_available())"
```

## Ejecución

FastAPI:

```powershell
cd ai-service
$env:VISION_ABSTENTION_THRESHOLD="0.60"
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Si `/health` responde pero `/models/status` devuelve 404, el puerto 8000 está atendido por un proceso antiguo: detén ese proceso y vuelve a iniciar Uvicorn con el código actualizado.

El umbral `0.60` es provisional y no fue calibrado con test. Un softmax inferior produce `UNKNOWN`, pero conserva `detectedClass` y `topClasses` para inspección técnica.

Express, desde la raíz del repositorio:

```powershell
$env:AI_SERVICE_URL="http://127.0.0.1:8000"
npm run dev:backend
```

React:

```powershell
npm run dev:frontend
```

## Endpoints

Estado real, sin rutas internas:

```text
GET http://127.0.0.1:8000/models/status
```

Inferencia directa FastAPI:

```powershell
curl.exe -X POST http://127.0.0.1:8000/vision/analyze -F "image=@C:\ruta\hoja.jpg;type=image/jpeg" -F "cropType=CORN" -F "fieldId=field-001" -F "zoneId=zone-01" -F "imageFileName=hoja.jpg"
```

Flujo completo mediante Express:

```powershell
curl.exe -X POST http://localhost:3000/api/vision/analyze -F "image=@C:\ruta\hoja.jpg;type=image/jpeg" -F "cropType=ORANGE" -F "fieldId=field-001" -F "zoneId=zone-01" -F "imageFileName=hoja.jpg"
```

## Contrato

La respuesta conserva los campos históricos y añade:

- `detectedClass`: etiqueta agronómica específica del modelo;
- `modelId`, `modelVersion`, `architecture`;
- `topClasses`: tres puntuaciones softmax ordenadas;
- `inferenceMs`: duración del forward pass en CPU.

Mapeo general:

- `healthy` -> `HEALTHY`;
- cualquier enfermedad específica -> `VISUAL_ANOMALY`;
- puntuación bajo el umbral -> `UNKNOWN`.

Softmax no representa precisión estadística ni probabilidad calibrada. No se calculan cobertura verde, área seca, clorosis, manchas localizadas, estrés, severidad ni regiones; esos campos son `null`.

## Pruebas

```powershell
cd ai-service
$env:PYTHONDONTWRITEBYTECODE="1"
.\.venv\Scripts\python.exe -m unittest discover -s tests -v

cd ..
npm --prefix backend run vision:test
npm run build:backend
npm run build:frontend
```

Las pruebas reales utilizan muestras de `train`, no el conjunto `test`, para no ajustar el umbral con la evaluación final.

## Limitaciones

- Solo clasifica las clases cerradas declaradas para cada cultivo.
- `UNKNOWN` no identifica una enfermedad nueva.
- Las recomendaciones requieren verificación agronómica antes de actuar.
- El dataset Citrus mezcla muestras de cítricos y no garantiza que todas correspondan exclusivamente a `Citrus sinensis`.
- La latencia depende del CPU y de la concurrencia del equipo.
- El build del backend corrige las referencias `.ts` del cliente Prisma ya compilado mediante `scripts/fixPrismaRuntimeImports.cjs`. Se probó el servidor completo `backend/dist/server.js` y el flujo Express ↔ FastAPI con imágenes reales de `train` para CORN y ORANGE.
- En esta copia local, `/api/health` devuelve `database: DOWN` porque PostgreSQL no está disponible. Esto no impide probar `/api/vision/analyze`, pero las funciones que sí usan la base de datos requieren iniciarla y configurar `DATABASE_URL`.
