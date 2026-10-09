/**
 * =========================================
 * AgroVision - Fields Service
 * =========================================
 *
 * Fuente de datos:
 * Neon PostgreSQL -> Prisma -> Express.
 *
 * Responsabilidades:
 * - Obtener todas las parcelas.
 * - Obtener una parcela por ID.
 * - Consultar parcelas pertenecientes a una finca.
 * - Validar la respuesta del backend.
 *
 * No se utilizan mocks.
 */

import { apiGet } from "../../../shared/api/apiClient";
import { API_ENDPOINTS } from "../../../shared/api/endpoints";
import type { Field } from "../types/field.types.ts"

function isField(value: unknown): value is Field {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const field = value as Record<string, unknown>;

  return (
    typeof field.id === "number" &&
    Number.isInteger(field.id) &&
    typeof field.farmId === "number" &&
    Number.isInteger(field.farmId) &&
    typeof field.name === "string" &&
    typeof field.areaSquareMeters === "number" &&
    Number.isFinite(field.areaSquareMeters) &&
    typeof field.soilType === "string" &&
    typeof field.irrigationType === "string" &&
    typeof field.status === "string" &&
    typeof field.createdAt === "string"
  );
}

function validateFields(value: unknown): Field[] {
  if (
    !Array.isArray(value) ||
    !value.every(isField)
  ) {
    throw new Error(
      "El backend devolvió un listado de parcelas inválido."
    );
  }

  return value;
}

function validateId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("El ID debe ser un entero positivo.");
  }
}

/**
 * GET /api/fields
 */
export async function getFields(
  signal?: AbortSignal
): Promise<Field[]> {
  const data = await apiGet<unknown>(
    API_ENDPOINTS.fields,
    signal
  );

  return validateFields(data);
}

/**
 * GET /api/fields/:id
 */
export async function getFieldById(
  id: number,
  signal?: AbortSignal
): Promise<Field> {
  validateId(id);

  const data = await apiGet<unknown>(
    `${API_ENDPOINTS.fields}/${id}`,
    signal
  );

  if (!isField(data)) {
    throw new Error("La parcela recibida es inválida.");
  }

  return data;
}

/**
 * GET /api/fields/farm/:farmId
 */
export async function getFieldsByFarmId(
  farmId: number,
  signal?: AbortSignal
): Promise<Field[]> {
  validateId(farmId);

  const data = await apiGet<unknown>(
    `${API_ENDPOINTS.fields}/farm/${farmId}`,
    signal
  );

  return validateFields(data);
}