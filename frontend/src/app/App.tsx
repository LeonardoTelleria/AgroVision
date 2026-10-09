/**
 * =========================================
 * App
 * =========================================
 *
 * Shell general.
 *
 * Controla:
 * - navegación;
 * - Sidebar fija;
 * - Sidebar colapsable;
 * - Topbar;
 * - área principal.
 */

import { useEffect, useState } from "react";
import { ROUTES, DEFAULT_ROUTE, AppRouter, getRouteFromPathname, type AppRoutePath } from "./AppRouter";
import { Sidebar } from "../shared/components/layout/Sidebar";
import { Topbar } from "../shared/components/layout/Topbar";
import { LandingPage } from "../features/landing/LandingPage";
import "../shared/styles/themes.css";
import "../shared/styles/layout.css";
import "../shared/styles/figma-ui.css";

const SIDEBAR_STORAGE_KEY = "agrovision.sidebar.collapsed";

function DashboardApp() {
  const [activePath, setActivePath] = useState<AppRoutePath>(() => getRouteFromPathname(window.location.pathname));

  /**
   * Mantiene preferencia de navegación.
   */
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  });

  /**
   * Sincroniza ruta con historial del navegador.
   */
  useEffect(() => {
    const initialPath = getRouteFromPathname(window.location.pathname);

    if (window.location.pathname !== initialPath) {
      window.history.replaceState(null, "", DEFAULT_ROUTE);
    }

    function handlePopState() {
      setActivePath(getRouteFromPathname(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  /**
   * Persiste el estado de Sidebar.
   */
  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  /**
   * Navegación SPA.
   */
  function handleNavigate(path: AppRoutePath) {
    if (path === activePath) return;

    window.history.pushState(null, "", path);
    setActivePath(path);
  }

  /**
   * Expande/reduce Sidebar.
   */
  function handleToggleSidebar() {
    setIsSidebarCollapsed((currentValue) => !currentValue);
  }

  const activeRoute = ROUTES.find((route) => route.path === activePath);

  return (
    <div className={isSidebarCollapsed ? "agrovisionApp is-sidebar-collapsed" : "agrovisionApp"}>
      <Sidebar activePath={activePath} isCollapsed={isSidebarCollapsed} onNavigate={handleNavigate} onToggle={handleToggleSidebar} />

      <section className="agrovisionMain">
        <Topbar activeLabel={activeRoute?.label ?? "Dashboard"} />

        <main className="agrovisionContent">
          <AppRouter activePath={activePath} />
        </main>
      </section>
    </div>
  );
}

export default function App() {
  return window.location.pathname === "/" ? <LandingPage /> : <DashboardApp />;
}
