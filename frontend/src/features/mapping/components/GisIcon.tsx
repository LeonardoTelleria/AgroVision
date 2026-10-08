/**
 * =========================================
 * GIS Icon
 * =========================================
 * Iconografía vectorial compartida por navegación y herramientas GIS.
 * Cada icono conserva tamaño, trazo y alineación; su botón proporciona
 * el nombre accesible de la acción correspondiente.
 * =========================================
 */

// Tipamos el catálogo para comprobar los nombres utilizados por los consumidores.
export type GisIconName =
  "layers" | "close" | "location" | "expand" | "download" | "draw" | "pause" | "play" | "arrow" | "compass";

// Centralizamos los trazos para mantener una apariencia consistente.
const PATHS: Record<GisIconName, string> = {
  layers: "m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5",
  close: "m6 6 12 12M6 18 18 6",
  location: "M12 22s7-6 7-13a7 7 0 0 0-14 0c0 7 7 13 7 13ZM9 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  draw: "m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z",
  pause: "M8 5v14M16 5v14",
  play: "m8 4 12 8-12 8V4Z",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  compass: "m16 8-3 5-5 3 3-5 5-3ZM2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0",
};

// Renderizamos SVG locales para conservar nitidez en cualquier escala.
export function GisIcon({ name }: { readonly name: GisIconName }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
