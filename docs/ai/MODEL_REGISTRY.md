# AgroVision Model Registry v1.0

## Propósito

`ai-service/model_registry/registry.json` registra metadatos versionados y verificables. El archivo inicial contiene `CORN`, `RED_BEAN` y `ORANGE` con estado `NOT_TRAINED`; no contiene ni referencia checkpoints ficticios.

Estados:

- `NOT_TRAINED`: catálogo preparado, todos los campos de pesos/métricas son `null`.
- `TRAINED`: existe `best.pt`, su SHA256 coincide y contiene métricas reales de validation.
- `EVALUATED`: se añadió un reporte real de validation o test.
- `EXPORTED`: existe un contrato de exportación TorchScript validado.

## Contrato por versión

Cada entrada incluye:

- `modelId`
- `modelVersion`
- `status`
- `architecture`
- `cropType`
- `classNames` en el orden exacto de logits
- `datasetVersion`
- `checkpointPath`
- `preprocessing`
- `metrics`
- `trainedAt`
- `frameworkVersion`
- `checksum` SHA256

Los checkpoints se almacenan fuera de Git. `checkpointPath` es relativo al directorio del registro para conservar portabilidad.

## Garantías

`ModelRegistry.require_checkpoint()` rechaza:

- modelos `NOT_TRAINED`;
- rutas inexistentes;
- archivos modificados cuyo SHA256 ya no coincida;
- versiones/cultivos no registrados.

Registrar una versión exige que el checkpoint exista. Una combinación `modelId` + `modelVersion` no puede sobrescribirse; un reentrenamiento debe utilizar otra versión.

El Training Engine registra `best.pt` después de finalizar. Evaluación añade métricas al split ejecutado y exportación añade el contrato del artefacto. Ninguna de estas operaciones inventa métricas ni crea archivos vacíos.

## Separación entre selección y evaluación final

Validation selecciona `best.pt` por macro-F1. Test no participa en early stopping, scheduler ni selección de modelo. El CLI exige `--confirm-final-test` para reducir el riesgo de consultar test repetidamente.

## Recuperación y trazabilidad

Para mover una versión a otra PC deben copiarse conjuntamente:

1. el checkpoint señalado;
2. la entrada del registro;
3. el `training.json` y las evaluaciones;
4. `training/config.yaml` y la versión del manifiesto;
5. cuando exista, el artefacto exportado y `model.contract.json`.

Después de copiar, debe comprobarse el SHA256 llamando al registro antes de evaluar o exportar.
