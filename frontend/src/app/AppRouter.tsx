// Archivo encargado de crear laas rutas bases de la app

/**
 * =========================================
 * AppRouter
 * =========================================
 *
 * Router base del frontend
 *
 * Finalidad:
 * - definir las rutas principales del sistema;
 * - abrir la app directamente en /dashboard;
 * - permitir navegación base sin instalar librerías;
 * - mostrar placeholders en módulos aún no implementados.
 *
 * Rutas requeridas:
 * - /dashboard
 * - /crops
 * - /alerts
 * - /recommendations
 * - /reports
 *
 */

import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { CropsPage } from '../features/crops/pages/CropsPage';
import { VisionAiPage } from '../features/vision-ai/pages/VisionAiPage';
import { ReportsPage } from '../features/reports/pages/ReportsPage';
import { AlertsPage } from '../features/alerts/pages/AlertsPage';
import { RecommendationsPage } from '../features/recommendations/pages/RecommendationsPage';
import { MappingPage } from "../features/mapping/pages/MappingPage";
import { FieldNotebookPage } from "../features/field-notebook/pages/FieldNotebookPage";

/* Importacion de iconos */
import HomeIcon from "../assets/icons/home-03.svg"
import CropIcon from "../assets/icons/cultivo-icon.svg"
import VisionIcon from "../assets/icons/vision-icon.svg"
import MappingIcon from "../assets/icons/location-icon.svg"
import RecommendationIcon from "../assets/icons/recomendation-icon.svg"
import AlertsIcon from "../assets/icons/alert-icon.svg"
import ReportIcon from "../assets/icons/reports-icon.svg"
import FieldNotebookIcon from "../assets/icons/notebook-icon.svg"


/** AppRouterPath  define las rutas permitidsas.
 * así se evita navegar por rutas no existentes de forma accidental.
 */

export type AppRoutePath = "/dashboard" | "/crops" | "/mapping" | "/vision-ai" | "/alerts" | "/recommendations" | "/reports" | "/field-notebook";

/** RouteDefinition define cada ruta base del sistema.
 *
 * * label:
 * Texto para el botón de navegación.
 *
 * * title:
 * Título mostrado en placeholder.
 *
 * * description:
 * Explica para qué servirá ese módulo.
 */

export interface RouteDefinition {
  readonly path: AppRoutePath;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
}

/** Ruta base/principal del sistema
 *
 * Si el usuario entra a "/" "/123" o un a ruta no valida, será redirigido a /dashboard
 */
export const DEFAULT_ROUTE = '/dashboard';

/** Rutas principales del sistema */
export const ROUTES: ReadonlyArray<RouteDefinition> = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    title: 'Dashboard',
    description: 'Pantalla principal del sistema', 
    icon: HomeIcon,
  },
  {
    path: '/crops',
    label: 'Cultivos',
    title: 'Cultivos',
    description: 'Módulo para perfiles de cultivos estratégicos, riesgos principales y métricas importantes.',
    icon: CropIcon,
  },
  {
    path: '/alerts',
    label: 'Alertas',
    title: 'Alertas',
    description: 'Módulo para eventos criticos, evidencias, severidad, fuente y acciones recomendadas',
    icon: AlertsIcon,
  },
  {
    path: '/recommendations',
    label: 'Recomendaciones',
    title: 'Recomendaciones',
    description: 'Módulos para recomendaciones accionables inteligentes basadas en razón, urgencia e impacto esperado',
    icon: RecommendationIcon
  },
  {
    path: '/reports',
    label: 'Reportes',
    title: 'Reportes',
    description: 'Módulo para informes y reportes técnicos, productivos y ejecutivos basados en evidencias y trazabilidad',
    icon: ReportIcon
  },
  {
    path: '/vision-ai',
    label: 'Vision AI',
    title: 'Vision AI',
    description: 'Módulo para análisis visual preliminar con predicción, confianza, métricas y explicación.',
    icon: VisionIcon
  },
  {
    path: "/mapping",
    label: "Mapping",
    title: "Mapping",
    description: "Mapa operativo y análisis espacial del terreno.",
    icon: MappingIcon
  },
  {
    path: "/field-notebook",
    label: "Cuaderno de campo",
    title: "Cuaderno de campo",
    description: "Registro operativo de inspecciones, acciones, responsables y evidencias.",
    icon: FieldNotebookIcon
  },
];

interface AppRouterProps {
  readonly activePath: AppRoutePath;
}

// Renderiza la página correspondiente.
// Si la ruta aún no tiene feature, renderiza placeholder.
export function AppRouter({ activePath }: AppRouterProps) {
  
  if (activePath === "/dashboard") return <DashboardPage />;
  if (activePath === "/crops") return <CropsPage />;
  if (activePath === "/mapping") return <MappingPage />;
  if (activePath === "/vision-ai") return <VisionAiPage />;
  if (activePath === "/alerts") return <AlertsPage />;
  if (activePath === "/recommendations") return <RecommendationsPage />;
  if (activePath === "/reports") return <ReportsPage />;
  if (activePath === "/field-notebook") return <FieldNotebookPage />;


  const activeRoute = getRouteDefinition(activePath);

  return (
    <RoutePlaceholder
      title={activeRoute.title}
      description={activeRoute.description}
    />
  );
}

interface RoutePlaceholderProps {
  readonly title: string;
  readonly description: string;
}

/**  Placeholder temporal para módulos pendientes.
 **   No inventa pantallas finales todavía.
 */
function RoutePlaceholder({ title, description }: RoutePlaceholderProps) {
  return (
    <section className="routePlaceholder">
      <p className="routePlaceholder__eyebrow">Módulo en preparación</p>
      <h1>{title}</h1>
      <span>{description}</span>
    </section>
  );
}

/**  Convierte window.location.pathname en ruta válida.
 **  Si no existe, regresa /dashboard.
 */
export function getRouteFromPathname(pathname: string): AppRoutePath {
  if (ROUTES.some((route) => route.path === pathname)) {
    return pathname as AppRoutePath;
  }

  return DEFAULT_ROUTE;
}

// Busca definición completa de ruta.
function getRouteDefinition(path: AppRoutePath): RouteDefinition {
  return ROUTES.find((route) => route.path === path) ?? ROUTES[0];
}
