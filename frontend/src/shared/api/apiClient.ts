/**
 * =========================================
 * AgroVision Intelligence - API Client
 * =========================================
 *
 * Cliente HTTP reutilizable.
 *
 * Centraliza:
 * - Solicitudes al backend Express.
 * - Lectura del contrato ApiResponse<T>.
 * - Errores HTTP.
 * - Cancelación mediante AbortSignal.
 *
 * Nunca conecta directamente con PostgreSQL.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  error: string | null;
  timestamp: string;
}

function isApiResponse(
  value: unknown
): value is ApiResponse<unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.success === "boolean" &&
    "data" in record
  );
}

export async function apiGet<T>(
  endpoint: string,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `El endpoint ${endpoint} no devolvió JSON válido.`
    );
  }

  if (!response.ok) {
    const detail =
      isApiResponse(payload) &&
      typeof payload.error === "string"
        ? payload.error
        : `HTTP ${response.status}`;

    throw new Error(detail);
  }

  if (!isApiResponse(payload)) {
    throw new Error("Contrato de API inválido.");
  }

  if (!payload.success || payload.data === null) {
    throw new Error(
      payload.error ?? "No fue posible obtener los datos."
    );
  }

  return payload.data as T;
}