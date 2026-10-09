export interface AiServiceHealth {
  readonly status: "UP" | "DOWN";
  readonly analyzerMode: "HEURISTIC" | "UNKNOWN";
  readonly modelStatus: "NOT_TRAINED" | "UNKNOWN";
}

export async function checkAiServiceHealth(): Promise<AiServiceHealth> {
  const baseUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
  try {
    const response = await fetch(new URL("health", `${baseUrl.replace(/\/$/, "")}/`), {
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return { status: "DOWN", analyzerMode: "UNKNOWN", modelStatus: "UNKNOWN" };
    const payload = await response.json() as Record<string, unknown>;
    return {
      status: payload.status === "UP" ? "UP" : "DOWN",
      analyzerMode: payload.analyzerMode === "HEURISTIC" ? "HEURISTIC" : "UNKNOWN",
      modelStatus: payload.modelStatus === "NOT_TRAINED" ? "NOT_TRAINED" : "UNKNOWN",
    };
  } catch {
    return { status: "DOWN", analyzerMode: "UNKNOWN", modelStatus: "UNKNOWN" };
  }
}
