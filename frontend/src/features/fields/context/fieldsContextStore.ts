import { createContext } from "react";
import type { Field } from "../types/field.types";

export interface FieldsContextValue {
  readonly fields: ReadonlyArray<Field>;
  readonly selectedFieldId: number | null;
  readonly selectedField: Field | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly selectField: (id: number | null) => void;
  readonly reloadFields: () => void;
}

export const FieldsContext =
  createContext<FieldsContextValue | null>(null);
