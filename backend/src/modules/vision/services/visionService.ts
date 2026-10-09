/** Orquestación entre el backend y el AI Service de Vision. */

import { randomUUID } from "node:crypto";
import { basename } from "node:path";

import type { EvidenceStatus } from "../../analysis/types/evidenceTypes";
import { aiVisionAnalyzeResponseSchema } from "../schemas/visionSchemas";
import type {
  AiVisionAnalyzeResponse,
  VisionAnalyzeRequest,
  VisionAnalyzeResponse,
  VisionPrediction,
} from "../types/visionTypes";

const AI_REQUEST_TIMEOUT_MS = 20_000;

export class VisionServiceError extends Error {
  public constructor(
    message: string,
    public readonly statusCode: 400 | 413 | 415 | 422 | 502 | 504 = 502,
  ) {
    super(message);
    this.name = "VisionServiceError";
  }
}

export class VisionService {
  public static async analyzeImage(
    request: VisionAnalyzeRequest,
  ): Promise<VisionAnalyzeResponse> {
    const aiResult = await requestAiAnalysis(request);

    return {
      inspectionId: randomUUID(),
      fieldId: request.fieldId,
      zoneId: request.zoneId,
      cropType: request.cropType,
      prediction: aiResult.prediction,
      confidence: aiResult.confidence,
      visualMetrics: aiResult.visualMetrics,
      explanation: aiResult.explanation,
      recommendedAction: aiResult.recommendation,
      evidence: aiResult.evidence.map((item) => ({
        source: "VISION" as const,
        metric: item.metric,
        value: item.value,
        unit: item.unit,
        status: getEvidenceStatus(aiResult.prediction),
        explanation: item.explanation,
      })),
      createdAt: new Date().toISOString(),
    };
  }
}

async function requestAiAnalysis(
  request: VisionAnalyzeRequest,
): Promise<AiVisionAnalyzeResponse> {
  const endpoint = getAiEndpoint();
  const payload = new FormData();
  const imageBytes = new Uint8Array(request.image.buffer);

  payload.append(
    "image",
    new Blob([imageBytes], { type: request.image.mimeType }),
    basename(request.image.fileName),
  );
  payload.append("imageFileName", basename(request.image.fileName));
  payload.append("cropType", request.cropType);
  payload.append("fieldId", request.fieldId);

  if (request.zoneId) {
    payload.append("zoneId", request.zoneId);
  }

  let response: globalThis.Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      body: payload,
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    });
  } catch (error: unknown) {
    if (isTimeoutError(error)) {
      throw new VisionServiceError(
        "El AI Service agotó el tiempo máximo de respuesta.",
        504,
      );
    }

    throw new VisionServiceError(
      "No fue posible conectar con el AI Service.",
    );
  }

  if (!response.ok) {
    const detail = await readResponseDetail(response);
    const statusCode = getUpstreamStatusCode(response.status);
    throw new VisionServiceError(
      `El AI Service rechazó el análisis (${response.status})${detail}.`,
      statusCode,
    );
  }

  let payloadJson: unknown;

  try {
    payloadJson = await response.json();
  } catch {
    throw new VisionServiceError(
      "El AI Service devolvió una respuesta que no es JSON válido.",
    );
  }

  const parsed = aiVisionAnalyzeResponseSchema.safeParse(payloadJson);

  if (!parsed.success) {
    throw new VisionServiceError(
      "El AI Service devolvió un contrato de análisis inválido.",
    );
  }

  return parsed.data;
}

function getUpstreamStatusCode(
  statusCode: number,
): 400 | 413 | 415 | 422 | 502 {
  if (
    statusCode === 400 ||
    statusCode === 413 ||
    statusCode === 415 ||
    statusCode === 422
  ) {
    return statusCode;
  }

  return 502;
}

function getAiEndpoint(): URL {
  const baseUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

  try {
    return new URL("vision/analyze", `${baseUrl.replace(/\/$/, "")}/`);
  } catch {
    throw new VisionServiceError(
      "AI_SERVICE_URL no contiene una URL válida.",
    );
  }
}

function getEvidenceStatus(prediction: VisionPrediction): EvidenceStatus {
  if (prediction === "HEALTHY") return "NORMAL";
  if (prediction === "UNKNOWN") return "WATCH";
  return "WARNING";
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (
    error.name === "TimeoutError" || error.name === "AbortError"
  );
}

async function readResponseDetail(response: globalThis.Response): Promise<string> {
  try {
    const body = await response.text();
    const jsonDetail = extractJsonDetail(body);

    if (jsonDetail) {
      return `: ${jsonDetail}`;
    }

    const compactBody = body.replace(/\s+/g, " ").trim().slice(0, 200);
    return compactBody ? `: ${compactBody}` : "";
  } catch {
    return "";
  }
}

function extractJsonDetail(body: string): string | null {
  try {
    const payload: unknown = JSON.parse(body);

    if (
      typeof payload === "object" &&
      payload !== null &&
      "detail" in payload &&
      typeof payload.detail === "string"
    ) {
      return payload.detail.slice(0, 200);
    }
  } catch {
    // Una respuesta no JSON se compacta en readResponseDetail.
  }

  return null;
}
