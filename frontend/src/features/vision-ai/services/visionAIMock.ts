
/**
 * =========================================
 * Vision AI Mock
 * =========================================
 * 
 * Mock de respuesta visual preliminar. Simula lo que backend debería devolver después de llamar al AI Service.
 *
 * Finalidad:
 * - mantener VisionAiPage funcional si backend falla;
 * - simular respuesta compatible con VisionInspection;
 * - evitar que la UI quede vacía durante la demo;
*/

import type { VisionAnalyzeRequest, VisionInspection, VisionPrediction } from "../types/visionAi.types";

// Mock principal listo para consumir desde una futura VisionAIPage.
// actualmente es el mock base del caso para la demo
export const visionAiMock: VisionInspection = {
    // ID base usado solo por fallback local.
    inspectionId: "inspection-001",
    // Campo, Zona y Cultivo oficial usado en el flujo demo.
    fieldId: "field-001",
    zoneId: "zone-03",
    cropType: "ORANGE",

    // Clasificación visual preliminar.
    prediction: "WATER_STRESS",

    // Confianza expresada en rango 0-1.
    confidence: 0.87,
    // Métricas visuales explicables para UI.
    visualMetrics: {
        greenCoveragePercentage: 62,
        dryAreaPercentage: 21,
        chlorosisSuspected: false,
        leafSpotSuspected: false,
        stressPatternDetected: true,
    },
    // Explicación técnica breve y acción sugerida.
    explanation: "Se detecta reducción de cobertura verde y presencia moderada de áreas secas. El patrón visual es compatible con estrés hídrico preliminar.",
    recommendedAction: "Revisar riego en zona 03, validar humedad del suelo y repetir análisis visual en 24 horas.",

    // Evidencia visual que respalda la predicción.
    evidence: [
        {
            source: "VISION",
            metric: "prediction",
            value: "WATER_STRESS",
            unit: null,
            status: "WARNING",
            explanation: "La clasificación visual preliminar detecta señales compatibles con estrés hídrico.",
        },
        {
            source: "VISION",
            metric: "greenCoveragePercentage",
            value: 62,
            unit: "%",
            status: "WATCH",
            explanation: "La cobertura verde se mantiene moderada, pero por debajo del rango esperado para vigor estable.",
        },
        {
            source: "VISION",
            metric: "dryAreaPercentage",
            value: 21,
            unit: "%",
            status: "WARNING",
            explanation: "Se identifican áreas secas moderadas en la imagen procesada.",
        },
    ],
    // Fecha base del mock.
    createdAt: "2026-07-01T08:30:00.000Z",
};

/**
 * Genera un resultado mock segun la request actual.
 *
 * Funcionamiento:
 * - conserva la estructura base de visionAiMock;
 * - actualiza fieldId, zoneId y cropType según la UI;
 * - genera un inspectionId nuevo para simular una ejecución real;
 * - actualiza createdAt al momento del análisis.
*/
export function analyzeVisionMock(request: VisionAnalyzeRequest): VisionInspection {
    return {
        ...visionAiMock,
        // ID para diferenciar ejecuciones locales.
        inspectionId: createInspectionId(),
        // Respeta el field seleccionado por la página.
        fieldId: request.fieldId,
        // Si no hay zona, se mantiene null para evitar inconsistencias.
        zoneId: request.zoneId ?? null,
        // Permite que el mock responda al cultivo seleccionado.
        cropType: request.cropType,
        // Fecha dinámica de ejecución.
        createdAt: new Date().toISOString(),
    };
}

/** 
* Devuelve una etiqueta legible para la predicción.
* mantiene el valor técnico intacto y solo transforma la vista.
* 
* Ejemplo:
* WATER_STRESS → WATER STRESS
*/

export function getVisionPredictionLabel(prediction: VisionPrediction): string {
  return prediction.replaceAll("_", " ");
}

// ID simple para mocks locales., el Backend generará IDs reales después.
function createInspectionId(): string {
  return `inspection-${Date.now()}`;
}