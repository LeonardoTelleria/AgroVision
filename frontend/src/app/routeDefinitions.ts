/**
 * Configuración compartida de rutas de AgroVision.
 *
 * Mantiene contratos, metadatos y utilidades de navegación fuera de los
 * archivos de componentes para conservar la compatibilidad con Fast Refresh.
 */

import HomeIcon from "../assets/icons/home-03.svg";
import CropIcon from "../assets/icons/cultivo-icon.svg";
import VisionIcon from "../assets/icons/vision-icon.svg";
import MappingIcon from "../assets/icons/location-icon.svg";
import RecommendationIcon from "../assets/icons/recomendation-icon.svg";
import AlertsIcon from "../assets/icons/alert-icon.svg";
import ReportIcon from "../assets/icons/reports-icon.svg";
import FieldNotebookIcon from "../assets/icons/notebook-icon.svg";

export type AppRoutePath =
  | "/dashboard"
  | "/crops"
  | "/mapping"
  | "/vision-ai"
  | "/alerts"
  | "/recommendations"
  | "/reports"
  | "/field-notebook";

export interface RouteDefinition {
  readonly path: AppRoutePath;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
}

export const DEFAULT_ROUTE: AppRoutePath = "/dashboard";

export const ROUTES: ReadonlyArray<RouteDefinition> = [
  {
    path: "/dashboard",
    label: "Dashboard",
    title: "Dashboard",
    description: "Pantalla principal del sistema",
    icon: HomeIcon,
  },
  {
    path: "/crops",
    label: "Cultivos",
    title: "Cultivos",
    description:
      "Módulo para perfiles de cultivos estratégicos, riesgos principales y métricas importantes.",
    icon: CropIcon,
  },
  {
    path: "/alerts",
    label: "Alertas",
    title: "Alertas",
    description:
      "Módulo para eventos criticos, evidencias, severidad, fuente y acciones recomendadas",
    icon: AlertsIcon,
  },
  {
    path: "/recommendations",
    label: "Recomendaciones",
    title: "Recomendaciones",
    description:
      "Módulos para recomendaciones accionables inteligentes basadas en razón, urgencia e impacto esperado",
    icon: RecommendationIcon,
  },
  {
    path: "/reports",
    label: "Reportes",
    title: "Reportes",
    description:
      "Módulo para informes y reportes técnicos, productivos y ejecutivos basados en evidencias y trazabilidad",
    icon: ReportIcon,
  },
  {
    path: "/vision-ai",
    label: "Vision AI",
    title: "Vision AI",
    description:
      "Módulo para análisis visual preliminar con predicción, confianza, métricas y explicación.",
    icon: VisionIcon,
  },
  {
    path: "/mapping",
    label: "Mapping",
    title: "Mapping",
    description: "Mapa operativo y análisis espacial del terreno.",
    icon: MappingIcon,
  },
  {
    path: "/field-notebook",
    label: "Cuaderno de campo",
    title: "Cuaderno de campo",
    description:
      "Registro operativo de inspecciones, acciones, responsables y evidencias.",
    icon: FieldNotebookIcon,
  },
];

export function getRouteFromPathname(pathname: string): AppRoutePath {
  const route = ROUTES.find((candidate) => candidate.path === pathname);
  return route?.path ?? DEFAULT_ROUTE;
}
