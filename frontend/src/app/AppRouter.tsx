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
import { ROUTES, type AppRoutePath, type RouteDefinition } from "./routeDefinitions";

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

// Busca definición completa de ruta.
function getRouteDefinition(path: AppRoutePath): RouteDefinition {
  return ROUTES.find((route) => route.path === path) ?? ROUTES[0];
}
