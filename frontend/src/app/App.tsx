
/**
 * =========================================
 * AgroVision Intelligence - App
 * =========================================
 *
 * Shell general de la aplicación.
 *
 * Responsabilidades:
 * - Navegación SPA.
 * - Sidebar fija y colapsable.
 * - Topbar.
 * - Renderizado de las páginas.
 * - Contexto global de parcelas.
 *
 * FieldsProvider permite compartir
 * datos persistidos de PostgreSQL
 * entre todos los módulos.
 */

import { useEffect, useState } from "react";

import { AppRouter } from "./AppRouter";

import {
  DEFAULT_ROUTE,
  ROUTES,
  getRouteFromPathname,
  type AppRoutePath,
} from "./routeDefinitions";

import { Sidebar } from "../shared/components/layout/Sidebar";
import { Topbar } from "../shared/components/layout/Topbar";
import { LandingPage } from "../features/landing/LandingPage";

// Contexto global de parcelas reales
import { FieldsProvider } from "../features/fields/context/FieldsContext";

import "../shared/styles/themes.css";
import "../shared/styles/layout.css";
import "../shared/styles/figma-ui.css";

const SIDEBAR_STORAGE_KEY =
  "agrovision.sidebar.collapsed";

/**
 * =========================================
 * Dashboard Application
 * =========================================
 *
 * Este componente permanece montado
 * durante la navegación de la aplicación.
 */

function DashboardApp() {
  const [activePath, setActivePath] =
    useState<AppRoutePath>(() =>
      getRouteFromPathname(window.location.pathname)
    );

  /**
   * Preferencia de Sidebar.
   */
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(() => {
      return (
        window.localStorage.getItem(
          SIDEBAR_STORAGE_KEY
        ) === "true"
      );
    });

  /**
   * Sincronización con el historial.
   */
  useEffect(() => {
    const initialPath = getRouteFromPathname(
      window.location.pathname
    );

    if (window.location.pathname !== initialPath) {
      window.history.replaceState(
        null,
        "",
        DEFAULT_ROUTE
      );
    }

    function handlePopState(): void {
      setActivePath(
        getRouteFromPathname(window.location.pathname)
      );
    }

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, []);

  /**
   * Persiste la preferencia de Sidebar.
   */
  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      String(isSidebarCollapsed)
    );
  }, [isSidebarCollapsed]);

  /**
   * Navegación interna de AgroVision.
   */
  function handleNavigate(path: AppRoutePath): void {
    if (path === activePath) return;

    window.history.pushState(null, "", path);
    setActivePath(path);
  }

  /**
   * Expande o colapsa Sidebar.
   */
  function handleToggleSidebar(): void {
    setIsSidebarCollapsed(
      (currentValue) => !currentValue
    );
  }

  const activeRoute = ROUTES.find(
    (route) => route.path === activePath
  );

  return (
    <div
      className={
        isSidebarCollapsed
          ? "agrovisionApp is-sidebar-collapsed"
          : "agrovisionApp"
      }
    >
      <Sidebar
        activePath={activePath}
        isCollapsed={isSidebarCollapsed}
        onNavigate={handleNavigate}
        onToggle={handleToggleSidebar}
      />

      <section className="agrovisionMain">
        <Topbar
          activeLabel={
            activeRoute?.label ?? "Dashboard"
          }
        />

        <main className="agrovisionContent">
          <AppRouter activePath={activePath} />
        </main>
      </section>
    </div>
  );
}

/**
 * =========================================
 * App Root
 * =========================================
 *
 * LandingPage mantiene su funcionamiento.
 *
 * FieldsProvider engloba todo el sistema
 * operativo después de ingresar a AgroVision.
 *
 * Esto permite que:
 *
 * Topbar -> seleccione una parcela
 * Dashboard -> conozca su ID
 * Mapping -> conozca su ID
 * Otros módulos -> conozcan su ID
 */

export default function App() {
  if (window.location.pathname === "/") {
    return <LandingPage />;
  }

  return (
    <FieldsProvider>
      <DashboardApp />
    </FieldsProvider>
  );
}
