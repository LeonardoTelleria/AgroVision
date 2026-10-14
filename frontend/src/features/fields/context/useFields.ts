import { useContext } from "react";
import {
  FieldsContext,
  type FieldsContextValue,
} from "./fieldsContextStore";

export function useFields(): FieldsContextValue {
  const context = useContext(FieldsContext);

  if (!context) {
    throw new Error(
      "useFields debe utilizarse dentro de FieldsProvider."
    );
  }

  return context;
}
