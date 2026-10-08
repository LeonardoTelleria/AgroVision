/** Contratos HTTP del dispositivo Sensor; las mediciones pertenecen a Telemetry. */
export type SensorStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export interface SensorResponse {
  readonly id: number;
  readonly fieldId: number;
  readonly type: string;
  readonly name: string;
  readonly status: SensorStatus;
  readonly installedAt: string;
}

export interface CreateSensorInput {
  readonly fieldId: number;
  readonly type: string;
  readonly name: string;
  readonly status: SensorStatus;
  readonly installedAt: string;
}

export interface UpdateSensorInput {
  readonly type?: string;
  readonly name?: string;
  readonly status?: SensorStatus;
}
