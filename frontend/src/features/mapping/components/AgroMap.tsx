/**
 * =========================================
 * AgroMap
 * =========================================
 *
 * Componente cartográfico reutilizable de AgroVision.
 *
 * Responsabilidad:
 * Proporcionar el contenedor HTML del mapa y conectar
 * sus opciones públicas con el hook useAgroMap.
 *
 * Arquitectura:
 * AgroMap define la superficie de presentación.
 * useAgroMap administra el ciclo de vida de MapLibre.
 * baseMap proporciona la configuración cartográfica central.
 *
 * Integración:
 * Las pantallas pueden configurar la cámara, la interacción,
 * los controles y los callbacks de carga y error.
 *
 * =========================================
 */

import { useRef } from "react";
import { useAgroMap } from "../hooks/useAgroMap";
import type { UseAgroMapOptions } from "../hooks/useAgroMap";
import "../mappingGis.css";

export interface AgroMapProps extends Omit<UseAgroMapOptions, "containerRef"> {
  readonly className?: string;
}

/** Renderiza el contenedor sin duplicar la inicialización de MapLibre. */
export function AgroMap({ className = "", ...options }: AgroMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useAgroMap({ ...options, containerRef });

  return <div ref={containerRef} className={`agroMap ${className}`.trim()} role="region" aria-label="Mapa interactivo AgroVision" />;
}


/** 
 * AgroMap.tsx
      │
      ▼
<div ref={mapContainerRef}>
      │
      ▼
new Map(...)
      │
      ├── OpenFreeMap
      ├── Nicaragua
      ├── zoom
      ├── interacción
      ├── navegación
      └── escala
      │
      ▼
     MAPA
 */

