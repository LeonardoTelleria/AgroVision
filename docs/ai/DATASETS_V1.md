# Dataset Manager v1.0

## Alcance

Dataset Manager prepara datos de clasificación foliar para `CORN`, `RED_BEAN` y `ORANGE`. No entrena modelos, no realiza inferencia y no transforma roya, tizón, cancro, greening/HLB u otras enfermedades en una etiqueta universal. Tampoco infiere estrés hídrico a partir de estas clases.

`ai-service/config/datasets.yaml` es la única fuente de verdad para cultivos, etiquetas, procedencia, licencias, rutas y estrategia de partición. El valor `ORANGE` es el tipo interno de AgroVision para el módulo de cítricos; el dataset Mendeley se describe como **Citrus** y no autoriza por sí solo a afirmar que todas las muestras sean `Citrus sinensis`.

## Estructura local

Los archivos pesados son locales y están excluidos de Git:

```text
ai-service/data/
├── raw/
│   ├── maize/maize.zip
│   ├── beans/train.zip
│   ├── beans/validation.zip
│   ├── beans/test.zip
│   └── citrus/citrus.zip
├── processed/v1/
└── reports/
```

No se descargan datasets automáticamente. Esto evita introducir credenciales, aceptar licencias implícitamente o reemplazar archivos locales sin revisión.

## Reproducción en otra PC

Desde `ai-service`:

```bash
python -m venv .venv
```

Activa el entorno según la terminal:

```bash
# Windows con Git Bash
source .venv/Scripts/activate

# Linux o macOS
source .venv/bin/activate
```

```powershell
# Windows con PowerShell
.\.venv\Scripts\Activate.ps1
```

Con el entorno activo, los comandos son iguales en las tres terminales:

```bash
python -m pip install -r requirements.txt
python -m app.dataset_manager.cli audit --raw data/raw --output data/reports/audit.json
python -m app.dataset_manager.cli prepare --raw data/raw --out data/processed/v1 --seed 42 --report data/reports/prepare.json
python -m unittest discover -s tests -v
```

`audit` termina correctamente aunque falten ZIP: registra cada archivo como `missing` en JSON/Markdown. `prepare` procesa las fuentes disponibles y omite las ausentes; falla claramente si no existe ninguna muestra válida.

## Contrato de salida

Cada imagen se materializa una sola vez bajo:

```text
{split}/{cropType}/{normalizedLabel}/{sha256}.{extension}
```

`manifest.jsonl` y los manifiestos separados de `train`, `validation` y `test` registran:

- `cropType`
- `originalLabel`
- `normalizedLabel`
- `sourceDataset`
- `split`
- `hash` (SHA256)
- `relativePath`
- `groupId` cuando existe una agrupación de leakage

La salida es inmutable. Repetir `prepare` con exactamente el mismo manifiesto es idempotente; si cambia cualquier muestra, el comando exige un directorio versionado nuevo y no sobrescribe el test existente.

## Integridad y prevención de leakage

- Se rechazan rutas absolutas, `..`, enlaces simbólicos, entradas cifradas, límites anómalos y ratios sospechosos antes de extraer.
- Se verifica el CRC del ZIP y cada imagen se decodifica por completo con Pillow.
- SHA256 elimina duplicados exactos. Si el mismo contenido tiene etiquetas distintas, se descartan todas las copias como conflicto.
- dHash identifica candidatos perceptualmente cercanos. Los grupos de la misma clase se mantienen en un único split y se reportan; no se presentan como equivalencia agronómica confirmada.
- iBean conserva sus splits oficiales. Si un duplicado/grupo cruza splits oficiales, se conserva primero `test`, luego `validation`, luego `train`, y las otras copias se registran como exclusiones.
- Maíz y cítricos usan división estratificada agrupada 70/15/15, determinista con seed 42. No hay metadatos confiables de planta/grupo en los ZIP inspeccionados; por ello `groupId` solo se deriva de relaciones de duplicidad perceptual. No se infieren plantas a partir del nombre del archivo.

## Fuentes, atribución y licencias

### Maíz

- Fuente: [Corn or Maize Leaf Disease Dataset](https://www.kaggle.com/datasets/smaranjitghose/corn-or-maize-leaf-disease-dataset), Smaranjit Ghose.
- Carpetas verificadas en el ZIP local: `Healthy`, `Gray_Leaf_Spot`, `Common_Rust`, `Blight` (4,188 entradas de imagen antes de validación/deduplicación).
- Licencia: debe verificarse directamente en los metadatos de Kaggle antes de redistribuir. La configuración la marca deliberadamente como `VERIFY_AT_SOURCE`; no se toma como autoridad una copia secundaria.

### Frijol iBean

- Fuente y atribución: [Makerere AI Lab iBean](https://github.com/AI-Lab-Makerere/ibean), en colaboración con NaCRRI.
- Clases: `healthy`, `angular_leaf_spot`, `bean_rust`.
- Splits: `train.zip`, `validation.zip`, `test.zip`, preservados como oficiales.
- Licencia declarada por el repositorio: [MIT](https://github.com/AI-Lab-Makerere/ibean/blob/master/LICENSE).
- Estado local al implementar v1.0: los tres ZIP no estaban disponibles, por lo que no se afirma que su contenido local haya sido validado.

### Cítricos

- Fuente: [Mendeley Data, versión 2](https://data.mendeley.com/datasets/3f83gxmv57/2), DOI `10.17632/3f83gxmv57.2`.
- Atribución: Hafiz Tayyab Rauf, Basharat Ali Saleem, M. Ikram Ullah Lali, Muhammad Attique Khan, Muhammad Sharif y Syed Ahmad Chan Bukhari.
- Licencia declarada: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- El ZIP local contiene hojas y frutos. v1.0 incluye únicamente `Citrus/Leaves/{healthy, Black spot, canker, greening, Melanose}` y registra todos los frutos y categorías no admitidas como exclusiones.

## Reportes

Cada comando genera JSON y un resumen Markdown con conteos por cultivo, clase y split, archivos ausentes/inválidos, imágenes corruptas, descartes, duplicados exactos, candidatos perceptuales y procedencia. Los reportes se regeneran localmente y no se versionan porque pueden contener nombres de archivos del dataset.
