const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');

const { aiVisionAnalyzeResponseSchema } = require('../dist/modules/vision/schemas/visionSchemas.js');
const { VisionService, VisionServiceError } = require('../dist/modules/vision/services/visionService.js');

const originalFetch = globalThis.fetch;

const aiPayload = {
  prediction: 'VISUAL_ANOMALY',
  detectedClass: 'common_rust',
  confidence: 0.91,
  modelId: 'agrovision-efficientnet-b0-corn',
  modelVersion: 'corn-1.0.0',
  architecture: 'efficientnet_b0',
  cropType: 'CORN',
  topClasses: [
    { className: 'common_rust', score: 0.91 },
    { className: 'blight', score: 0.06 },
    { className: 'healthy', score: 0.03 },
  ],
  inferenceMs: 125.4,
  metrics: ['model_softmax'],
  visualMetrics: {
    greenCoveragePercentage: null,
    dryAreaPercentage: null,
    chlorosisSuspected: null,
    leafSpotSuspected: null,
    stressPatternDetected: null,
  },
  evidence: [{
    metric: 'model_classification',
    value: 'common_rust',
    unit: null,
    explanation: 'Clasificación neuronal real.',
  }],
  explanation: 'Patrón compatible con roya común.',
  recommendation: 'Confirmar mediante inspección agronómica.',
};

const request = {
  cropType: 'CORN',
  fieldId: 'field-test',
  zoneId: 'zone-test',
  image: {
    buffer: Buffer.from('image'),
    fileName: 'corn.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 5,
  },
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('Vision: Zod acepta el contrato neuronal y rechaza métricas inventadas', () => {
  assert.equal(aiVisionAnalyzeResponseSchema.safeParse(aiPayload).success, true);
  assert.equal(aiVisionAnalyzeResponseSchema.safeParse({
    ...aiPayload,
    visualMetrics: { ...aiPayload.visualMetrics, greenCoveragePercentage: 140 },
  }).success, false);
  assert.equal(aiVisionAnalyzeResponseSchema.safeParse({
    ...aiPayload,
    detectedClass: undefined,
  }).success, false);
});

test('Vision: Express conserva clase específica y metadatos del modelo', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify(aiPayload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
  const result = await VisionService.analyzeImage(request);
  assert.equal(result.prediction, 'VISUAL_ANOMALY');
  assert.equal(result.detectedClass, 'common_rust');
  assert.equal(result.modelVersion, 'corn-1.0.0');
  assert.equal(result.topClasses.length, 3);
  assert.equal(result.visualMetrics.greenCoveragePercentage, null);
});

test('Vision: timeout y 503 se propagan de forma controlada', async () => {
  globalThis.fetch = async () => {
    const error = new Error('timeout');
    error.name = 'TimeoutError';
    throw error;
  };
  await assert.rejects(
    VisionService.analyzeImage(request),
    error => error instanceof VisionServiceError && error.statusCode === 504,
  );

  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Modelo no disponible' }), {
    status: 503,
    headers: { 'content-type': 'application/json' },
  });
  await assert.rejects(
    VisionService.analyzeImage(request),
    error => error instanceof VisionServiceError && error.statusCode === 503,
  );
});

test('Vision: rechaza respuestas de otro cultivo', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ ...aiPayload, cropType: 'ORANGE' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
  await assert.rejects(
    VisionService.analyzeImage(request),
    error => error instanceof VisionServiceError && error.statusCode === 502,
  );
});
