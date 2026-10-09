export function formatFieldId(fieldId: number): string {
  return `field-${String(fieldId).padStart(3, "0")}`;
}

export function parseFieldId(fieldId: string): number | null {
  const parsed = Number(fieldId.replace(/^field-/, ""));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
