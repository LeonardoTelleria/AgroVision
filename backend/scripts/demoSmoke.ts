import "dotenv/config";

type JsonRecord = Record<string, unknown>;

const backendUrl = (process.env.BACKEND_URL ?? "http://localhost:3000").replace(/\/$/, "");

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function asArray(value: unknown, label: string, minimum: number): unknown[] {
  if (!Array.isArray(value) || value.length < minimum) {
    throw new Error(`${label}: se esperaban al menos ${minimum} registros.`);
  }
  return value;
}

async function getData(path: string): Promise<unknown> {
  const response = await fetch(`${backendUrl}${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    const detail = isRecord(payload) && typeof payload.error === "string"
      ? payload.error
      : `HTTP ${response.status}`;
    throw new Error(`${path}: ${detail}`);
  }
  if (!isRecord(payload) || payload.success !== true || !("data" in payload)) {
    throw new Error(`${path}: contrato ApiResponse inválido.`);
  }
  return payload.data;
}

async function main(): Promise<void> {
  const results: Array<{ endpoint: string; status: "PASS" }> = [];
  async function check(path: string, validate: (data: unknown) => void): Promise<void> {
    const data = await getData(path);
    validate(data);
    results.push({ endpoint: path, status: "PASS" });
  }

  await check("/api/health", (data) => {
    if (!isRecord(data) || data.status !== "UP" || data.database !== "UP" || data.aiService !== "UP") {
      throw new Error("Health: backend, PostgreSQL y AI Service deben estar UP.");
    }
    if (data.aiAnalyzerMode !== "HEURISTIC" || data.aiModelStatus !== "NOT_TRAINED") {
      throw new Error("Health: el modo demo de IA no está declarado correctamente.");
    }
  });
  await check("/api/dashboard/summary", (data) => {
    if (!isRecord(data) || !isRecord(data.farm) || !isRecord(data.alerts) || !isRecord(data.vegetation)) {
      throw new Error("Dashboard: faltan bloques obligatorios.");
    }
  });
  await check("/api/crops/profiles", (data) => { asArray(data, "Perfiles de cultivo", 8); });
  await check("/api/alerts", (data) => { asArray(data, "Alertas", 6); });
  await check("/api/recommendations", (data) => { asArray(data, "Recomendaciones", 5); });
  await check("/api/analysis/zone/zone-03", (data) => {
    if (!isRecord(data) || data.zoneId !== "zone-03" || !Array.isArray(data.evidence)) {
      throw new Error("Análisis de zone-03 incompleto.");
    }
  });
  await check("/api/vegetation/indices?fieldId=field-001", (data) => { asArray(data, "Vegetación", 3); });
  await check("/api/vision/inspections", (data) => { asArray(data, "Inspecciones visuales", 3); });
  await check("/api/reports/prescriptive/zone-03", (data) => {
    if (!isRecord(data) || data.zoneId !== "zone-03") throw new Error("Reporte de zone-03 incompleto.");
  });
  await check("/api/field-notebook", (data) => {
    if (!isRecord(data) || !Array.isArray(data.records) || data.records.length < 5) {
      throw new Error("Cuaderno de campo incompleto.");
    }
  });
  await check("/api/mapping/simulation", (data) => {
    if (!isRecord(data)) throw new Error("Escenario de mapeo inválido.");
  });

  console.log(JSON.stringify({ status: "PASS", backendUrl, checks: results }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
