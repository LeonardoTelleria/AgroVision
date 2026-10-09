# AgroVision Training Engine v1.0

## Estado y alcance

El Training Engine prepara entrenamientos independientes de EfficientNet-B0 para `CORN`, `RED_BEAN` y `ORANGE`. El código no se importa desde FastAPI y PyTorch permanece fuera de `requirements.txt` para mantener liviano el servicio de inferencia.

No se ejecutó entrenamiento durante la implementación y no existen pesos reales. La primera ejecución con `IMAGENET1K_V1` descargará aproximadamente 20.5 MB de pesos preentrenados desde PyTorch en la computadora autorizada para entrenar.

Cada cultivo conserva clases incompatibles en un clasificador separado:

- `CORN`: `blight`, `common_rust`, `gray_leaf_spot`, `healthy`.
- `RED_BEAN`: `angular_leaf_spot`, `bean_rust`, `healthy`.
- `ORANGE`: `black_spot`, `canker`, `greening`, `healthy`, `melanose`.

El orden se fija en `ai-service/training/config.yaml` y se valida contra `ai-service/config/datasets.yaml`.

## Módulos implementados

- `config.py`: carga y valida rutas, clases, hiperparámetros y compatibilidad con Dataset Manager.
- `dataset_loader.py`: consume el manifiesto, valida imágenes, hashes, etiquetas y ausencia de leakage.
- `modeling.py`: construye EfficientNet-B0, preprocessing, augmentations y congelación progresiva.
- `engine.py`: DataLoaders, class weighting, épocas, mixed precision, early stopping y latencia.
- `metrics.py`: accuracy, precision/recall/F1 macro, F1 por clase y matriz de confusión.
- `checkpoints.py`: contrato, escritura atómica, lectura y reanudación reproducible de checkpoints.
- `train.py`: CLI y coordinación de las etapas classifier/fine-tuning; nunca consulta test.
- `evaluate.py`: evaluación real de validation o test y creación del reporte JSON.
- `exportModel.py`: exportación TorchScript desde un checkpoint real registrado.
- `export_contract.py`: validación estructural, de ruta y checksum del artefacto exportado.
- `runtime.py`: carga diferida de PyTorch, dispositivo, semillas y escritura JSON atómica.

## Hardware recomendado

- GPU NVIDIA con CUDA: 8 GB de VRAM recomendados. Con 4–6 GB debe reducirse `batchSize`.
- CPU: compatible para validación y pruebas, pero el entrenamiento completo será considerablemente más lento.
- RAM: 16 GB recomendados.
- Disco: espacio para los ZIP, `data/processed`, checkpoints por época y exportaciones. Todos estos artefactos están excluidos de Git.

Mixed precision se activa automáticamente solo en CUDA. En CPU se desactiva. `--device cuda` falla explícitamente cuando CUDA no está disponible.

## Instalación en otra PC

La combinación verificada en la matriz oficial es PyTorch 2.13.0 con Torchvision 0.28.0. Debe elegirse el índice que coincida con el equipo; no se deben mezclar ruedas CPU y CUDA.

Usa Python 3.11 o 3.12 para evitar incompatibilidades de ruedas. Primero entra a `ai-service` y crea el entorno virtual **dentro de esa carpeta**. Los comandos para activarlo dependen de la terminal.

### Windows con Git Bash

```bash
cd ai-service
python -m venv .venv-training
source .venv-training/Scripts/activate
python --version
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

En Git Bash deben usarse `/`; una ruta como `.venv-training\Scripts\python` pierde las barras invertidas porque Bash las interpreta como caracteres de escape. Sin activar el entorno, el ejecutable equivalente es `./.venv-training/Scripts/python.exe`.

### Windows con PowerShell

```powershell
cd ai-service
py -3.12 -m venv .venv-training
.\.venv-training\Scripts\Activate.ps1
python --version
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Si PowerShell no permite ejecutar `Activate.ps1`, no es necesario cambiar la política del sistema: usa directamente `.\.venv-training\Scripts\python.exe -m pip ...`.

### Linux o macOS

```bash
cd ai-service
python3 -m venv .venv-training
source .venv-training/bin/activate
python --version
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Después de activar el entorno, selecciona **solo una** de las siguientes instalaciones de PyTorch.

CPU, Windows o Linux:

```bash
python -m pip install torch==2.13.0 torchvision==0.28.0 --index-url https://download.pytorch.org/whl/cpu
```

CUDA 12.6:

```bash
python -m pip install torch==2.13.0 torchvision==0.28.0 --index-url https://download.pytorch.org/whl/cu126
```

CUDA 13.0:

```bash
python -m pip install torch==2.13.0 torchvision==0.28.0 --index-url https://download.pytorch.org/whl/cu130
```

CUDA 13.2:

```bash
python -m pip install torch==2.13.0 torchvision==0.28.0 --index-url https://download.pytorch.org/whl/cu132
```

macOS:

```bash
python -m pip install torch==2.13.0 torchvision==0.28.0
```

Verificación del entorno y de CUDA:

```bash
python -c "import sys, torch, torchvision; print(sys.executable); print(torch.__version__, torchvision.__version__); print('CUDA:', torch.cuda.is_available())"
```

Consultar siempre el selector [Start Locally](https://docs.pytorch.org/get-started/locally/) y la [matriz oficial de versiones](https://pytorch.org/get-started/previous-versions/) si cambia el sistema operativo, Python, driver o CUDA.

## Preparación de datos

```bash
python -m app.dataset_manager.cli audit --raw data/raw --output data/reports/audit.json
python -m app.dataset_manager.cli prepare --raw data/raw --out data/processed/v1 --seed 42 --report data/reports/prepare.json
```

Actualmente `CORN` y `ORANGE` están disponibles localmente. `RED_BEAN` falla de forma intencional y clara hasta instalar `train.zip`, `validation.zip` y `test.zip` de iBean y volver a ejecutar Dataset Manager.

## Entrenamiento

Desde `ai-service`, con una versión nueva y explícita:

```text
python -m training.train --crop CORN --model-version corn-1.0.0 --device cuda --verify-hashes
python -m training.train --crop RED_BEAN --model-version red-bean-1.0.0 --device cuda --verify-hashes
python -m training.train --crop ORANGE --model-version orange-1.0.0 --device cuda --verify-hashes
```

Para CPU se usa `--device cpu`; `--device auto` selecciona CUDA cuando está disponible.

Reanudación:

```text
python -m training.train --crop CORN --model-version corn-1.0.0 --device cuda --resume checkpoints/CORN/corn-1.0.0/last.pt
```

El flujo realiza:

1. Etapa `classifier`: congela `model.features` y entrena el clasificador.
2. Etapa `fine_tuning`: descongela progresivamente los últimos bloques configurados.
3. AdamW, `ReduceLROnPlateau`, pesos de clase balanceados y label smoothing.
4. Early stopping por etapa.
5. Selección global de `best.pt` exclusivamente por macro-F1 de validation.
6. `last.pt` reanudable con estados del modelo, optimizador, scheduler, AMP, early stopping, historial y generadores aleatorios.

Las augmentations se aplican solo a train. Validation/test usan resize bicúbico a 256, crop central 224 y la normalización de `EfficientNet_B0_Weights.IMAGENET1K_V1`: media `[0.485, 0.456, 0.406]`, desviación `[0.229, 0.224, 0.225]`.

## Evaluación

Validation puede evaluarse durante el desarrollo:

```text
python -m training.evaluate --crop CORN --model-version corn-1.0.0 --split validation --device cuda
```

Test se reserva para evaluación final y requiere confirmación explícita:

```text
python -m training.evaluate --crop CORN --model-version corn-1.0.0 --split test --confirm-final-test --device cuda
```

El reporte JSON contiene accuracy, macro precision, macro recall, macro-F1, métricas por clase, matriz de confusión, loss y latencia p50/p95. No se generan valores si faltan pesos o muestras.

## Exportación

```text
python -m training.exportModel --crop CORN --model-version corn-1.0.0
```

Genera un artefacto TorchScript y `model.contract.json` con orden de clases, preprocessing, versiones y checksums. La exportación solo funciona con una versión entrenada y registrada.

## Pruebas ligeras

No requieren Torch ni descargan modelos:

```text
python -m unittest discover -s tests -v
```

Estas pruebas cubren manifiestos, mapping, determinismo, leakage, configuración, métricas, early stopping, serialización inyectable de checkpoints, Model Registry y contrato de exportación. La ejecución real de forward/backward y TorchScript queda pendiente para la PC con PyTorch.

## Integración futura con inferencia

Antes de reemplazar `visionAnalyser.py` se debe:

1. entrenar y evaluar cada cultivo;
2. exportar TorchScript;
3. validar el checksum y contrato desde Model Registry;
4. implementar carga en frío y caché por `cropType`;
5. definir umbral de confianza para `UNKNOWN`;
6. mapear las clases agronómicas al contrato de Vision sin convertirlas en una enfermedad universal;
7. añadir pruebas de inferencia con pesos reales y rendimiento del endpoint.
