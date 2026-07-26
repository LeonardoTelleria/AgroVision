# AI Limitations

## Objetivo

Describir el alcance, las limitaciones y las condiciones de uso del módulo de análisis visual de AgroVision.

El AI Service implementado en esta versión proporciona una **clasificación visual preliminar basada en reglas heurísticas** para demostrar la integración de análisis visual dentro del flujo prescriptivo.

Sus resultados constituyen evidencia de apoyo y no deben interpretarse como diagnósticos agronómicos definitivos.

---

# Alcance Actual

El módulo puede generar señales compatibles con las siguientes categorías:

* `HEALTHY`
* `WATER_STRESS`
* `CHLOROSIS`
* `DRY_AREA`
* `LEAF_SPOT`
* `UNKNOWN`

Estas categorías representan observaciones visuales preliminares.

La clasificación de una imagen no confirma por sí sola la presencia de:

* enfermedades;
* plagas;
* deficiencias nutricionales;
* estrés hídrico;
* u otras condiciones agronómicas específicas.

---

# Limitaciones

## 1. Vision AI es preliminar

El análisis visual actual utiliza reglas heurísticas para demostrar el flujo de integración.

No representa un modelo de visión agrícola entrenado con un conjunto de datos productivo.

Por lo tanto, las predicciones deben considerarse **señales compatibles** con determinados patrones visuales.

---

## 2. No constituye un diagnóstico definitivo

Una clasificación como:

```text
CHLOROSIS
```

no significa que el sistema haya confirmado una enfermedad o deficiencia específica.

Del mismo modo:

```text
WATER_STRESS
DRY_AREA
LEAF_SPOT
```

representan categorías visuales preliminares que deben ser corroboradas mediante otras fuentes de evidencia y, cuando sea necesario, inspección técnica.

---

## 3. No sustituye la evaluación técnica

El sistema no reemplaza el criterio de profesionales agrícolas ni la inspección directa del cultivo.

Las recomendaciones generadas por AgroVision tienen como finalidad apoyar la toma de decisiones.

Las acciones correctivas deben validarse técnicamente antes de su aplicación cuando las condiciones lo requieran.

---

## 4. No utiliza actualmente un modelo agrícola entrenado

En esta versión:

* no se utiliza una red neuronal entrenada con imágenes agrícolas reales;
* no se reportan métricas productivas de precisión;
* las categorías visuales se obtienen mediante reglas heurísticas;
* los niveles de confianza son valores demostrativos.

Por esta razón, los resultados no deben presentarse como métricas de precisión de un modelo de inteligencia artificial entrenado.

---

## 5. Valores de confianza

Los valores de confianza utilizados por el AI Service son estimaciones heurísticas.

No representan:

* probabilidades estadísticas calibradas;
* precisión del modelo;
* sensibilidad;
* especificidad;
* desempeño validado en campo.

Su finalidad actual es demostrar cómo una futura integración de modelos de IA podría transportar información de confianza dentro del flujo.

---

# Integración con Evidencia Multifuente

La salida visual no se utiliza como única fuente para construir el análisis prescriptivo.

El sistema puede combinar información proveniente de:

* sensores;
* clima;
* índices vegetativos;
* historial;
* mapeo;
* análisis visual.

El objetivo de esta arquitectura es mantener la trazabilidad entre las diferentes señales disponibles y evitar depender exclusivamente de una clasificación visual.

La evidencia visual puede reforzar otras señales cuando existe correspondencia entre ellas.

---

# Capa Satelital Simulada

La información satelital utilizada en la demostración corresponde a **evidencia simulada**.

Los valores de:

* NDVI;
* NDWI;
* GNDVI;

se utilizan para demostrar cómo una futura fuente satelital puede integrarse al flujo prescriptivo.

Actualmente no debe describirse esta información como datos provenientes de un satélite real ni como imágenes obtenidas desde un proveedor satelital operativo.

---

# Preparación para Integraciones Futuras

La arquitectura mantiene separados los módulos de análisis y las fuentes de evidencia para facilitar futuras integraciones.

Entre las posibles extensiones se encuentran:

* modelos de visión por computadora entrenados con imágenes agrícolas reales;
* conjuntos de datos agrícolas validados;
* modelos calibrados para cultivos específicos;
* métricas de desempeño verificadas;
* fuentes satelitales reales;
* proveedores externos de imágenes;
* servicios de inferencia especializados.

La incorporación futura de estas capacidades requerirá validación independiente antes de utilizar sus resultados como evidencia productiva.

---

# Uso Correcto de los Resultados

Los resultados del AI Service deben expresarse como:

* **señales compatibles**;
* **evidencia visual preliminar**;
* **riesgo estimado**;
* **observaciones que requieren validación técnica**.

Debe evitarse afirmar que el sistema:

* diagnostica enfermedades;
* detecta plagas con precisión validada;
* garantiza la recuperación del cultivo;
* confirma una causa agronómica específica;
* utiliza imágenes satelitales reales cuando se trate de la capa simulada.

---

# Relación con el Flujo Prescriptivo

El análisis visual representa una fuente adicional de evidencia:

```text
Imagen
  ↓
Vision AI Service
  ↓
Clasificación visual preliminar
  ↓
EvidenceItem(VISION)
  ↓
EvidenceFusionService
  ↓
Evaluación multifuente
  ↓
Riesgo estimado
  ↓
Alerta
  ↓
Recomendación
  ↓
Validación técnica
```

La decisión final no debe fundamentarse exclusivamente en la clasificación visual.

---

# Validación Técnica en Campo

Las recomendaciones de AgroVision deben considerarse herramientas de apoyo.

Cuando una evaluación indica condiciones de riesgo, la validación técnica puede incluir:

* inspección directa;
* revisión de humedad del suelo;
* revisión del sistema de riego;
* comprobación de condiciones ambientales;
* revisión de síntomas visibles;
* comparación con otras fuentes de evidencia.

Las medidas correctivas deben aplicarse de acuerdo con la evaluación técnica correspondiente.

---

# Conclusión

El AI Service actual demuestra la integración de análisis visual dentro de una arquitectura prescriptiva multifuente.

Su función actual es generar **evidencia visual preliminar**, no realizar diagnósticos agronómicos definitivos.

La capa satelital utilizada durante la demostración es **simulada**, mientras que la arquitectura se encuentra preparada para una futura integración con fuentes reales.

Toda recomendación derivada de las señales del sistema debe interpretarse como **apoyo a la toma de decisiones** y puede requerir **validación técnica en campo** antes de ejecutar acciones correctivas.
