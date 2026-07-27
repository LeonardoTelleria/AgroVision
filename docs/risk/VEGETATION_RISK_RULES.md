# Vegetation Risk Rules

## Objetivo

Definir las reglas heurísticas utilizadas por AgroVision para interpretar índices de vegetación y otras señales agrícolas, transformándolas en evidencia utilizable por el motor prescriptivo.

Estas reglas representan **señales preliminares y riesgos estimados**. No constituyen diagnósticos agronómicos definitivos y pueden requerir validación mediante inspección técnica en campo.

---

# 1. NDVI

**Normalized Difference Vegetation Index**

El NDVI se utiliza como indicador de vigor vegetal y actividad fotosintética.

| Rango         | Interpretación         | Estado   |
| ------------- | ---------------------- | -------- |
| `< 0.30`      | Vigor vegetal muy bajo | CRITICAL |
| `0.30 – 0.49` | Vigor reducido         | WARNING  |
| `0.50 – 0.69` | Vigor moderado         | WATCH    |
| `>= 0.70`     | Vegetación estable     | NORMAL   |

### Interpretación

Valores bajos de NDVI representan una señal compatible con reducción del vigor vegetal. Esta señal adquiere mayor relevancia cuando coincide con otros indicadores de deterioro.

### Acción de apoyo

* Revisar disponibilidad hídrica.
* Correlacionar con humedad del suelo.
* Revisar evidencia visual.
* Validar condiciones en campo cuando exista evidencia adicional.

---

# 2. NDWI

**Normalized Difference Water Index**

El NDWI se utiliza como indicador relacionado con el contenido hídrico de la cobertura vegetal.

| Rango         | Interpretación                          | Estado   |
| ------------- | --------------------------------------- | -------- |
| `< 0.15`      | Contenido hídrico muy bajo              | CRITICAL |
| `0.15 – 0.24` | Posible reducción del contenido hídrico | WARNING  |
| `0.25 – 0.39` | Condición que requiere seguimiento      | WATCH    |
| `>= 0.40`     | Condición hídrica estable               | NORMAL   |

### Interpretación

Valores bajos de NDWI representan una señal compatible con reducción del contenido hídrico de la vegetación.

La señal se refuerza cuando coincide con humedad de suelo baja, temperaturas elevadas o tendencia negativa.

### Acción de apoyo

* Revisar sistema de riego.
* Verificar humedad del suelo.
* Correlacionar con temperatura y otras evidencias disponibles.
* Validar técnicamente antes de aplicar medidas correctivas.

---

# 3. GNDVI

**Green Normalized Difference Vegetation Index**

El GNDVI se utiliza como indicador relacionado con actividad clorofílica y estado fisiológico.

| Rango         | Interpretación                     | Estado   |
| ------------- | ---------------------------------- | -------- |
| `< 0.25`      | Actividad clorofílica muy reducida | CRITICAL |
| `0.25 – 0.39` | Posible deterioro fisiológico      | WARNING  |
| `0.40 – 0.59` | Condición que requiere observación | WATCH    |
| `>= 0.60`     | Condición favorable                | NORMAL   |

### Interpretación

Valores bajos de GNDVI representan una señal compatible con reducción de actividad clorofílica o deterioro fisiológico.

Por sí solo, el índice no permite determinar la causa específica del cambio observado.

### Acción de apoyo

* Revisar evidencia visual.
* Correlacionar con NDVI y NDWI.
* Revisar condiciones nutricionales cuando corresponda.
* Realizar validación técnica en campo.

---

# 4. Humedad del Suelo

La humedad del suelo se utiliza para identificar posibles condiciones de déficit hídrico.

Los estados se interpretan mediante los umbrales definidos por el motor de riesgo:

| Humedad    | Estado   |
| ---------- | -------- |
| `> 50%`    | NORMAL   |
| `40 – 50%` | WATCH    |
| `30 – 39%` | WARNING  |
| `< 30%`    | CRITICAL |

Una humedad baja no demuestra por sí sola una condición agronómica específica. Su utilidad aumenta cuando coincide con NDWI bajo, deterioro de vigor o evidencia visual.

---

# 5. Anomalía Visual

La evidencia visual puede incluir señales como:

* `visualAnomaly`
* `dryAreaDetected`
* `chlorosisDetected`

Estas señales representan observaciones visuales preliminares.

### Interpretación

Una anomalía visual puede reforzar la evidencia proveniente de sensores o índices vegetativos cuando existe correspondencia entre las señales.

Por ejemplo:

```text
DryAreaDetected = true
+
NDWI bajo
```

puede interpretarse como evidencia preliminar compatible con déficit hídrico localizado.

La observación visual no constituye por sí misma un diagnóstico definitivo de enfermedad, plaga u otra condición específica.

---

# 6. Tendencia Histórica

La métrica:

`vegetationTrend`

permite observar cambios relativos en el comportamiento de la vegetación.

Una tendencia negativa representa una señal compatible con deterioro progresivo cuando se mantiene durante varios ciclos de observación.

Ejemplo:

```text
vegetationTrend = -35%
status = WARNING
```

La tendencia histórica debe interpretarse junto con las condiciones actuales y no como evidencia aislada de una causa específica.

---

# 7. Combinación de Evidencia Multifuente

El motor prescriptivo no depende exclusivamente de un índice.

Las señales se combinan para reforzar o debilitar la interpretación de riesgo.

Ejemplos:

### Estrés hídrico potencial

```text
NDWI bajo
+
Humedad de suelo baja
```

Interpretación:

**Señales compatibles con estrés hídrico.**

---

### Estrés hídrico reforzado

```text
NDWI bajo
+
Humedad de suelo baja
+
Temperatura elevada
```

Interpretación:

La combinación refuerza la evidencia compatible con condiciones de estrés hídrico.

---

### Reducción de vigor

```text
NDVI bajo
+
GNDVI bajo
```

Interpretación:

Evidencia compatible con reducción del vigor vegetal o deterioro fisiológico.

---

### Anomalía visual compatible

```text
GNDVI bajo
+
ChlorosisDetected = true
```

Interpretación:

Señales visuales y espectrales compatibles con reducción de actividad clorofílica.

No debe interpretarse como diagnóstico definitivo de una enfermedad o deficiencia específica.

---

### Área seca compatible

```text
DryAreaDetected = true
+
NDWI bajo
```

Interpretación:

Evidencia preliminar compatible con déficit hídrico localizado.

---

# 8. Interpretación de Riesgo

La combinación de evidencia contribuye a la evaluación general de la zona.

## LOW

Condiciones estables y ausencia de señales relevantes de deterioro.

Ejemplo de evidencia:

* NDVI alto.
* NDWI adecuado.
* GNDVI adecuado.
* Humedad del suelo estable.
* Sin anomalías visuales.
* Tendencia histórica estable.

Acción:

**Continuar monitoreo rutinario.**

---

## MEDIUM

Presencia de señales moderadas que justifican observación y seguimiento.

Ejemplo:

* NDVI en rango de observación.
* NDWI en rango de observación.
* Humedad ligeramente reducida.
* Tendencia histórica negativa moderada.

Acción:

**Realizar inspección preventiva y reforzar el monitoreo.**

---

## HIGH

Presencia de múltiples señales compatibles con deterioro significativo.

Ejemplo:

* NDVI bajo.
* NDWI bajo.
* GNDVI bajo.
* Humedad del suelo baja.
* Anomalía visual.
* Tendencia histórica negativa.

Acción:

**Priorizar inspección técnica y validar las condiciones antes de aplicar medidas correctivas.**

---

# 9. Caso de Evidencia Integrada

El escenario `zone-03` representa el caso de mayor riesgo utilizado en la demo.

Presenta:

```text
NDVI  = 0.24 → CRITICAL
NDWI  = 0.12 → CRITICAL
GNDVI = 0.22 → CRITICAL
Soil Moisture = 28% → CRITICAL
Temperature = 38 °C → WARNING
Visual anomalies → WARNING
Vegetation trend = -35% → WARNING
Mapping risk → WARNING
```

La coincidencia de estas señales representa evidencia multifuente consistente con **deterioro severo de la vegetación asociado a estrés hídrico**.

El resultado del escenario es:

```text
Risk Level = HIGH
Health Score = 35
```

Este resultado es un **riesgo estimado** y requiere validación técnica.

---

# 10. Relación entre Evidencia y Riesgo

Las reglas deben interpretarse de forma acumulativa y contextual.

Una señal aislada puede producir únicamente un estado de observación, mientras que varias señales concordantes pueden justificar un nivel de riesgo mayor.

El principio general es:

```text
Evidencia aislada
      ↓
Señal preliminar

Evidencia concordante
      ↓
Mayor soporte para la evaluación

Evidencia multifuente consistente
      ↓
Riesgo estimado más elevado

Riesgo estimado
      ↓
Alerta / recomendación

Recomendación
      ↓
Validación técnica en campo
```

La combinación de evidencias no debe interpretarse como una garantía de que una causa específica sea la responsable del deterioro observado.

---

# Consideraciones

AgroVision utiliza reglas heurísticas orientadas al soporte de decisiones.

Los resultados representan **evidencia preliminar y riesgos estimados**. No sustituyen una evaluación agronómica especializada.

Las acciones correctivas deben validarse técnicamente cuando la situación lo requiera.
